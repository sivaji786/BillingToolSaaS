<?php

namespace App\Models;

class WorkhubCustomerModel extends BaseModel
{
    protected $table      = 'workhub_customers';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = true;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'name', 'email', 'phone', 'address', 'company', 'language_pref',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    protected $validationRules = [
        'name'          => 'required|min_length[2]|max_length[255]',
        'email'         => 'permit_empty|valid_email|max_length[255]',
        'phone'         => 'permit_empty|max_length[50]',
        'language_pref' => 'permit_empty|in_list[en,de,pl,fr,it]',
    ];
}
