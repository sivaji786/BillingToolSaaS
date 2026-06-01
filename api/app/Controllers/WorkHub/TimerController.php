<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubTaskModel;
use App\Models\WorkhubTimeEntryModel;

class TimerController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    // §16 ArbZG mandatory break thresholds (minutes)
    private const BREAK_THRESHOLD_6H  = 360;  // 6 hours → 30 min break required
    private const BREAK_THRESHOLD_9H  = 540;  // 9 hours → 45 min break required
    private const MIN_BREAK_6H        = 30;
    private const MIN_BREAK_9H        = 45;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // WH-019: POST /workhub/tasks/:id/timer/start
    public function start(int $taskId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $task = $this->resolveTask($taskId);
        if (!$task) return $this->failNotFound('Task not found.');

        $entryModel  = new WorkhubTimeEntryModel();

        // Block duplicate active timer for this worker
        $activeEntry = $entryModel->getActiveEntry($this->tenantId, $this->userId);
        if ($activeEntry) {
            return $this->fail(
                'You already have an active timer running (entry #' . $activeEntry['id'] . '). Stop it before starting a new one.',
                409
            );
        }

        // Also end any open break entry for this worker
        $this->endOpenBreak($entryModel);

        $now = date('Y-m-d H:i:s');
        $id  = $entryModel->insert([
            'tenant_id'  => $this->tenantId,
            'task_id'    => $taskId,
            'worker_id'  => $this->userId,
            'entry_type' => 'work',
            'started_at' => $now,
        ], true);

        if (!$id) {
            return $this->failServerError('Failed to start timer.');
        }

        // Move task to in_progress if still open
        $taskModel = new WorkhubTaskModel();
        if ($task['status'] === 'open') {
            $taskModel->update($taskId, ['status' => 'in_progress']);
        }

        $this->logAction('workhub.timer.started', 'WH-' . $taskId, 'Timer started for user ' . $this->userId);

        return $this->respondCreated([
            'entry_id'   => $id,
            'started_at' => $now,
            'task_id'    => $taskId,
            'message'    => 'Timer started.',
        ]);
    }

    // WH-020: POST /workhub/tasks/:id/timer/pause
    public function pause(int $taskId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->resolveTask($taskId)) return $this->failNotFound('Task not found.');

        $entryModel  = new WorkhubTimeEntryModel();
        $activeEntry = $entryModel->getActiveEntry($this->tenantId, $this->userId);

        if (!$activeEntry) {
            return $this->fail('No active timer running to pause.', 409);
        }

        if ((int) $activeEntry['task_id'] !== $taskId) {
            return $this->fail('Active timer is for a different task (ID ' . $activeEntry['task_id'] . ').', 409);
        }

        $now = date('Y-m-d H:i:s');

        // Close the work entry
        $entryModel->update($activeEntry['id'], ['ended_at' => $now]);

        // Start a break entry
        $breakId = $entryModel->insert([
            'tenant_id'  => $this->tenantId,
            'task_id'    => $taskId,
            'worker_id'  => $this->userId,
            'entry_type' => 'break',
            'started_at' => $now,
        ], true);

        // §16 ArbZG: check total worked time today and warn if approaching/exceeding limits
        $workedMinutesToday = $this->getWorkedMinutesToday($entryModel);
        $breakWarning       = $this->arbzgBreakWarning($workedMinutesToday, $entryModel);

        $this->logAction('workhub.timer.paused', 'WH-' . $taskId, 'Break started for user ' . $this->userId);

        return $this->respond([
            'break_entry_id'  => $breakId,
            'paused_at'       => $now,
            'task_id'         => $taskId,
            'arbzg_warning'   => $breakWarning,
            'message'         => 'Timer paused — break started.',
        ]);
    }

    // WH-021: POST /workhub/tasks/:id/timer/stop
    public function stop(int $taskId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $task = $this->resolveTask($taskId);
        if (!$task) return $this->failNotFound('Task not found.');

        $entryModel = new WorkhubTimeEntryModel();
        $now        = date('Y-m-d H:i:s');

        // End any open work entry for this worker on this task
        $activeWork = $entryModel->getActiveEntry($this->tenantId, $this->userId);
        if ($activeWork && (int) $activeWork['task_id'] === $taskId) {
            $entryModel->update($activeWork['id'], ['ended_at' => $now]);
        }

        // Also end any open break entry
        $this->endOpenBreak($entryModel, $taskId);

        // Recalculate task.logged_hours from all work entries
        $netSeconds   = $entryModel->getNetSecondsForTask($taskId);
        $loggedHours  = round($netSeconds / 3600, 4);

        $taskModel = new WorkhubTaskModel();
        $taskModel->update($taskId, ['logged_hours' => $loggedHours]);

        // §16 ArbZG validation
        $workedMinutesToday = $this->getWorkedMinutesToday($entryModel);
        $breakMinutesToday  = $entryModel->getTotalBreakMinutesToday($this->tenantId, $this->userId);
        $arbzgStatus        = $this->arbzgValidate($workedMinutesToday, $breakMinutesToday);

        $this->logAction(
            'workhub.timer.stopped',
            'WH-' . $taskId,
            sprintf('Timer stopped. Logged %.2f h for task.', $loggedHours)
        );

        return $this->respond([
            'task_id'              => $taskId,
            'net_seconds'          => $netSeconds,
            'logged_hours'         => $loggedHours,
            'stopped_at'           => $now,
            'arbzg_status'         => $arbzgStatus,
            'message'              => 'Timer stopped.',
        ]);
    }

    // ---- private helpers ----

    private function resolveTask(int $taskId): ?array
    {
        $model = new WorkhubTaskModel();
        return $model->where('tenant_id', $this->tenantId)->find($taskId);
    }

    private function endOpenBreak(WorkhubTimeEntryModel $entryModel, ?int $taskId = null): void
    {
        $db    = \Config\Database::connect();
        $query = $db->table('workhub_time_entries')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', $this->userId)
            ->where('entry_type', 'break')
            ->where('ended_at IS NULL', null, false);

        if ($taskId !== null) {
            $query->where('task_id', $taskId);
        }

        $openBreak = $query->get()->getRowArray();
        if ($openBreak) {
            $db->table('workhub_time_entries')
               ->where('id', $openBreak['id'])
               ->update(['ended_at' => date('Y-m-d H:i:s')]);
        }
    }

    private function getWorkedMinutesToday(WorkhubTimeEntryModel $entryModel): int
    {
        $today = date('Y-m-d');
        $db    = \Config\Database::connect();
        $row   = $db->table('workhub_time_entries')
            ->select('SUM(TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW()))) AS worked_minutes')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', $this->userId)
            ->where('entry_type', 'work')
            ->where('DATE(started_at)', $today)
            ->get()->getRow();

        return (int) ($row->worked_minutes ?? 0);
    }

    private function arbzgBreakWarning(int $workedMinutes, WorkhubTimeEntryModel $entryModel): ?string
    {
        $breakMinutes = $entryModel->getTotalBreakMinutesToday($this->tenantId, $this->userId);

        if ($workedMinutes >= self::BREAK_THRESHOLD_9H && $breakMinutes < self::MIN_BREAK_9H) {
            return '§16 ArbZG: You have worked over 9 hours. A 45-minute break is required.';
        }
        if ($workedMinutes >= self::BREAK_THRESHOLD_6H && $breakMinutes < self::MIN_BREAK_6H) {
            return '§16 ArbZG: You have worked over 6 hours. A 30-minute break is required.';
        }

        return null;
    }

    private function arbzgValidate(int $workedMinutes, int $breakMinutes): array
    {
        $compliant = true;
        $message   = 'Compliant';

        if ($workedMinutes >= self::BREAK_THRESHOLD_9H && $breakMinutes < self::MIN_BREAK_9H) {
            $compliant = false;
            $message   = '§16 ArbZG violation: worked >9h with less than 45 min total break.';
        } elseif ($workedMinutes >= self::BREAK_THRESHOLD_6H && $breakMinutes < self::MIN_BREAK_6H) {
            $compliant = false;
            $message   = '§16 ArbZG violation: worked >6h with less than 30 min total break.';
        }

        return [
            'compliant'       => $compliant,
            'worked_minutes'  => $workedMinutes,
            'break_minutes'   => $breakMinutes,
            'message'         => $message,
        ];
    }
}
