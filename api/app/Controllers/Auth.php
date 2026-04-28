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

        // Build redirect URL using subdomain pattern
        // Get configuration from environment variables
        $frontendDomain = getenv('FRONTEND_DOMAIN') ?: ($_ENV['FRONTEND_DOMAIN'] ?? 'localhost');
        $frontendPort = getenv('FRONTEND_PORT') ?: ($_ENV['FRONTEND_PORT'] ?? '');
        $protocol = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
        
        $subdomain = $tenant['subdomain'];
        
        // Build port suffix (only if port is specified)
        $portSuffix = $frontendPort ? ":{$frontendPort}" : '';
        
        // Build redirect URL to tenant subdomain
        $redirectUrl = "{$protocol}://{$subdomain}.{$frontendDomain}{$portSuffix}/?token={$token}#/dashboard";

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'token' => $token,
                'user' => $user,
                'tenant' => $tenant,
                'redirect_url' => $redirectUrl,
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
     * Forgot Password
     * POST /api/auth/forgot-password
     */
    public function forgotPassword()
    {
        $data = $this->request->getJSON(true);
        if (!isset($data['email'])) {
            return $this->fail('Email is required');
        }

        $email = $data['email'];
        $user = $this->userModel->withoutTenant()->findByEmail($email);
        
        if (!$user) {
            // Return success even if user not found to prevent email enumeration
            return $this->response->setJSON(['success' => true, 'message' => 'If an account with that email exists, we have sent a reset link.'])->setStatusCode(200);
        }

        $token = bin2hex(random_bytes(32));
        $db = \Config\Database::connect();
        $db->table('password_resets')->insert([
            'email' => $email,
            'token' => $token,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        $tenant = $this->tenantModel->find($user['tenant_id']);
        $frontendDomain = getenv('FRONTEND_DOMAIN') ?: ($_ENV['FRONTEND_DOMAIN'] ?? 'localhost');
        $frontendPort = getenv('FRONTEND_PORT') ?: ($_ENV['FRONTEND_PORT'] ?? '');
        $protocol = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
        
        $subdomain = $tenant['subdomain'] ?? '';
        $portSuffix = $frontendPort ? ":{$frontendPort}" : '';
        
        // E.g., http://tenant.localhost:5173/#reset-password/TOKEN
        $resetUrl = "{$protocol}://{$subdomain}.{$frontendDomain}{$portSuffix}/#reset-password/{$token}";

        // Attempt to send physical email
        $this->sendPasswordResetEmail($email, $resetUrl);
        log_message('info', 'PASSWORD RESET LINK FOR ' . $email . ': ' . $resetUrl);
        
        return $this->response->setJSON([
            'success' => true,
            'message' => 'If an account with that email exists, we have sent a reset link. Please check your inbox.',
            'test_url' => $resetUrl // Kept for local development testing
        ])->setStatusCode(200);
    }

    /**
     * Send the password reset email using CI4 Email library
     */
    private function sendPasswordResetEmail(string $toEmail, string $resetUrl)
    {
        $email = \Config\Services::email();
        $email->initialize($this->smtpConfig());

        $fromEmail = getenv('MAIL_FROM_EMAIL') ?: (getenv('email.fromEmail') ?: 'noreply@billingtool.com');
        $fromName  = getenv('MAIL_FROM_NAME') ?: (getenv('email.fromName') ?: 'BillingTool');
        
        $email->setFrom($fromEmail, $fromName);
        $email->setTo($toEmail);
        $email->setSubject('Password Reset Request');
        $email->setMailType('html');
        
        $message = "
        <h2>Reset Your Password</h2>
        <p>You recently requested to reset the password for your account.</p>
        <p>Click the link below to securely choose a new password:</p>
        <p><a href='{$resetUrl}'>{$resetUrl}</a></p>
        <p><br>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>This link will expire in 1 hour.</p>
        ";

        $email->setMessage($message);

        if (!$email->send()) {
            log_message('error', 'Failed to send password reset email to: ' . $toEmail);
            log_message('error', $email->printDebugger(['headers']));
        }
    }

    private function smtpConfig(): array
    {
        return [
            'protocol'   => getenv('MAIL_PROTOCOL')   ?: 'smtp',
            'SMTPHost'   => getenv('MAIL_HOST')        ?: 'localhost',
            'SMTPPort'   => (int)(getenv('MAIL_PORT')  ?: 587),
            'SMTPUser'   => getenv('MAIL_USERNAME')    ?: '',
            'SMTPPass'   => getenv('MAIL_PASSWORD')    ?: '',
            'SMTPCrypto' => getenv('MAIL_ENCRYPTION')  ?: 'tls',
            'mailType'   => 'html',
            'charset'    => 'utf-8',
            'newline'    => "\r\n",
        ];
    }

    /**
     * Reset Password
     * POST /api/auth/reset-password
     */
    public function resetPassword()
    {
        $data = $this->request->getJSON(true);
        if (!isset($data['token']) || !isset($data['password'])) {
            return $this->fail('Token and new password are required');
        }

        $token = $data['token'];
        $newPassword = $data['password'];

        $db = \Config\Database::connect();
        $resetRecord = $db->table('password_resets')->where('token', $token)->get()->getRowArray();

        if (!$resetRecord) {
            return $this->fail('Invalid or expired reset token');
        }

        // Check if expired (e.g., older than 1 hour)
        $createdAt = strtotime($resetRecord['created_at']);
        if (time() - $createdAt > 3600) {
            $db->table('password_resets')->where('token', $token)->delete();
            return $this->fail('Reset token has expired');
        }

        $user = $this->userModel->withoutTenant()->findByEmail($resetRecord['email']);
        if ($user) {
            $this->userModel->withoutTenant()->update($user['id'], [
                'password' => $newPassword // The UserModel's beforeUpdate callback handles hashing
            ]);
        }

        // Invalidate token
        $db->table('password_resets')->where('token', $token)->delete();

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Password reset successfully'
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
