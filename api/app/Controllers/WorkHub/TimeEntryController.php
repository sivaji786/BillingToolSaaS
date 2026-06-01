<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;

/**
 * WH-024: Time entry read + correction.
 *
 * Time entries are immutable per §16 ArbZG — they cannot be edited or deleted.
 * Planner/manager corrections are recorded as deltas in workhub_time_entry_corrections
 * without touching the original entry.
 */
class TimeEntryController extends BaseController
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

    // GET /workhub/time-entries — list entries scoped to current worker (or filtered by worker_id for planners)
    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db = \Config\Database::connect();

        // Resolve role to determine scope
        $workerRow = $db->table('workhub_workers')
            ->where('tenant_id', $this->tenantId)
            ->where('user_id', $this->userId)
            ->get()->getRowArray();

        $role = $workerRow['role'] ?? 'worker';
        $canSeeAll = in_array($role, ['planner', 'manager'], true)
            || (bool) session()->get('isAdmin');

        $requestedWorkerId = (int) ($this->request->getGet('worker_id') ?? 0);
        $taskId            = (int) ($this->request->getGet('task_id') ?? 0);
        $startDate         = $this->request->getGet('start_date');
        $endDate           = $this->request->getGet('end_date');
        $entryType         = $this->request->getGet('entry_type');

        $builder = $db->table('workhub_time_entries te')
            ->select('te.*, t.title AS task_title, w.user_id AS worker_user_id')
            ->join('workhub_tasks t', 't.id = te.task_id', 'left')
            ->join('workhub_workers w', 'w.id = te.worker_id', 'left')
            ->where('te.tenant_id', $this->tenantId);

        if ($canSeeAll && $requestedWorkerId > 0) {
            $builder->where('te.worker_id', $requestedWorkerId);
        } elseif (!$canSeeAll) {
            // Scope to own entries
            $ownWorkerId = $workerRow ? (int) $workerRow['id'] : 0;
            $builder->where('te.worker_id', $ownWorkerId);
        }

        if ($taskId > 0)    $builder->where('te.task_id', $taskId);
        if ($startDate)     $builder->where('te.started_at >=', $startDate . ' 00:00:00');
        if ($endDate)       $builder->where('te.started_at <=', $endDate . ' 23:59:59');
        if ($entryType)     $builder->where('te.entry_type', $entryType);

        $entries = $builder->orderBy('te.started_at', 'DESC')->get()->getResultArray();

        return $this->respond(['data' => $entries]);
    }

    // PUT /workhub/time-entries/:id/correct
    // Planners/managers only. Writes a delta record; DOES NOT modify the original entry.
    public function correct(int $entryId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db = \Config\Database::connect();

        // Verify caller is planner/manager or admin
        $workerRow = $db->table('workhub_workers')
            ->where('tenant_id', $this->tenantId)
            ->where('user_id', $this->userId)
            ->get()->getRowArray();

        $role         = $workerRow['role'] ?? 'worker';
        $isPrivileged = in_array($role, ['planner', 'manager'], true)
            || (bool) session()->get('isAdmin');

        if (!$isPrivileged) {
            return $this->failForbidden('Only planners and managers may correct time entries.');
        }

        // Load original entry (tenant-scoped)
        $entry = $db->table('workhub_time_entries')
            ->where('tenant_id', $this->tenantId)
            ->where('id', $entryId)
            ->get()->getRowArray();

        if (!$entry) {
            return $this->failNotFound('Time entry not found.');
        }

        $body = $this->request->getJSON(true) ?? $this->request->getPost();

        $newStartedAt = $body['started_at'] ?? null;
        $newEndedAt   = $body['ended_at']   ?? null;
        $newBreakMin  = isset($body['break_minutes']) ? (int) $body['break_minutes'] : null;
        $newNotes     = $body['notes']       ?? null;
        $reason       = trim($body['reason'] ?? '');

        if (empty($reason)) {
            return $this->fail('A correction_reason is required for audit compliance (§16 ArbZG).', 422);
        }

        if (strlen($reason) > 500) {
            return $this->fail('correction_reason must not exceed 500 characters.', 422);
        }

        // Validate new timestamps if provided
        if ($newStartedAt && $newEndedAt && strtotime($newStartedAt) >= strtotime($newEndedAt)) {
            return $this->fail('started_at must be before ended_at.', 422);
        }

        // Insert correction log — immutable delta record
        $correctionData = [
            'tenant_id'            => $this->tenantId,
            'time_entry_id'        => $entryId,
            'corrected_by_user_id' => $this->userId,
            // Snapshot of original values
            'old_started_at'       => $entry['started_at'],
            'old_ended_at'         => $entry['ended_at'],
            'old_break_min'        => (int) ($entry['break_minutes'] ?? 0),
            'old_notes'            => $entry['notes'] ?? null,
            // Proposed new values (null = no change for that field)
            'new_started_at'       => $newStartedAt,
            'new_ended_at'         => $newEndedAt,
            'new_break_min'        => $newBreakMin,
            'new_notes'            => $newNotes,
            'correction_reason'    => $reason,
            'corrected_at'         => date('Y-m-d H:i:s'),
            'corrected_ip'         => $this->request->getIPAddress(),
        ];

        $db->table('workhub_time_entry_corrections')->insert($correctionData);
        $correctionId = $db->insertID();

        $this->logWorkhubEvent(
            'workhub.time_entry.corrected',
            (int) ($entry['task_id'] ?? 0),
            [
                'started_at'   => $entry['started_at'],
                'ended_at'     => $entry['ended_at'],
                'break_minutes'=> $entry['break_minutes'],
            ],
            [
                'started_at'   => $newStartedAt,
                'ended_at'     => $newEndedAt,
                'break_minutes'=> $newBreakMin,
                'reason'       => $reason,
            ],
            "Time entry #{$entryId} corrected by user #{$this->userId}"
        );

        return $this->respondCreated([
            'correction_id'  => $correctionId,
            'time_entry_id'  => $entryId,
            'corrected_at'   => $correctionData['corrected_at'],
            'message'        => 'Correction recorded. Original entry preserved per §16 ArbZG.',
        ]);
    }
}
