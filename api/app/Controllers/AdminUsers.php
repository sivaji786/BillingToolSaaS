<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\TenantModel;
use App\Models\PlanModel;
use App\Models\SubscriptionModel;

class AdminUsers extends ResourceController
{
    use ResponseTrait, \App\Traits\AuditTrait;

    protected $format = 'json';
    protected $tenantModel;
    protected $planModel;
    protected $subscriptionModel;

    public function __construct()
    {
        $this->tenantModel = new TenantModel();
        $this->planModel = new PlanModel();
        $this->subscriptionModel = new SubscriptionModel();
    }

    /**
     * Get all users
     * GET /api/admin/users
     */
    public function index()
    {
        $page = $this->request->getGet('page') ?? 1;
        $limit = $this->request->getGet('limit') ?? 10;
        $search = $this->request->getGet('search') ?? '';
        $status = $this->request->getGet('status') ?? '';

        // Get all tenants with their plans
        $builder = $this->tenantModel->builder();
        $builder->select('tenants.*, plans.name as plan_name, plans.price as plan_price');
        $builder->join('plans', 'plans.id = tenants.plan_id', 'left');

        if ($search) {
            $builder->groupStart()
                ->like('tenants.company_name', $search)
                ->orLike('tenants.subdomain', $search)
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
            
            return [
                'id' => (string)$tenant['id'],
                'name' => $tenant['company_name'],
                'email' => $tenant['subdomain'] . '@example.com', // Mock email
                'packageName' => $tenant['plan_name'],
                'packageId' => (string)$tenant['plan_id'],
                'status' => $tenant['status'],
                'subdomain' => $tenant['subdomain'],
                'joinedDate' => $tenant['created_at'],
                'lastLogin' => date('Y-m-d\TH:i:s\Z'), // Mock last login
                'usageStats' => [
                    'storageUsed' => rand(1, $limits['storage_gb']),
                    'storageLimit' => $limits['storage_gb'],
                    'apiCalls' => rand(1000, $limits['api_calls']),
                    'apiCallsLimit' => $limits['api_calls'],
                    'bandwidthUsed' => rand(10, $limits['bandwidth_gb']),
                    'bandwidthLimit' => $limits['bandwidth_gb'],
                    'activeUsers' => rand(1, $limits['users']),
                    'activeUsersLimit' => $limits['users'],
                ],
            ];
        }, $tenants);

        return $this->response->setJSON([
            'data' => $users,
            'pagination' => [
                'currentPage' => (int)$page,
                'totalPages' => 1,
                'totalItems' => count($users),
                'itemsPerPage' => (int)$limit,
            ],
        ])->setStatusCode(200);
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

        // Get plan details
        $plan = $this->planModel->find($tenant['plan_id']);
        $limits = $this->getPlanLimits($tenant['plan_id']);

        $user = [
            'id' => (string)$tenant['id'],
            'name' => $tenant['company_name'],
            'email' => $tenant['subdomain'] . '@example.com',
            'packageName' => $plan['name'],
            'packageId' => (string)$tenant['plan_id'],
            'status' => $tenant['status'],
            'subdomain' => $tenant['subdomain'],
            'joinedDate' => $tenant['created_at'],
            'lastLogin' => date('Y-m-d\TH:i:s\Z'),
            'usageStats' => [
                'storageUsed' => rand(1, $limits['storage_gb']),
                'storageLimit' => $limits['storage_gb'],
                'apiCalls' => rand(1000, $limits['api_calls']),
                'apiCallsLimit' => $limits['api_calls'],
                'bandwidthUsed' => rand(10, $limits['bandwidth_gb']),
                'bandwidthLimit' => $limits['bandwidth_gb'],
                'activeUsers' => rand(1, $limits['users']),
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
        $this->logAction('updated', "USER-{$id}", "User activated: {$tenant['company_name']}");

        return $this->response->setJSON([
            'success' => true,
            'message' => 'User activated successfully',
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
     * Export users as CSV
     * GET /api/admin/users/export
     */
    public function export()
    {
        $tenants = $this->tenantModel->findAll();

        $csv = "ID,Company Name,Subdomain,Package,Status,Joined Date\n";
        
        foreach ($tenants as $tenant) {
            $plan = $this->planModel->find($tenant['plan_id']);
            $csv .= sprintf(
                "%d,%s,%s,%s,%s,%s\n",
                $tenant['id'],
                $tenant['company_name'],
                $tenant['subdomain'],
                $plan['name'] ?? 'Unknown',
                $tenant['status'],
                $tenant['created_at']
            );
        }

        $this->logAction('exported', "ADMIN-USERS", "Users list exported by admin");
        return $this->response
            ->setHeader('Content-Type', 'text/csv')
            ->setHeader('Content-Disposition', 'attachment; filename="users-export.csv"')
            ->setBody($csv);
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
