<?php

namespace App\Models;

class WorkhubProjectModel extends BaseModel
{
    protected $table      = 'workhub_projects';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = true;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'customer_id', 'name', 'description', 'status',
        'colour_accent', 'started_at', 'due_at',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules = [
        'name'         => 'required|min_length[2]|max_length[255]',
        'status'       => 'permit_empty|in_list[active,completed,on_hold]',
        'colour_accent' => 'permit_empty|regex_match[/^#[0-9A-Fa-f]{6}$/]',
    ];
}
