<?php

namespace App\Services;

use App\Models\TenantModel;
use App\Models\SubscriptionModel;
use App\Models\PlanModel;
use App\Models\UsageNotificationModel;
use App\Models\InvoiceModel;
use App\Models\WorkspaceFileModel;
use App\Models\AiQueryHistoryModel;
use Config\Services;

class UsageNotificationService
{
    public function checkAllTenants()
    {
        $tenantModel = new TenantModel();
        $tenants = $tenantModel->findAll();

        foreach ($tenants as $tenant) {
            $this->checkTenantUsage($tenant['id']);
        }
    }

    public function checkTenantUsage($tenantId)
    {
        $subModel = new SubscriptionModel();
        $subscription = $subModel->withoutTenant()->where('tenant_id', $tenantId)->first();
        if (!$subscription) return;

        $planModel = new PlanModel();
        $plan = $planModel->find($subscription['plan_id']);
        if (!$plan) return;

        $limits = is_string($plan['limits']) ? json_decode($plan['limits'], true) : $plan['limits'];
        if (!$limits) {
            return;
        }


        $resources = [
            'invoices' => [
                'used' => (new InvoiceModel())->withoutTenant()->where('tenant_id', $tenantId)->countAllResults(),
                'limit' => $limits['invoices'] ?? 0,
            ],
            'storage_gb' => [
                'used' => round(((new WorkspaceFileModel())->withoutTenant()->where('tenant_id', $tenantId)->selectSum('size')->get()->getRow()->size ?? 0) / (1024 * 1024 * 1024), 4),
                'limit' => $limits['storage_gb'] ?? 0,
            ],
            'api_calls' => [
                'used' => (new AiQueryHistoryModel())->withoutTenant()->where('tenant_id', $tenantId)->countAllResults(),
                'limit' => $limits['api_calls'] ?? 0,
            ],
        ];

        foreach ($resources as $type => $data) {
            if ($data['limit'] <= 0) continue;

            $percentage = ($data['used'] / $data['limit']) * 100;
            
            // Re-order to check 100% first
            if ($percentage >= 100) {
                $this->sendNotification($tenantId, $type, 100, $subscription['current_period_start']);
            } elseif ($percentage >= 80) {
                $this->sendNotification($tenantId, $type, 80, $subscription['current_period_start']);
            }
        }
    }

    private function sendNotification($tenantId, $resourceType, $threshold, $periodStart)
    {
        $notificationModel = new UsageNotificationModel();
        
        // Check if already sent
        $sent = $notificationModel->withoutTenant()->where([
            'tenant_id' => $tenantId,
            'resource_type' => $resourceType,
            'threshold' => $threshold,
            'period_start' => $periodStart
        ])->first();

        if ($sent) return;

        // Fetch tenant email (using default for now, ideally fetching from users)
        $tenantModel = new TenantModel();
        $tenant = $tenantModel->find($tenantId);
        $emailAddress = "billing-" . $tenantId . "@example.com"; // Fallback/Placeholder
        
        // Better: Find the primary user of this tenant
        $db = \Config\Database::connect();
        $user = $db->table('users')->where('tenant_id', $tenantId)->where('role', 'admin')->get()->getRowArray(); // Assuming 'admin' role
        if ($user) {
            $emailAddress = $user['email'];
        }

        $email = Services::email();
        $email->setTo($emailAddress);
        $email->setSubject("Usage Alert: You have reached $threshold% of your $resourceType limit");
        
        $viewData = [
            'tenantName' => $tenant['company_name'],
            'resourceType' => $resourceType,
            'threshold' => $threshold,
            'periodStart' => $periodStart,
            'upgradeUrl' => base_url("#billing")
        ];
        
        $body = view('emails/usage_alert', $viewData);
        $email->setMessage($body);

        if ($email->send()) {
            $notificationModel->withoutTenant()->insert([
                'tenant_id' => $tenantId,
                'resource_type' => $resourceType,
                'threshold' => $threshold,
                'period_start' => $periodStart,
                'sent_at' => date('Y-m-d H:i:s')
            ]);
        } else {
            log_message('error', "Failed to send usage notification to $emailAddress");
        }
    }
}
