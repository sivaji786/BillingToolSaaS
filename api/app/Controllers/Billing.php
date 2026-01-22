<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Models\SubscriptionModel;
use App\Models\PlanModel;
use App\Models\InvoiceModel;

class Billing extends BaseController
{
    use ResponseTrait;

    public function subscription()
    {
        try {
            // HybridAuthFilter sets tenantId on the request object
            $tenantId = $this->request->tenantId ?? session('tenantId');
            
            // Fallback for legacy authentication/TenantFilter if used
            if (!$tenantId) {
                 $currentTenant = config('App')->currentTenant;
                 $tenantId = $currentTenant->id ?? null;
            }

            if (!$tenantId) {
                 return $this->failUnauthorized('Tenant context missing');
            }
            // $tenantId is already the ID, no need to access ->id property
            // $tenantId = $currentTenant->id;

            $subModel = new SubscriptionModel();
            $subscription = $subModel->where('tenant_id', $tenantId)->first();

            if (!$subscription) {
                return $this->failNotFound('Subscription not found');
            }

            $planModel = new PlanModel();
            $plan = $planModel->find($subscription['plan_id']);

            if (!$plan) {
                return $this->failNotFound('Plan not found for this subscription');
            }

            // Usage Tracking
            $invoiceModel = new InvoiceModel();
            $invoiceCount = $invoiceModel->where('tenant_id', $tenantId)->countAllResults();

            // Debug logging (if working)
            // log_message('error', 'Plan Data Type: ' . gettype($plan));

            $limits = $plan['limits'];
            if (is_string($limits)) {
                 $limits = json_decode($limits, true);
            }
            
            // Check if limits is null/false after decode
            if (!is_array($limits)) {
                $limits = []; 
            }
            
            $maxInvoices = $limits['invoices'] ?? 0;
            
            // Progress
            $usage = [
                'invoices' => [
                    'used' => $invoiceCount,
                    'limit' => $maxInvoices,
                    'percentage' => ($maxInvoices > 0) ? min(100, round(($invoiceCount / $maxInvoices) * 100)) : 0
                ]
            ];

            return $this->respond([
                'subscription' => $subscription,
                'plan' => $plan,
                'usage' => $usage
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Error fetching subscription: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
        }
    }

    public function upgrade()
    {
        $json = $this->request->getJSON();
        $newPlanId = $json->plan_id ?? null;

        if (!$newPlanId) {
            return $this->failValidationError('Plan ID is required');
        }

        $tenantId = config('App')->currentTenant->id;
        $subModel = new SubscriptionModel();
        $subscription = $subModel->where('tenant_id', $tenantId)->first();

        if ($subscription) {
            $subModel->update($subscription['id'], [
                'plan_id' => $newPlanId,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } else {
             // Create if missing
             $subModel->insert([
                 'tenant_id' => $tenantId,
                 'plan_id' => $newPlanId,
                 'status' => 'active',
                 'current_period_start' => date('Y-m-d H:i:s'),
                 'current_period_end' => date('Y-m-d H:i:s', strtotime('+1 month'))
             ]);
        }

        return $this->respond(['message' => 'Plan upgraded successfully']);
    }

    public function history()
    {
        // Mock Payment History
        $history = [
            [
                'id' => 'inv_mock_001',
                'date' => date('Y-m-d', strtotime('-1 month')),
                'amount' => 29.00,
                'status' => 'Paid',
                'invoice_pdf' => '#'
            ],
            [
                'id' => 'inv_mock_002',
                'date' => date('Y-m-d', strtotime('-2 months')),
                'amount' => 29.00,
                'status' => 'Paid',
                'invoice_pdf' => '#'
            ]
        ];

        return $this->respond($history);
    }
    
    public function plans()
    {
        $model = new PlanModel();
        $plans = $model->where('is_active', 1)->findAll();
        return $this->respond($plans);
    }
}
