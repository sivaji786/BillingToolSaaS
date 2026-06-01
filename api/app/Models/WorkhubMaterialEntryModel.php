<?php

namespace App\Models;

class WorkhubMaterialEntryModel extends BaseModel
{
    protected $table      = 'workhub_material_entries';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'task_id', 'completion_record_id',
        'material_name', 'quantity', 'unit', 'unit_price', 'total_price', 'catalogue_ref',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = '';   // '' = disabled; false casts to int key 0 in CI4 setUpdatedField()

    protected $validationRules = [
        'task_id'       => 'required|integer',
        'material_name' => 'required|min_length[1]|max_length[255]',
        'quantity'      => 'required|decimal|greater_than[0]',
        'unit'          => 'permit_empty|in_list[pcs,m,kg,h,l,m2,m3,set,lot]',
        'unit_price'    => 'required|decimal|greater_than_equal_to[0]',
        'total_price'   => 'required|decimal|greater_than_equal_to[0]',
    ];

    /**
     * Returns material entries for a task, optionally filtering by completion record.
     */
    public function getForTask(int $taskId, ?int $completionRecordId = null): array
    {
        $q = $this->where('task_id', $taskId);
        if ($completionRecordId !== null) {
            $q->where('completion_record_id', $completionRecordId);
        }
        return $q->findAll();
    }

    public function getTotalForTask(int $taskId): float
    {
        $row = \Config\Database::connect()
            ->table($this->table)
            ->selectSum('total_price')
            ->where('task_id', $taskId)
            ->get()->getRow();
        return (float) ($row->total_price ?? 0);
    }
}
