<?php

namespace App\Traits;

use App\Models\TenantModel;
use App\Models\PlanModel;

trait UsageEnforcement
{
    /**
     * Check if the tenant has reached the limit for the current resource
     */
    protected function checkLimits(array $data)
    {
        $appConfig = config('App');
        $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;

        if (!$tenant || !is_object($tenant) || !isset($tenant->id)) {
            return $data; // Cannot check limits without tenant context
        }

        // 1. Fetch current tenant's plan limits
        $tenantModel = new TenantModel();
        $tenantData = $tenantModel->find($tenant->id);

        if (!$tenantData || !isset($tenantData['plan_id'])) {
            return $data;
        }

        $planModel = new PlanModel();
        $plan = $planModel->find($tenantData['plan_id']);

        if (!$plan || !isset($plan['limits'])) {
            return $data;
        }

        $limits = json_decode($plan['limits'], true);
        
        // 2. Identify the resource (table name)
        $resource = $this->table;
        
        // Map common tables to limit keys
        $limitKey = $this->getLimitKey($resource);

        if ($limitKey && isset($limits[$limitKey])) {
            $limitValue = (int)$limits[$limitKey];

            // -1 means unlimited
            if ($limitValue === -1) {
                return $data;
            }

            // 3. Count current resources for this tenant
            $currentCount = $this->where('tenant_id', $tenant->id)->countAllResults();

            if ($currentCount >= $limitValue) {
                // throw new \Exception("Limit exceeded for {$resource}. Current limit is {$limitValue}.");
                // In CI4, we might want a more specific exception or use Validation errors
                $errorMsg = "Usage Limit Exceeded: Your plan allows only {$limitValue} " . ucfirst($limitKey) . ". Please upgrade your plan.";
                throw new \RuntimeException($errorMsg);
            }
        }

        return $data;
    }

    /**
     * Map table names to limit keys defined in PlanSeeder
     */
    private function getLimitKey(string $table): ?string
    {
        $map = [
            'users'    => 'users',
            'invoices' => 'invoices',
            'projects' => 'projects'
        ];

        return isset($map[$table]) ? $map[$table] : null;
    }
}
