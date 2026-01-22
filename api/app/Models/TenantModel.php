<?php

namespace App\Models;

use CodeIgniter\Model;

class TenantModel extends Model
{
    protected $table            = 'tenants';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false; // Maybe true later
    protected $protectFields    = true;
    protected $allowedFields    = [
        'company_name', 'subdomain', 'custom_domain', 
        'plan_id', 'status', 'trial_ends_at'
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'company_name' => 'required|min_length[3]|max_length[255]',
        'subdomain'    => 'required|min_length[3]|max_length[100]|is_unique[tenants.subdomain]',
        'plan_id'      => 'required|integer',
        'status'       => 'in_list[active,suspended,cancelled]'
    ];
}
