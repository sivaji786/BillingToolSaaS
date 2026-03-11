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
            if ($limitKey === 'storage_gb') {
                $db = \Config\Database::connect();
                $currentSizeBytes = $db->table($resource)
                    ->selectSum('size')
                    ->where('tenant_id', $tenant->id)
                    ->get()
                    ->getRow()
                    ->size ?? 0;
                
                $currentGB = $currentSizeBytes / (1024 * 1024 * 1024);
                
                if ($currentGB >= $limitValue) {
                    // Trigger real-time 100% notification
                    try {
                        (new \App\Services\UsageNotificationService())->checkTenantUsage($tenant->id);
                    } catch (\Exception $e) {
                        log_message('error', 'Failed to trigger real-time notification: ' . $e->getMessage());
                    }

                    $errorMsg = "Storage Limit Exceeded: Your plan allows only {$limitValue} GB. Please upgrade your plan.";
                    throw new \RuntimeException($errorMsg);
                }
            } else {
                $currentCount = $this->where('tenant_id', $tenant->id)->countAllResults();

                if ($currentCount >= $limitValue) {
                    // Trigger real-time 100% notification
                    try {
                        (new \App\Services\UsageNotificationService())->checkTenantUsage($tenant->id);
                    } catch (\Exception $e) {
                        log_message('error', 'Failed to trigger real-time notification: ' . $e->getMessage());
                    }

                    $errorMsg = "Usage Limit Exceeded: Your plan allows only {$limitValue} " . str_replace('_', ' ', $limitKey) . ". Please upgrade your plan.";
                    throw new \RuntimeException($errorMsg);
                }
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
            'users'             => 'users',
            'invoices'          => 'invoices',
            'projects'          => 'projects',
            'workspace_files'   => 'storage_gb',
            'aiquery_history'   => 'api_calls'
        ];

        return isset($map[$table]) ? $map[$table] : null;
    }
}
