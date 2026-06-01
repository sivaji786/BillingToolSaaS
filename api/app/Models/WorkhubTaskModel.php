<?php

namespace App\Models;

class WorkhubTaskModel extends BaseModel
{
    protected $table      = 'workhub_tasks';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = true;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'project_id', 'assigned_worker_id', 'created_by',
        'title', 'description', 'status', 'priority',
        'est_hours', 'logged_hours', 'location_tag', 'due_date',
        'pfe_ref_type', 'pfe_ref_id',
        'correlation_id', 'source_module', 'task_type',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules = [
        'title'         => 'required|min_length[2]|max_length[255]',
        'status'        => 'permit_empty|in_list[open,in_progress,done,problem]',
        'priority'      => 'permit_empty|in_list[low,medium,high,urgent]',
        'est_hours'     => 'permit_empty|decimal|greater_than[0]',
        'due_date'      => 'permit_empty|valid_date[Y-m-d]',
        'source_module' => 'permit_empty|in_list[manual,pc13,pfe,m02,ppt]',
        'task_type'     => 'permit_empty|in_list[fault_resolution,commissioning,configuration,investigation,maintenance]',
    ];

    /**
     * Valid status transitions for the task state machine.
     */
    public const TRANSITIONS = [
        'open'        => ['in_progress'],
        'in_progress' => ['done', 'problem', 'open'],
        'problem'     => ['in_progress', 'open'],
        'done'        => [],
    ];

    public function isValidTransition(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    /**
     * Returns tasks at the same location tag (for batch assignment).
     */
    public function getByLocation(int $tenantId, string $locationTag): array
    {
        return $this->where('tenant_id', $tenantId)
            ->where('location_tag', $locationTag)
            ->whereIn('status', ['open', 'in_progress'])
            ->findAll();
    }
}
