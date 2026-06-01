<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\TenantModel;
use App\Models\PlanModel;
use App\Models\SubscriptionModel;

use App\Traits\AuditTrait;

class AdminUsers extends ResourceController
{
    use ResponseTrait, AuditTrait;

    protected $format = 'json';
    protected $tenantModel;
    protected $planModel;
    protected $subscriptionModel;
    protected $usageModel;
    protected $invoiceModel;
    protected $userModel;

    public function initController(\CodeIgniter\HTTP\RequestInterface $request, \CodeIgniter\HTTP\ResponseInterface $response, \Psr\Log\LoggerInterface $logger)
    {
        parent::initController($request, $response, $logger);
        $this->tenantModel = new TenantModel();
        $this->planModel = new PlanModel();
        $this->subscriptionModel = new SubscriptionModel();
        $this->usageModel = new \App\Models\TenantUsageModel();
        $this->invoiceModel = new \App\Models\InvoiceModel();
        $this->userModel = new \App\Models\UserModel();
    }

    /**
     * Get all users
     * GET /api/admin/users
     */
    public function index()
    {
        try {
            $page = $this->request->getGet('page') ?? 1;
            $limit = $this->request->getGet('limit') ?? 10;
            $search = $this->request->getGet('search') ?? '';
            $status = $this->request->getGet('status') ?? '';

            // Get all tenants with their plans and primary user email
            $builder = $this->tenantModel->builder();
            $builder->select('tenants.id as id, tenants.company_name, tenants.subdomain, tenants.status, tenants.created_at, tenants.plan_id, plans.name as plan_name, plans.price as plan_price, MIN(users.email) as admin_email, MAX(users.last_login) as last_login');
            $builder->join('plans', 'plans.id = tenants.plan_id', 'left');
            $builder->join('users', 'users.tenant_id = tenants.id', 'left');
            $builder->groupBy('tenants.id');

            if ($search) {
                $builder->groupStart()
                    ->like('tenants.company_name', $search)
                    ->orLike('tenants.subdomain', $search)
                    ->orLike('users.email', $search)
                    ->groupEnd();
            }

            if ($status) {
                $builder->where('tenants.status', $status);
            }

            $tenants = $builder->get()->getResultArray();

            // Transform data for frontend
            $users = array_map(function($tenant) {
                // Mock usage stats for now (would come from usage tracking table)
                $limits = $this->getPlanLimits($tenant['plan_id']);
                
                try {
                    $ssoConfig = \Config\Database::connect()->table('tenant_sso_configs')
                        ->where('tenant_id', $tenant['id'])
                        ->get()->getRowArray();
                } catch (\Throwable $e) {
                    $ssoConfig = null;
                }

                return [
                    'id' => (string)$tenant['id'],
                    'name' => $tenant['company_name'],
                    'email' => $tenant['admin_email'] ?? (null),
                    'packageName' => $tenant['plan_name'],
                    'packageId' => (string)$tenant['plan_id'],
                    'status' => $tenant['status'],
                    'subdomain' => $tenant['subdomain'],
                    'joinedDate' => $tenant['created_at'],
                    'lastLogin' => $tenant['last_login'] ?? null,
                    'workhub_enabled' => (bool) ($limits['workhub_enabled'] ?? false),
                    'saml_enabled'    => $ssoConfig ? (bool) $ssoConfig['enabled'] : false,
                    'saml_provider'   => $ssoConfig['provider'] ?? null,
                    'sso_only'        => $ssoConfig ? (bool) $ssoConfig['sso_only'] : false,
                    'usageStats' => [
                        'storageUsed' => round(($this->usageModel->getUsage($tenant['id'], 'storage')['used_amount'] ?? 0) / (1024 * 1024 * 1024), 2),
                        'storageLimit' => $limits['storage_gb'] ?? round(($limits['storage'] ?? 0) / (1024 * 1024 * 1024), 2),
                        'apiCalls' => (int)($this->usageModel->getUsage($tenant['id'], 'api_calls')['used_amount'] ?? 0),
                        'apiCallsLimit' => $limits['api_calls'],
                        'bandwidthUsed' => round(($this->usageModel->getUsage($tenant['id'], 'bandwidth')['used_amount'] ?? 0) / (1024 * 1024 * 1024), 2),
                        'bandwidthLimit' => $limits['bandwidth_gb'] ?? round(($limits['bandwidth'] ?? 0) / (1024 * 1024 * 1024), 2),
                        'activeUsers' => $this->userModel->where('tenant_id', $tenant['id'])->countAllResults(),
                        'activeUsersLimit' => $limits['users'],
                    ],
                ];
            }, $tenants);

            return $this->respond([
                'data' => $users,
                'pagination' => [
                    'currentPage' => (int)$page,
                    'totalPages' => 1,
                    'totalItems' => count($users),
                    'itemsPerPage' => (int)$limit,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage() . "\n" . $e->getTraceAsString());
        }
    }

    /**
     * Get user by ID
     * GET /api/admin/users/:id
     */
    public function show($id = null)
    {
        $tenant = $this->tenantModel->find($id);
        
        if (!$tenant) {
            return $this->failNotFound('User not found');
        }

        // Get admin email
        $userModel = new \App\Models\UserModel();
        $adminUser = $userModel->withoutTenant()->where('tenant_id', $tenant['id'])->first();

        // Get plan details
        $plan = $this->planModel->find($tenant['plan_id']);
        $limits = $this->getPlanLimits($tenant['plan_id']);

        $user = [
            'id' => (string)$tenant['id'],
            'name' => $tenant['company_name'],
            'email' => $adminUser['email'] ?? (null),
            'packageName' => $plan['name'],
            'packageId' => (string)$tenant['plan_id'],
            'status' => $tenant['status'],
            'subdomain' => $tenant['subdomain'],
            'joinedDate' => $tenant['created_at'],
            'lastLogin' => $adminUser['last_login'] ?? null,
            'usageStats' => [
                'storageUsed' => round(($this->usageModel->getUsage($tenant['id'], 'storage')['used_amount'] ?? 0) / (1024 * 1024 * 1024), 2),
                'storageLimit' => $limits['storage_gb'] ?? round(($limits['storage'] ?? 0) / (1024 * 1024 * 1024), 2),
                'apiCalls' => (int)($this->usageModel->getUsage($tenant['id'], 'api_calls')['used_amount'] ?? 0),
                'apiCallsLimit' => $limits['api_calls'],
                'bandwidthUsed' => round(($this->usageModel->getUsage($tenant['id'], 'bandwidth')['used_amount'] ?? 0) / (1024 * 1024 * 1024), 2),
                'bandwidthLimit' => $limits['bandwidth_gb'] ?? round(($limits['bandwidth'] ?? 0) / (1024 * 1024 * 1024), 2),
                'activeUsers' => $this->userModel->where('tenant_id', $tenant['id'])->countAllResults(),
                'activeUsersLimit' => $limits['users'],
            ],
        ];

        return $this->response->setJSON([
            'success' => true,
            'data' => $user,
        ])->setStatusCode(200);
    }

    /**
     * Suspend user
     * POST /api/admin/users/:id/suspend
     */
    public function suspend($id = null)
    {
        $tenant = $this->tenantModel->find($id);

        if (!$tenant) {
            return $this->failNotFound('User not found');
        }

        $this->tenantModel->update($id, ['status' => 'suspended']);
        $this->logAction('updated', "USER-{$id}", "User suspended: {$tenant['company_name']}");

        return $this->response->setJSON([
            'success' => true,
            'message' => 'User suspended successfully',
        ])->setStatusCode(200);
    }

    /**
     * Activate user
     * POST /api/admin/users/:id/activate
     */
    public function activate($id = null)
    {
        $tenant = $this->tenantModel->find($id);

        if (!$tenant) {
            return $this->failNotFound('User not found');
        }

        $this->tenantModel->update($id, ['status' => 'active']);
        
        // Also update any 'trialing' subscription to 'active'
        $this->subscriptionModel->withoutTenant()
                                ->where('tenant_id', $id)
                                ->where('status', 'trialing')
                                ->set(['status' => 'active'])
                                ->update();

        $this->logAction('updated', "USER-{$id}", "User activated and subscription moved from trialing to active: {$tenant['company_name']}");

        return $this->response->setJSON([
            'success' => true,
            'message' => 'User activated and subscription set to active successfully',
        ])->setStatusCode(200);
    }

    /**
     * Upgrade user package
     * POST /api/admin/users/:id/upgrade
     */
    public function upgrade($id = null)
    {
        return $this->response->setJSON([
            'success' => true,
            'message' => 'User package upgraded successfully',
        ])->setStatusCode(200);
    }

    /**
     * Reset tenant admin password to "password123"
     * POST /api/admin/users/:id/reset-password
     */
    public function resetPassword($id = null)
    {
        // die(json_encode(["debug_id" => $id]));
        $tenant = $this->tenantModel->find($id);

        if (!$tenant) {
            return $this->failNotFound('Tenant not found');
        }

        // Get the primary admin/owner for this tenant
        $userModel = new \App\Models\UserModel();
        $adminUser = $userModel->withoutTenant()
                               ->where('tenant_id', $id)
                               ->where('role', 'owner')
                               ->first();

        // Fallback to first user if no owner found
        if (!$adminUser) {
            $adminUser = $userModel->withoutTenant()->where('tenant_id', $id)->first();
        }

        if (!$adminUser) {
            return $this->failNotFound('No admin user found for this tenant');
        }

        // Generate a random 12-character password (letters + digits, no ambiguous chars)
        $charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $tempPassword = '';
        for ($i = 0; $i < 12; $i++) {
            $tempPassword .= $charset[random_int(0, strlen($charset) - 1)];
        }

        $userModel->withoutTenant()->update($adminUser['id'], [
            'password' => $tempPassword
        ]);

        $this->logAction('updated', "USER-{$adminUser['id']}", "Password reset by SA for tenant: {$tenant['company_name']}");

        return $this->response->setJSON([
            'success'       => true,
            'message'       => 'Tenant admin password has been reset. Share the temporary password securely.',
            'temp_password' => $tempPassword,
        ])->setStatusCode(200);
    }

    /**
     * Export users as CSV
     * GET /api/admin/users/export
     */
    public function export()
    {
        $tenants = $this->tenantModel->findAll();

        $csv = "ID,Company Name,Subdomain,Email,Package,Status,Joined Date,Last Login,Storage Used (GB),API Calls,Bandwidth Used (GB)\n";

        foreach ($tenants as $tenant) {
            $plan    = $this->planModel->find($tenant['plan_id']);
            $user    = (new \App\Models\UserModel())->withoutTenant()->where('tenant_id', $tenant['id'])->first();
            $storage  = round(($this->usageModel->getUsage($tenant['id'], 'storage')['used_amount'] ?? 0) / 1073741824, 3);
            $apiCalls = (int)($this->usageModel->getUsage($tenant['id'], 'api_calls')['used_amount'] ?? 0);
            $bw       = round(($this->usageModel->getUsage($tenant['id'], 'bandwidth')['used_amount'] ?? 0) / 1073741824, 3);

            $csv .= implode(',', [
                $tenant['id'],
                $this->csvCell($tenant['company_name']),
                $this->csvCell($tenant['subdomain']),
                $this->csvCell($user['email'] ?? ''),
                $this->csvCell($plan['name'] ?? 'Unknown'),
                $tenant['status'],
                $tenant['created_at'],
                $user['last_login'] ?? '',
                $storage,
                $apiCalls,
                $bw,
            ]) . "\n";
        }

        $this->logAction('exported', "ADMIN-USERS", "Users list exported by admin");
        return $this->response
            ->setHeader('Content-Type', 'text/csv')
            ->setHeader('Content-Disposition', 'attachment; filename="users-export.csv"')
            ->setBody($csv);
    }

    private function csvCell(string $value): string
    {
        if (strpbrk($value, '",\n') !== false) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }

    /**
     * Helper: Get plan limits
     */
    private function getPlanLimits($planId)
    {
        $plan = $this->planModel->find($planId);
        $defaults = [
            'storage_gb' => 10,
            'users' => 5,
            'bandwidth_gb' => 100,
            'api_calls' => 50000,
            'invoices' => 500
        ];

        if (!$plan || !$plan['limits']) {
            return $defaults;
        }

        $limits = json_decode($plan['limits'], true) ?: [];
        return array_merge($defaults, $limits);
    }
}
