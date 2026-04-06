<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use App\Models\TenantModel;
use App\Models\PlanModel;
use App\Models\TenantUsageModel;
use App\Models\InvoiceModel;
use App\Models\UserModel;

class TenantUsageSeeder extends Seeder
{
    public function run()
    {
        $tenantModel = new TenantModel();
        $planModel = new PlanModel();
        $usageModel = new TenantUsageModel();
        $invoiceModel = new InvoiceModel();
        $userModel = new UserModel();

        $tenants = $tenantModel->findAll();
        
        // Clear existing usage to start fresh
        $usageModel->truncate();

        echo "Seeding usage for " . count($tenants) . " tenants...\n";

        foreach ($tenants as $tenant) {
            $plan = $planModel->find($tenant['plan_id']);
            if (!$plan) continue;

            $limits = json_decode($plan['limits'], true) ?: [];
            
            // Resources to seed
            $resources = [
                'invoices' => ['type' => 'count', 'model' => $invoiceModel, 'field' => 'tenant_id'],
                'users'    => ['type' => 'count', 'model' => $userModel, 'field' => 'tenant_id'],
                'storage'  => ['type' => 'random', 'limit_key' => 'storage'],
                'api_calls' => ['type' => 'random', 'limit_key' => 'api_calls'],
                'bandwidth' => ['type' => 'random', 'limit_key' => 'bandwidth'],
            ];

            foreach ($resources as $key => $config) {
                $used = 0;
                
                if ($config['type'] === 'count') {
                    // Count real records
                    $used = $config['model']->where($config['field'], $tenant['id'])->countAllResults();
                } else {
                    // Normalize limit key (handle storage vs storage_gb, etc.)
                    $limitKey = $config['limit_key'];
                    $limit = $limits[$limitKey] ?? ($limits[$limitKey . '_gb'] ?? ($limits['api_requests'] ?? 0));
                    
                    // Special case: if we found storage_gb, convert to bytes
                    if (isset($limits[$limitKey . '_gb']) && !isset($limits[$limitKey])) {
                        $limit = $limits[$limitKey . '_gb'] * 1024 * 1024 * 1024;
                    }
                    
                    if ($limit == -1) {
                        // Unlimited - seed something substantial but not astronomical
                        $used = rand(1000000, 1000000000); 
                    } elseif ($limit > 0) {
                        // Seed between 30% and 90% of limit
                        $min = max(50, (int)($limit * 0.3));
                        $max = max(100, (int)($limit * 0.9));
                        $used = rand($min, $max);
                    } else {
                        $used = rand(10, 100); // Small default
                    }
                }

                // Set values for seeding (using direct updateOrInsert or similar logic)
                $existing = $usageModel->where('tenant_id', $tenant['id'])->where('resource_key', $key)->first();
                if ($existing) {
                    $usageModel->update($existing['id'], ['used_amount' => $used]);
                } else {
                    $usageModel->insert([
                        'tenant_id' => $tenant['id'],
                        'resource_key' => $key,
                        'used_amount' => $used
                    ]);
                }
            }
        }

        echo "Usage seeding completed.\n";
    }
}
