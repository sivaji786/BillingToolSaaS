<?php

namespace App\Models;

use CodeIgniter\Model;

class TenantUsageModel extends BaseModel
{
    protected $table      = 'tenant_usage';
    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;

    protected $allowedFields = [
        'tenant_id',
        'resource_key',
        'used_amount',
        'created_at',
        'updated_at'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Get usage for a tenant by resource key
     */
    public function getUsage($tenantId, $resourceKey)
    {
        return $this->where('tenant_id', $tenantId)
                    ->where('resource_key', $resourceKey)
                    ->first();
    }

    /**
     * Increment usage for a resource
     */
    public function incrementUsage($tenantId, $resourceKey, $amount = 1)
    {
        $usage = $this->getUsage($tenantId, $resourceKey);
        
        if ($usage) {
            return $this->update($usage['id'], [
                'used_amount' => $usage['used_amount'] + $amount
            ]);
        } else {
            return $this->insert([
                'tenant_id' => $tenantId,
                'resource_key' => $resourceKey,
                'used_amount' => $amount
            ]);
        }
    }
}
