<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubTaskModel;
use App\Models\WorkhubTimeEntryModel;

/**
 * Sprint E — Offline sync endpoint.
 *
 * POST /workhub/sync — accepts a batch of mutations recorded while offline
 * (from IndexedDB on the client) and applies them server-side.
 *
 * Conflict resolution: last-write-wins on updated_at.
 * The client sends the local updated_at for each record; the server compares
 * against its own updated_at and skips the record if the server version is newer.
 *
 * Supported mutation types:
 *   task.update    — status/priority/description/location_tag changes
 *   task.create    — new task created while offline
 *   timer.entry    — a completed time entry (started_at + ended_at + break_minutes)
 *
 * Response: { synced: [...], skipped: [...], failed: [...] }
 * HTTP 207 Multi-Status so the client can process each result individually.
 */
class SyncController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // POST /workhub/sync
    public function sync(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $body = $this->request->getJSON(true);

        if (!isset($body['mutations']) || !is_array($body['mutations'])) {
            return $this->fail('mutations array is required.', 422);
        }

        $mutations = $body['mutations'];
        if (count($mutations) > 200) {
            return $this->fail('Maximum 200 mutations per sync batch.', 422);
        }

        $synced  = [];
        $skipped = [];
        $failed  = [];

        foreach ($mutations as $i => $mutation) {
            $type         = $mutation['type']         ?? null;
            $localId      = $mutation['local_id']     ?? null;
            $serverTaskId = (int) ($mutation['task_id'] ?? 0);
            $localUpdated = $mutation['updated_at']   ?? null;

            try {
                switch ($type) {
                    case 'task.update':
                        $result = $this->applyTaskUpdate($serverTaskId, $mutation, $localUpdated);
                        break;

                    case 'task.create':
                        $result = $this->applyTaskCreate($mutation, $localId);
                        break;

                    case 'timer.entry':
                        $result = $this->applyTimerEntry($serverTaskId, $mutation, $localId);
                        break;

                    default:
                        $failed[] = ['index' => $i, 'local_id' => $localId, 'reason' => "Unknown mutation type: {$type}"];
                        continue 2;
                }

                if ($result['status'] === 'synced') {
                    $synced[] = array_merge(['index' => $i, 'local_id' => $localId], $result);
                } else {
                    $skipped[] = array_merge(['index' => $i, 'local_id' => $localId], $result);
                }

            } catch (\Throwable $e) {
                log_message('error', "[SyncController] mutation #{$i} failed: " . $e->getMessage());
                $failed[] = ['index' => $i, 'local_id' => $localId, 'reason' => 'Internal error'];
            }
        }

        $this->logWorkhubEvent(
            'workhub.sync.batch',
            0,
            [],
            ['total' => count($mutations), 'synced' => count($synced), 'skipped' => count($skipped), 'failed' => count($failed)],
            "Offline sync batch: {$this->userId}"
        );

        return $this->response->setStatusCode(207)->setJSON([
            'synced'  => $synced,
            'skipped' => $skipped,
            'failed'  => $failed,
        ]);
    }

    // ---- Mutation handlers ----

    private function applyTaskUpdate(int $taskId, array $mutation, ?string $localUpdated): array
    {
        if (!$taskId) {
            return ['status' => 'skipped', 'reason' => 'task_id required for task.update'];
        }

        $model = new WorkhubTaskModel();
        $task  = $model->where('tenant_id', $this->tenantId)->find($taskId);

        if (!$task) {
            return ['status' => 'skipped', 'reason' => 'Task not found or access denied'];
        }

        // Conflict check: skip if server version is newer than local
        if ($localUpdated && !empty($task['updated_at'])) {
            $serverTs = strtotime($task['updated_at']);
            $localTs  = strtotime($localUpdated);
            if ($serverTs > $localTs) {
                return [
                    'status'     => 'skipped',
                    'task_id'    => $taskId,
                    'reason'     => 'Server version is newer (conflict — server wins)',
                    'server_updated_at' => $task['updated_at'],
                ];
            }
        }

        $allowedFields = ['status', 'priority', 'description', 'location_tag', 'est_hours'];
        $update        = array_intersect_key($mutation, array_flip($allowedFields));

        if (empty($update)) {
            return ['status' => 'skipped', 'task_id' => $taskId, 'reason' => 'No updatable fields'];
        }

        $model->update($taskId, $update);

        return ['status' => 'synced', 'task_id' => $taskId];
    }

    private function applyTaskCreate(array $mutation, ?string $localId): array
    {
        // Check idempotency: if we've already synced this local_id, return the existing server ID
        if ($localId) {
            $db  = \Config\Database::connect();
            $row = $db->table('workhub_tasks')
                ->where('tenant_id', $this->tenantId)
                ->where('correlation_id', 'offline:' . $localId)
                ->get()->getRowArray();

            if ($row) {
                return ['status' => 'skipped', 'task_id' => (int) $row['id'], 'reason' => 'Already synced (idempotent)'];
            }
        }

        if (empty($mutation['title'])) {
            return ['status' => 'skipped', 'reason' => 'title required for task.create'];
        }

        $model = new WorkhubTaskModel();
        $newId = $model->insert([
            'tenant_id'      => $this->tenantId,
            'created_by'     => $this->userId,
            'status'         => $mutation['status']         ?? 'open',
            'priority'       => $mutation['priority']       ?? 'medium',
            'title'          => trim($mutation['title']),
            'description'    => $mutation['description']    ?? null,
            'project_id'     => $mutation['project_id']     ?? null,
            'location_tag'   => $mutation['location_tag']   ?? null,
            'est_hours'      => $mutation['est_hours']      ?? null,
            'source_module'  => 'manual',
            // Use correlation_id to mark as offline-created for idempotency
            'correlation_id' => $localId ? 'offline:' . $localId : null,
        ], true);

        if (!$newId) {
            return ['status' => 'skipped', 'reason' => 'Insert failed'];
        }

        return ['status' => 'synced', 'task_id' => $newId, 'local_id' => $localId];
    }

    private function applyTimerEntry(int $taskId, array $mutation, ?string $localId): array
    {
        $startedAt = $mutation['started_at'] ?? null;
        $endedAt   = $mutation['ended_at']   ?? null;

        if (!$startedAt || !$endedAt) {
            return ['status' => 'skipped', 'reason' => 'started_at and ended_at required for timer.entry'];
        }

        if (strtotime($startedAt) >= strtotime($endedAt)) {
            return ['status' => 'skipped', 'reason' => 'started_at must be before ended_at'];
        }

        // Idempotency: check for existing entry with same started_at + task_id + worker
        $db = \Config\Database::connect();

        $workerRow = $db->table('workhub_workers')
            ->where('tenant_id', $this->tenantId)
            ->where('user_id', $this->userId)
            ->get()->getRowArray();

        if (!$workerRow) {
            return ['status' => 'skipped', 'reason' => 'No worker profile found'];
        }

        $workerId = (int) $workerRow['id'];

        $existing = $db->table('workhub_time_entries')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', $workerId)
            ->where('task_id', $taskId)
            ->where('started_at', $startedAt)
            ->get()->getRowArray();

        if ($existing) {
            return ['status' => 'skipped', 'entry_id' => (int) $existing['id'], 'reason' => 'Entry already exists (idempotent)'];
        }

        $breakMin = (int) ($mutation['break_minutes'] ?? 0);
        $notes    = $mutation['notes'] ?? null;

        $db->table('workhub_time_entries')->insert([
            'tenant_id'    => $this->tenantId,
            'task_id'      => $taskId,
            'worker_id'    => $workerId,
            'entry_type'   => 'work',
            'started_at'   => $startedAt,
            'ended_at'     => $endedAt,
            'break_minutes'=> $breakMin,
            'notes'        => $notes,
            'created_at'   => date('Y-m-d H:i:s'),
        ]);

        $entryId = $db->insertID();

        // Update task's logged_hours aggregate
        $seconds    = max(0, strtotime($endedAt) - strtotime($startedAt)) - ($breakMin * 60);
        $addedHours = round(max(0, $seconds) / 3600, 4);

        $db->query(
            'UPDATE workhub_tasks SET logged_hours = COALESCE(logged_hours, 0) + ? WHERE id = ? AND tenant_id = ?',
            [$addedHours, $taskId, $this->tenantId]
        );

        return ['status' => 'synced', 'entry_id' => $entryId, 'added_hours' => $addedHours];
    }
}
