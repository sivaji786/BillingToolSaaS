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
        'company_name', 'website', 'subdomain', 'custom_domain', 
        'plan_id', 'status', 'trial_ends_at', 'uuid'
    ];
    
    protected $beforeInsert = ['generateUuid'];
    
    protected function generateUuid(array $data)
    {
        if (!isset($data['data']['uuid'])) {
            $data['data']['uuid'] = $this->getUuid();
        }
        return $data;
    }
    
    private function getUuid() {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

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
