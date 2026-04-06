<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\TenantModel;
use App\Models\SubscriptionModel;
use App\Models\PlanModel;
use App\Models\InvoiceModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

class Customer extends BaseController
{
    protected $tenantModel;
    protected $subscriptionModel;
    protected $planModel;
    protected $invoiceModel;
    protected $userModel;
    protected $usageModel;

    public function __construct()
    {
        $this->tenantModel = new TenantModel();
        $this->subscriptionModel = new SubscriptionModel();
        $this->planModel = new PlanModel();
        $this->invoiceModel = new InvoiceModel();
        $this->userModel = new UserModel();
        $this->usageModel = new \App\Models\TenantUsageModel();
    }

    /**
     * Get customer dashboard data
     * GET /api/customer/dashboard
     */
    public function dashboard()
    {
        try {
            // Get tenant_id from JWT (set by auth middleware)
            $tenantId = $this->request->tenantId ?? null;
            
            if (!$tenantId) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Unauthorized'
                ])->setStatusCode(401);
            }

            // Get tenant
            $tenant = $this->tenantModel->find($tenantId);
            
            // Get subscription
            $subscription = $this->subscriptionModel
                ->where('tenant_id', $tenantId)
                ->first();
            
            // Get plan
            $plan = null;
            if ($subscription) {
                $plan = $this->planModel->find($subscription['plan_id']);
                if ($plan) {
                    $plan['features'] = json_decode($plan['features'], true);
                    $plan['limits'] = json_decode($plan['limits'], true);
                }
            }

            // Get recent invoices (last 5)
            $recentInvoices = $this->invoiceModel
                ->where('tenant_id', $tenantId)
                ->orderBy('created_at', 'DESC')
                ->findAll(5);

            // Calculate usage (real from usage tracking)
            $usage = [];
            $resourceKeys = ['storage', 'api_calls', 'bandwidth', 'users', 'invoices'];
            
            foreach ($resourceKeys as $key) {
                // If it's invoices or users, we can count directly for absolute truth
                if ($key === 'invoices') {
                    $used = $this->invoiceModel->where('tenant_id', $tenantId)->countAllResults();
                } elseif ($key === 'users') {
                    $used = $this->userModel->where('tenant_id', $tenantId)->countAllResults();
                } else {
                    $usageRecord = $this->usageModel->getUsage($tenantId, $key);
                    $used = $usageRecord ? (int)$usageRecord['used_amount'] : 0;
                }

                $limit = $plan['limits'][$key] ?? 0;
                if ($key === 'storage' && !isset($plan['limits'][$key])) $limit = 5000000000;
                if ($key === 'api_calls' && !isset($plan['limits'][$key])) $limit = 10000;
                if ($key === 'bandwidth' && !isset($plan['limits'][$key])) $limit = 50000000000;

                $percentage = 0;
                if ($limit == -1) {
                    $percentage = 0; // Unlimited
                } elseif ($limit > 0) {
                    $percentage = min(100, round(($used / $limit) * 100));
                }

                $usage[$key] = [
                    'used' => $used,
                    'limit' => $limit,
                    'percentage' => $percentage
                ];
            }

            return $this->response->setJSON([
                'success' => true,
                'data' => [
                    'tenant' => $tenant,
                    'subscription' => $subscription,
                    'plan' => $plan,
                    'usage' => $usage,
                    'recentInvoices' => $recentInvoices,
                    'stats' => [
                        'totalInvoices' => count($recentInvoices),
                        'paidInvoices' => 0, // Calculate from invoices
                        'pendingInvoices' => 0,
                        'totalSpent' => 0
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return $this->response->setJSON([
                'success' => false,
                'message' => $e->getMessage()
            ])->setStatusCode(500);
        }
    }

    /**
     * Get customer invoices
     * GET /api/customer/invoices
     */
    public function invoices()
    {
        try {
            $tenantId = $this->request->tenantId ?? null;
            
            if (!$tenantId) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Unauthorized'
                ])->setStatusCode(401);
            }

            $page = $this->request->getGet('page') ?? 1;
            $limit = $this->request->getGet('limit') ?? 10;
            $status = $this->request->getGet('status');

            $query = $this->invoiceModel->where('tenant_id', $tenantId);
            
            if ($status) {
                $query->where('status', $status);
            }

            $total = $query->countAllResults(false);
            $invoices = $query->orderBy('created_at', 'DESC')
                ->findAll($limit, ($page - 1) * $limit);

            return $this->response->setJSON([
                'success' => true,
                'data' => $invoices,
                'pagination' => [
                    'currentPage' => (int)$page,
                    'totalPages' => ceil($total / $limit),
                    'totalItems' => $total,
                    'itemsPerPage' => (int)$limit
                ]
            ]);

        } catch (\Exception $e) {
            return $this->response->setJSON([
                'success' => false,
                'message' => $e->getMessage()
            ])->setStatusCode(500);
        }
    }

    /**
     * Get single invoice
     * GET /api/customer/invoices/:id
     */
    public function invoice($id)
    {
        try {
            $tenantId = $this->request->tenantId ?? null;
            
            if (!$tenantId) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Unauthorized'
                ])->setStatusCode(401);
            }

            $invoice = $this->invoiceModel
                ->where('id', $id)
                ->where('tenant_id', $tenantId)
                ->first();

            if (!$invoice) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Invoice not found'
                ])->setStatusCode(404);
            }

            return $this->response->setJSON([
                'success' => true,
                'data' => $invoice
            ])->setStatusCode(200);

        } catch (\Exception $e) {
            return $this->response->setJSON([
                'success' => false,
                'message' => $e->getMessage()
            ])->setStatusCode(500);
        }
    }

    /**
     * Get subscription info
     * GET /api/customer/subscription
     */
    public function subscription()
    {
        try {
            $tenantId = $this->request->tenantId ?? null;
            
            if (!$tenantId) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Unauthorized'
                ])->setStatusCode(401);
            }

            $subscription = $this->subscriptionModel
                ->where('tenant_id', $tenantId)
                ->first();

            if (!$subscription) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'No subscription found'
                ])->setStatusCode(404);
            }

            $plan = $this->planModel->find($subscription['plan_id']);
            if ($plan) {
                $plan['features'] = json_decode($plan['features'], true);
                $plan['limits'] = json_decode($plan['limits'], true);
            }

            return $this->response->setJSON([
                'success' => true,
                'data' => [
                    'subscription' => $subscription,
                    'plan' => $plan
                ]
            ]);

        } catch (\Exception $e) {
            return $this->response->setJSON([
                'success' => false,
                'message' => $e->getMessage()
            ])->setStatusCode(500);
        }
    }

    /**
     * Update customer profile
     * PUT /api/customer/profile
     */
    public function updateProfile()
    {
        try {
            $tenantId = $this->request->tenantId ?? null;
            
            if (!$tenantId) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Unauthorized'
                ])->setStatusCode(401);
            }

            $data = $this->request->getJSON(true);
            
            $updateData = [];
            if (isset($data['company_name'])) $updateData['company_name'] = $data['company_name'];
            if (isset($data['contact_email'])) $updateData['contact_email'] = $data['contact_email'];
            if (isset($data['contact_phone'])) $updateData['contact_phone'] = $data['contact_phone'];
            if (isset($data['ai_provider'])) $updateData['ai_provider'] = $data['ai_provider'];
            if (isset($data['gemini_api_key'])) $updateData['gemini_api_key'] = $data['gemini_api_key'];
            if (isset($data['openai_api_key'])) $updateData['openai_api_key'] = $data['openai_api_key'];

            if (empty($updateData)) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'No data to update'
                ])->setStatusCode(400);
            }

            $this->tenantModel->update($tenantId, $updateData);

            $tenant = $this->tenantModel->find($tenantId);

            return $this->response->setJSON([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => $tenant
            ])->setStatusCode(200);

        } catch (\Exception $e) {
            return $this->response->setJSON([
                'success' => false,
                'message' => $e->getMessage()
            ])->setStatusCode(500);
        }
    }

    /**
     * Get current usage
     * GET /api/customer/usage
     */
    public function usage()
    {
        try {
            $tenantId = $this->request->tenantId ?? null;
            
            if (!$tenantId) {
                return $this->response->setJSON([
                    'success' => false,
                    'message' => 'Unauthorized'
                ])->setStatusCode(401);
            }

            // Get subscription and plan for limits
            $subscription = $this->subscriptionModel
                ->where('tenant_id', $tenantId)
                ->first();
            
            $plan = $this->planModel->find($subscription['plan_id']);
            $limits = json_decode($plan['limits'], true);

            // Real usage data
            $usage = [];
            $resourceKeys = ['storage', 'api_calls', 'bandwidth', 'users', 'invoices'];
            $units = [
                'storage'   => 'bytes',
                'api_calls' => 'calls',
                'bandwidth' => 'bytes',
                'users'     => 'users',
                'invoices'  => 'invoices'
            ];
            
            foreach ($resourceKeys as $key) {
                if ($key === 'invoices') {
                    $used = $this->invoiceModel->where('tenant_id', $tenantId)->countAllResults();
                } elseif ($key === 'users') {
                    $used = $this->userModel->where('tenant_id', $tenantId)->countAllResults();
                } else {
                    $usageRecord = $this->usageModel->getUsage($tenantId, $key);
                    $used = $usageRecord ? (int)$usageRecord['used_amount'] : 0;
                }

                $usage[$key] = [
                    'used' => $used,
                    'limit' => $limits[$key] ?? 0,
                    'unit' => $units[$key] ?? ''
                ];
            }

            return $this->response->setJSON([
                'success' => true,
                'data' => $usage
            ])->setStatusCode(200);

        } catch (\Exception $e) {
            return $this->response->setJSON([
                'success' => false,
                'message' => $e->getMessage()
            ])->setStatusCode(500);
        }
    }
}
