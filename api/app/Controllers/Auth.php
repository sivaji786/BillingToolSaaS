<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\UserModel;
use App\Models\TenantModel;
use App\Models\PlanModel;
use App\Helpers\JWTHelper;

class Auth extends ResourceController
{
    use ResponseTrait;

    protected $format = 'json';
    protected $userModel;
    protected $tenantModel;
    protected $planModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        $this->tenantModel = new TenantModel();
        $this->planModel = new PlanModel();
    }

    /**
     * Customer Signup
     * POST /api/auth/signup
     */
    public function signup()
    {
        $data = $this->request->getJSON(true);

        // Validate required fields
        if (!isset($data['email']) || !isset($data['password']) || !isset($data['company_name']) || !isset($data['plan_id'])) {
            return $this->fail('Email, password, company name, and plan are required');
        }

        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->fail('Invalid email format');
        }

        // Check if email already exists (Globally unique)
        $existingUser = $this->userModel->withoutTenant()->findByEmail($data['email']);
        if ($existingUser) {
            return $this->fail('Email already registered');
        }

        // Generate subdomain from company name
        $subdomain = strtolower(str_replace(' ', '', $data['company_name']));
        $subdomain = preg_replace('/[^a-z0-9]/', '', $subdomain);
        
        // Check if subdomain exists
        $existingTenant = $this->tenantModel->where('subdomain', $subdomain)->first();
        if ($existingTenant) {
            $subdomain = $subdomain . rand(100, 999);
        }

        // Verify plan exists
        $plan = $this->planModel->find($data['plan_id']);
        if (!$plan) {
            return $this->fail('Invalid plan selected');
        }

        // Start transaction
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            // Create tenant
            $tenantData = [
                'company_name' => $data['company_name'],
                'subdomain' => $subdomain,
                'plan_id' => $data['plan_id'],
                'status' => 'active',
                'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+14 days')), // 14-day trial
            ];
            $tenantId = $this->tenantModel->insert($tenantData);

            if (!$tenantId) {
                throw new \Exception('Failed to create tenant');
            }

            // Create user
            $userData = [
                'tenant_id' => $tenantId,
                'email' => $data['email'],
                'password' => $data['password'], // Will be hashed by model
                'name' => $data['name'] ?? explode('@', $data['email'])[0],
                'role' => 'owner',
            ];
            $userId = $this->userModel->insert($userData);

            if (!$userId) {
                throw new \Exception('Failed to create user');
            }

            // Create subscription
            $subscriptionModel = new \App\Models\SubscriptionModel();
            $subscriptionData = [
                'tenant_id' => $tenantId,
                'plan_id' => $data['plan_id'],
                'status' => 'trialing',
                'current_period_start' => date('Y-m-d H:i:s'),
                'current_period_end' => date('Y-m-d H:i:s', strtotime('+1 month')),
            ];
            $subscriptionModel->insert($subscriptionData);

            $db->transComplete();

            if ($db->transStatus() === false) {
                throw new \Exception('Transaction failed');
            }

            // Get created user
            $user = $this->userModel->find($userId);
            unset($user['password_hash']);

            // Get tenant
            $tenant = $this->tenantModel->find($tenantId);

            // Generate JWT token
            $token = JWTHelper::generateToken($userId, $tenantId, $user['email'], $user['name']);

            return $this->respondCreated([
                'success' => true,
                'message' => 'Account created successfully',
                'data' => [
                    'token' => $token,
                    'user' => $user,
                    'tenant' => $tenant,
                ],
            ]);

        } catch (\Exception $e) {
            $db->transRollback();
            return $this->fail('Signup failed: ' . $e->getMessage());
        }
    }

    /**
     * Customer Login
     * POST /api/auth/login
     */
    public function login()
    {
        $data = $this->request->getJSON(true);

        // Validate required fields
        if (!isset($data['email']) || !isset($data['password'])) {
            return $this->fail('Email and password are required');
        }

        // Authenticate user (Ignore tenant scope as we don't know the tenant yet)
        $user = $this->userModel->withoutTenant()->authenticate($data['email'], $data['password']);

        if (!$user) {
            return $this->failUnauthorized('Invalid email or password');
        }

        // Get tenant
        $tenant = $this->tenantModel->find($user['tenant_id']);

        if (!$tenant) {
            return $this->fail('Tenant not found');
        }

        // Check if tenant is active
        $status = $tenant['status'] ?? 'active'; // Default to active if status is missing
        if ($status !== 'active') {
            return $this->failForbidden('Account is ' . $status);
        }

        // Generate CUSTOMER JWT token (type='customer')
        $token = JWTHelper::generateToken($user['id'], $user['tenant_id'], $user['email'], $user['name'], 'customer');

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'token' => $token,
                'user' => $user,
                'tenant' => $tenant,
            ],
        ])->setStatusCode(200);
    }

    /**
     * Get current user
     * GET /api/auth/me
     */
    public function me()
    {
        // Get token from header
        $token = $this->getBearerToken();

        if (!$token) {
            return $this->failUnauthorized('No token provided');
        }

        // Validate token
        $decoded = JWTHelper::validateToken($token);

        if (!$decoded) {
            return $this->failUnauthorized('Invalid token');
        }

        // Get user
        $user = $this->userModel->find($decoded['user_id']);

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        unset($user['password_hash']);

        // Get tenant
        $tenant = $this->tenantModel->find($user['tenant_id']);

        return $this->response->setJSON([
            'success' => true,
            'data' => [
                'user' => $user,
                'tenant' => $tenant,
            ],
        ])->setStatusCode(200);
    }

    /**
     * Logout
     * POST /api/auth/logout
     */
    public function logout()
    {
        // In a stateless JWT system, logout is handled client-side
        // by removing the token. Server-side logout would require
        // a token blacklist, which we can implement later if needed.

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Logged out successfully',
        ])->setStatusCode(200);
    }

    /**
     * Refresh token
     * POST /api/auth/refresh
     */
    public function refresh()
    {
        $token = $this->getBearerToken();

        if (!$token) {
            return $this->failUnauthorized('No token provided');
        }

        $newToken = JWTHelper::refreshToken($token);

        if (!$newToken) {
            return $this->failUnauthorized('Invalid token');
        }

        return $this->response->setJSON([
            'success' => true,
            'data' => [
                'token' => $newToken,
            ],
        ])->setStatusCode(200);
    }

    /**
     * Helper: Get bearer token from header
     */
    private function getBearerToken()
    {
        $authHeader = $this->request->getHeaderLine('Authorization');

        // Shared hosting workaround
        if (!$authHeader) {
            $authHeader = $this->request->getHeaderLine('X-Authorization');
        }

        if (!$authHeader) {
            return null;
        }

        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
