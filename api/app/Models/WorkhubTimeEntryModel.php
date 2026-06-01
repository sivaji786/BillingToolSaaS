<?php

namespace App\Models;

// §16 ArbZG + EuGH C-55/18 compliant time recording
class WorkhubTimeEntryModel extends BaseModel
{
    protected $table      = 'workhub_time_entries';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'task_id', 'worker_id', 'entry_type',
        'started_at', 'ended_at', 'break_minutes', 'notes',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = '';   // '' = disabled; false would cast to int key 0 in setUpdatedField()

    protected $validationRules = [
        'task_id'    => 'required|integer',
        'worker_id'  => 'required|integer',
        'entry_type' => 'permit_empty|in_list[work,break]',
        'started_at' => 'required|valid_date[Y-m-d H:i:s]',
        'ended_at'   => 'permit_empty|valid_date[Y-m-d H:i:s]',
    ];

    /**
     * Returns the currently open (no ended_at) timer entry for a worker.
     */
    public function getActiveEntry(int $tenantId, int $workerId): ?array
    {
        return $this->where('tenant_id', $tenantId)
            ->where('worker_id', $workerId)
            ->where('entry_type', 'work')
            ->where('ended_at IS NULL', null, false)
            ->first();
    }

    /**
     * Net worked seconds for a task (excludes break time).
     */
    public function getNetSecondsForTask(int $taskId): int
    {
        $db = \Config\Database::connect();
        $row = $db->table($this->table)
            ->select('SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) - (break_minutes * 60)) AS net_seconds')
            ->where('task_id', $taskId)
            ->where('entry_type', 'work')
            ->get()->getRow();
        return (int) ($row->net_seconds ?? 0);
    }

    /**
     * Total break minutes logged for a worker on a given day (§16 ArbZG check).
     */
    public function getTotalBreakMinutesToday(int $tenantId, int $workerId): int
    {
        $today = date('Y-m-d');
        $row   = \Config\Database::connect()
            ->table($this->table)
            ->selectSum('break_minutes')
            ->where('tenant_id', $tenantId)
            ->where('worker_id', $workerId)
            ->where('DATE(started_at)', $today)
            ->get()->getRow();
        return (int) ($row->break_minutes ?? 0);
    }
}
