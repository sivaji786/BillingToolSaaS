<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Models\SubscriptionModel;
use App\Models\PlanModel;
use App\Models\InvoiceModel;
use App\Services\StripeService;

class Billing extends BaseController
{
    use ResponseTrait;

    protected $stripe;

    private function getStripe(): StripeService
    {
        if (!$this->stripe) {
            $this->stripe = new StripeService();
        }
        return $this->stripe;
    }

    public function subscription()
    {
        try {
            $tenantId = $this->request->tenantId ?? session('tenantId');
            
            if (!$tenantId) {
                 $currentTenant = config('App')->currentTenant;
                 $tenantId = $currentTenant->id ?? null;
            }

            if (!$tenantId) {
                 return $this->failUnauthorized('Tenant context missing');
            }

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

            $limits = $plan['limits'];
            if (is_string($limits)) {
                 $limits = json_decode($limits, true);
            }
            if (!is_array($limits)) {
                $limits = []; 
            }
            
            // Storage Usage
            $workspaceModel = new \App\Models\WorkspaceFileModel();
            $storageUsedBytes = $workspaceModel->where('tenant_id', $tenantId)->selectSum('size')->get()->getRow()->size ?? 0;
            $storageLimitGB = $limits['storage_gb'] ?? 0;
            $storageUsedGB = round($storageUsedBytes / (1024 * 1024 * 1024), 4);

            // AI Query Usage
            $aiModel = new \App\Models\AiQueryHistoryModel();
            $aiQueryCount = $aiModel->where('tenant_id', $tenantId)->countAllResults();
            $aiLimit = $limits['api_calls'] ?? 0;

            $maxInvoices = $limits['invoices'] ?? 0;
            
            $usage = [
                'invoices' => [
                    'used' => $invoiceCount,
                    'limit' => $maxInvoices,
                    'percentage' => ($maxInvoices > 0) ? min(100, round(($invoiceCount / $maxInvoices) * 100)) : 0
                ],
                'storage' => [
                    'used' => $storageUsedGB,
                    'limit' => $storageLimitGB,
                    'percentage' => ($storageLimitGB > 0) ? min(100, round(($storageUsedGB / $storageLimitGB) * 100)) : 0
                ],
                'api_calls' => [
                    'used' => $aiQueryCount,
                    'limit' => $aiLimit,
                    'percentage' => ($aiLimit > 0) ? min(100, round(($aiQueryCount / $aiLimit) * 100)) : 0
                ]
            ];

            return $this->response->setJSON([
                'subscription' => $subscription,
                'plan' => $plan,
                'usage' => $usage
            ])->setStatusCode(200);
        } catch (\Exception $e) {
            return $this->failServerError('Error fetching subscription: ' . $e->getMessage());
        }
    }

    public function upgrade()
    {
        $json = $this->request->getJSON();
        $newPlanId = $json->plan_id ?? null; // In reality this should be price_id or we look up price_id from plan_id

        if (!$newPlanId) {
            return $this->fail('Plan ID is required', 400);
        }

        $tenant = config('App')->currentTenant;
        if (!$tenant) { // Safety check
             return $this->failUnauthorized('No tenant context');
        }

        try {
            // 1. Ensure Tenant has Stripe Customer ID
            if (empty($tenant->stripe_customer_id)) {
                $db          = \Config\Database::connect();
                $tenantOwner = $db->table('users')->where('tenant_id', $tenant->id)->orderBy('id', 'ASC')->get()->getRowArray();
                $ownerEmail  = $tenantOwner['email'] ?? ('tenant-' . $tenant->id . '@billingtool.app');
                $customer = $this->getStripe()->createCustomer($tenant->company_name . ' (' . $tenant->subdomain . ')', $ownerEmail);
                $tenant->stripe_customer_id = $customer->id;
                $db->table('tenants')->where('id', $tenant->id)->update(['stripe_customer_id' => $customer->id]);
            }

            // 2. Resolve Stripe Price ID from the plans table
            $planModel = new \App\Models\PlanModel();
            $plan = $planModel->find($newPlanId);
            if (!$plan) {
                return $this->fail('Plan not found', 404);
            }

            $priceId = $plan['stripe_price_id'] ?? null;
            if (empty($priceId)) {
                return $this->fail('This plan does not have a Stripe price configured. Contact support.', 422);
            }

            // 3. Create Checkout Session
            // Dynamic success/cancel URLs based on current origin
            $origin = $this->request->getServer('HTTP_ORIGIN');
            if (!$origin) $origin = 'http://localhost:3000'; // Fallback
            
            $checkoutUrl = $this->getStripe()->createCheckoutSession(
                $tenant->stripe_customer_id,
                $priceId,
                $origin . '/billing?success=true',
                $origin . '/billing?canceled=true'
            );

            return $this->response->setJSON(['checkoutUrl' => $checkoutUrl])->setStatusCode(200);

        } catch (\Exception $e) {
            return $this->failServerError('Stripe Error: ' . $e->getMessage());
        }
    }

    public function history()
    {
        // TODO: Sync invoices from Stripe via Webhook to local DB
        // For now, return empty or mock
        return $this->response->setJSON([])->setStatusCode(200); 
    }
    
    public function plans()
    {
        $model = new PlanModel();
        $plans = $model->where('is_active', 1)->where('is_public', 1)->findAll();
        return $this->response->setJSON([
            'success' => true,
            'data' => $plans
        ])->setStatusCode(200);
    }

    public function packageServices()
    {
        $model = new \App\Models\PackageServiceModel();
        $services = $model->where('is_active', 1)->orderBy('display_order', 'ASC')->findAll();
        
        $mapped = array_map(function($service) {
            return [
                'id' => (string)$service['id'],
                'name' => $service['name'],
                'type' => $service['type'],
                'displayOrder' => (int)$service['display_order'],
                'description' => $service['description'],
            ];
        }, $services);

        return $this->response->setJSON([
            'success' => true,
            'data' => $mapped,
        ])->setStatusCode(200);
    }
}
