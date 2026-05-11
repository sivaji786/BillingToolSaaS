<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\UserModel;
use App\Models\TenantModel;
use App\Models\PlanModel;
use App\Models\QuickAccessSessionModel;
use App\Helpers\JWTHelper;

/**
 * QuickAccessAuth
 *
 * Frictionless account-creation flow. All state (OTP + invoice draft) is
 * stored in the `quick_access_sessions` DB table so the user can resume
 * from any device via a magic-link URL.
 *
 * Flow:
 *   1. POST /auth/quick-access
 *      { email, invoice_draft? }
 *      → hashes OTP + stores draft in DB
 *      → sends OTP email
 *      → returns { session_token }   (HMAC-signed pointer to DB row)
 *
 *   2. GET  /auth/quick-access/draft?token=…
 *      → returns the stored invoice_draft JSON so any device can restore it
 *
 *   3. POST /auth/quick-access/verify
 *      { session_token, otp }
 *      → verifies OTP against DB row
 *      → creates account if new
 *      → returns { token, user, tenant, invoice_draft }
 */
class QuickAccessAuth extends ResourceController
{
    use ResponseTrait;

    protected $format   = 'json';
    const OTP_TTL       = 600; // 10 minutes in seconds

    // ------------------------------------------------------------------ //
    // Step 1 – send OTP + store draft
    // ------------------------------------------------------------------ //

    /**
     * POST /auth/quick-access
     * Body: { "email": "...", "invoice_draft": { ... } }
     */
    public function sendOtp()
    {
        $data = $this->request->getJSON(true);

        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->fail('A valid email address is required', 400);
        }

        $email        = strtolower(trim($data['email']));
        $invoiceDraft = isset($data['invoice_draft'])
            ? json_encode($data['invoice_draft'])
            : null;

        // Rate limit: max 3 OTP requests per email per 15 minutes
        $db = \Config\Database::connect();
        $window = date('Y-m-d H:i:s', time() - 900);
        $recentCount = $db->table('quick_access_sessions')
            ->where('email', $email)
            ->where('created_at >', $window)
            ->countAllResults();

        if ($recentCount >= 3) {
            return $this->fail('Too many verification requests. Please wait 15 minutes before requesting another code.', 429);
        }

        // Rate limit by IP: max 10 OTP requests per IP per 15 minutes
        $clientIp = $this->request->getIPAddress();
        $ipCount = $db->table('quick_access_sessions')
            ->where('client_ip', $clientIp)
            ->where('created_at >', $window)
            ->countAllResults();

        if ($ipCount >= 10) {
            return $this->fail('Too many requests from this IP address. Please try again later.', 429);
        }

        // Generate 6-digit OTP
        $otp     = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $otpHash = password_hash($otp, PASSWORD_BCRYPT);

        // Build signed session token
        $sessionToken = $this->buildSessionToken($email);
        $tokenHash    = hash('sha256', $sessionToken);

        // Prune expired rows (housekeeping) and upsert new session
        $sessionModel = new QuickAccessSessionModel();
        $sessionModel->pruneExpired();

        // Delete any existing unverified session for this email (fresh start)
        $sessionModel->where('email', $email)->where('verified', 0)->delete();

        $sessionModel->insert([
            'token_hash'     => $tokenHash,
            'email'          => $email,
            'otp_hash'       => $otpHash,
            'invoice_draft'  => $invoiceDraft,
            'client_ip'      => $clientIp,
            'verified'       => 0,
            'expires_at'     => date('Y-m-d H:i:s', time() + self::OTP_TTL),
            'created_at'     => date('Y-m-d H:i:s'),
        ]);

        // Send OTP email
        $sent = $this->sendOtpEmail($email, $otp);
        if (!$sent) {
            log_message('error', '[QuickAccess] Failed to send OTP email to ' . $email);
        }

        return $this->response->setJSON([
            'success'       => true,
            'session_token' => $sessionToken,
            'message'       => 'Verification code sent to ' . $email,
        ])->setStatusCode(200);
    }

    // ------------------------------------------------------------------ //
    // Email existence check (called before OTP to detect existing users)
    // ------------------------------------------------------------------ //

    /**
     * POST /auth/check-email
     * Body: { "email": "..." }
     * Returns: { "exists": true|false }
     */
    public function checkEmail()
    {
        $data = $this->request->getJSON(true);

        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->fail('A valid email address is required', 400);
        }

        $email     = strtolower(trim($data['email']));
        $userModel = new UserModel();

        // Using raw DB to avoid tenant scope (email lookup is global)
        $db   = \Config\Database::connect();
        $user = $db->table('users')->where('email', $email)->get()->getRow();

        return $this->response->setJSON([
            'exists' => ($user !== null),
        ])->setStatusCode(200);
    }


    // ------------------------------------------------------------------ //
    // Step 2 – restore draft from any device
    // ------------------------------------------------------------------ //

    /**
     * GET /auth/quick-access/draft?token=…
     * Returns the stored invoice_draft JSON so any device can restore editing.
     */
    public function getDraft()
    {
        $token = $this->request->getVar('token');
        if (!$token) {
            return $this->fail('token is required', 400);
        }

        $tokenHash    = hash('sha256', $token);
        $sessionModel = new QuickAccessSessionModel();
        $session      = $sessionModel->findByTokenHash($tokenHash);

        if (!$session) {
            return $this->failNotFound('Session not found or expired');
        }

        return $this->response->setJSON([
            'success'        => true,
            'email'          => $session['email'],
            'invoice_draft'  => $session['invoice_draft']
                ? json_decode($session['invoice_draft'], true)
                : null,
        ])->setStatusCode(200);
    }

    // ------------------------------------------------------------------ //
    // Step 3 – verify OTP → create account → return JWT
    // ------------------------------------------------------------------ //

    /**
     * POST /auth/quick-access/verify
     * Body: { "session_token": "...", "otp": "123456" }
     */
    public function verifyOtp()
    {
        $data = $this->request->getJSON(true);

        if (empty($data['session_token']) || empty($data['otp'])) {
            return $this->fail('session_token and otp are required', 400);
        }

        $tokenHash    = hash('sha256', $data['session_token']);
        $sessionModel = new QuickAccessSessionModel();
        $session      = $sessionModel->findByTokenHash($tokenHash);

        if (!$session) {
            return $this->failUnauthorized('Session not found or expired. Please request a new code.');
        }

        // Verify OTP against stored hash
        if (!password_verify($data['otp'], $session['otp_hash'])) {
            return $this->failUnauthorized('Invalid verification code');
        }

        $email        = $session['email'];
        $invoiceDraft = $session['invoice_draft']
            ? json_decode($session['invoice_draft'], true)
            : null;

        // Mark session as verified (prevents replay)
        $sessionModel->markVerified($session['id']);

        // -------------------------------------------------------------- //
        // Create or retrieve account
        // -------------------------------------------------------------- //
        $userModel   = new UserModel();
        $tenantModel = new TenantModel();
        $existingUser = $userModel->withoutTenant()->findByEmail($email);

        if ($existingUser) {
            // Existing user – issue a fresh token (magic-link login)
            $user   = $existingUser;
            $tenant = $tenantModel->find($user['tenant_id']);
            unset($user['password_hash']);

            // Self-heal: if this user was created before the user_roles fix, add the owner role now
            $db = \Config\Database::connect();
            $hasRole = $db->table('user_roles')->where('user_id', $user['id'])->countAllResults();
            if ($hasRole === 0) {
                $db->table('user_roles')->insert(['user_id' => $user['id'], 'role_id' => 1]);
                log_message('info', '[QuickAccess] Backfilled user_roles for user_id=' . $user['id']);
            }

            $token = JWTHelper::generateToken(
                $user['id'], $user['tenant_id'], $user['email'], $user['name'] ?? '', 'customer'
            );

            return $this->response->setJSON([
                'success'        => true,
                'message'        => 'Welcome back!',
                'is_new_user'    => false,
                'token'          => $token,
                'user'           => $user,
                'tenant'         => $tenant,
                'invoice_draft'  => $invoiceDraft,
            ])->setStatusCode(200);
        }

        // New user → create tenant + user + subscription
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $planModel = new PlanModel();
            $trailingPlan = $planModel->where('is_trailing', 1)->first();
            $freePlan     = $planModel->where('price', 0)->first();
            
            $planId = $trailingPlan['id'] ?? $freePlan['id'] ?? $planModel->first()['id'] ?? 1;

            $emailPrefix = preg_replace('/[^a-z0-9]/', '', strtolower(explode('@', $email)[0]));
            $subdomain   = $emailPrefix ?: 'user';
            if ($tenantModel->where('subdomain', $subdomain)->first()) {
                $subdomain .= random_int(100, 999);
            }

            // Use company name from draft if available
            $companyName = !empty($invoiceDraft['seller']['name']) 
                ? $invoiceDraft['seller']['name'] 
                : $emailPrefix;

            $tenantId = $tenantModel->insert([
                'company_name'  => $companyName,
                'subdomain'     => $subdomain,
                'plan_id'       => $planId,
                'status'        => 'active',
                'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+14 days')),
            ]);

            if (!$tenantId) {
                log_message('error', 'Tenant validation errors: ' . json_encode($tenantModel->errors()));
                throw new \Exception('Could not create tenant');
            }

            $userId = $userModel->insert([
                'tenant_id' => $tenantId,
                'email'     => $email,
                'password'  => bin2hex(random_bytes(12)),
                'name'      => $companyName,
                'role'      => 'admin',   // admin = full rights, user = limited rights
            ]);

            if (!$userId) throw new \Exception('Could not create user');

            $subscriptionModel = new \App\Models\SubscriptionModel();
            $subscriptionModel->insert([
                'tenant_id'            => $tenantId,
                'plan_id'              => $planId,
                'status'               => 'trialing',
                'current_period_start' => date('Y-m-d H:i:s'),
                'current_period_end'   => date('Y-m-d H:i:s', strtotime('+14 days')),
            ]);

            // Assign owner role (role_id = 1) so RBAC filters pass immediately
            $db->table('user_roles')->insert([
                'user_id' => $userId,
                'role_id' => 1,
            ]);

            // Create a default company profile so dashboard loads data straight away
            $profileModel = new \App\Models\CompanyProfileModel();
            $profileModel->insert([
                'tenant_id'       => $tenantId,
                'name'            => $companyName,
                'email'           => $email,
                'company_type_id' => 1,
            ]);

            $db->transComplete();
            if ($db->transStatus() === false) throw new \Exception('Transaction failed');

            $user   = $userModel->find($userId);
            $tenant = $tenantModel->find($tenantId);
            unset($user['password_hash']);

            $token = JWTHelper::generateToken(
                $userId, $tenantId, $email, $user['name'] ?? '', 'customer'
            );

            // Send welcome email (non-blocking)
            $loginUrl = rtrim(getenv('FRONTEND_URL') ?: 'http://localhost:3000', '/');
            $this->sendWelcomeEmail($email, $user['name'] ?? $emailPrefix, $loginUrl, date('Y-m-d', strtotime('+14 days')));

            return $this->response->setJSON([
                'success'        => true,
                'message'        => 'Account created successfully',
                'is_new_user'    => true,
                'token'          => $token,
                'user'           => $user,
                'tenant'         => $tenant,
                'invoice_draft'  => $invoiceDraft,
            ])->setStatusCode(201);

        } catch (\Exception $e) {
            $db->transRollback();
            log_message('error', '[QuickAccess] Account creation failed: ' . $e->getMessage());
            return $this->fail('Account creation failed: ' . $e->getMessage(), 500);
        }
    }

    // ------------------------------------------------------------------ //
    // Private helpers
    // ------------------------------------------------------------------ //

    /**
     * Build an HMAC-signed opaque token that maps to a DB row.
     * The token itself contains no sensitive data.
     */
    private function buildSessionToken(string $email): string
    {
        $payload   = base64_encode(json_encode([
            'e'  => $email,
            'ts' => time(),
            'r'  => bin2hex(random_bytes(8)), // random nonce
        ]));
        $secret    = getenv('JWT_SECRET') ?: 'fallback_secret';
        $signature = hash_hmac('sha256', $payload, $secret);
        return $payload . '.' . $signature;
    }

    private function sendOtpEmail(string $toEmail, string $otp): bool
    {
        try {
            $emailLib = \Config\Services::email();
            $emailLib->initialize($this->smtpConfig());
            $emailLib->setFrom(
                getenv('MAIL_FROM_EMAIL') ?: 'noreply@billingtool.app',
                getenv('MAIL_FROM_NAME')  ?: 'BillingTool'
            );
            $emailLib->setTo($toEmail);
            $emailLib->setSubject('Your BillingTool Verification Code: ' . $otp);
            $emailLib->setMessage($this->buildOtpEmailHtml($otp));
            return $emailLib->send();
        } catch (\Exception $e) {
            log_message('error', '[QuickAccess] sendOtpEmail: ' . $e->getMessage());
            return false;
        }
    }

    private function sendWelcomeEmail(string $toEmail, string $name, string $loginUrl = '', string $trialEndsAt = ''): void
    {
        try {
            $emailLib = \Config\Services::email();
            $emailLib->initialize($this->smtpConfig());
            $emailLib->setFrom(
                getenv('MAIL_FROM_EMAIL') ?: 'noreply@billingtool.app',
                getenv('MAIL_FROM_NAME')  ?: 'BillingTool'
            );
            $emailLib->setTo($toEmail);
            $emailLib->setSubject('Welcome to BillingTool 🎉 – Your account is ready');
            $emailLib->setMessage($this->buildWelcomeEmailHtml($name, $toEmail, $loginUrl, $trialEndsAt));
            $emailLib->send();
        } catch (\Exception $e) {
            log_message('error', '[QuickAccess] sendWelcomeEmail: ' . $e->getMessage());
        }
    }

    private function smtpConfig(): array
    {
        return [
            'protocol'   => getenv('MAIL_PROTOCOL')   ?: 'smtp',
            'SMTPHost'   => getenv('MAIL_HOST')        ?: 'smtp.gmail.com',
            'SMTPPort'   => (int)(getenv('MAIL_PORT')  ?: 587),
            'SMTPUser'   => getenv('MAIL_USERNAME')    ?: '',
            'SMTPPass'   => getenv('MAIL_PASSWORD')    ?: '',
            'SMTPCrypto' => getenv('MAIL_ENCRYPTION')  ?: 'tls',
            'mailType'   => 'html',
            'charset'    => 'utf-8',
            'newline'    => "\r\n",
        ];
    }

    private function buildOtpEmailHtml(string $otp): string
    {
        return <<<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(124,58,237,.1);">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#c026d3);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">BillingTool</h1>
  <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">Quick Access Verification</p>
</td></tr>
<tr><td style="padding:40px;">
  <p style="margin:0 0 16px;color:#374151;font-size:16px;">Here is your one-time verification code:</p>
  <div style="background:#f5f3ff;border:2px solid #ddd6fe;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
    <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#7c3aed;font-family:monospace;">{$otp}</span>
  </div>
  <p style="margin:0;color:#6b7280;font-size:14px;">This code expires in <strong>10 minutes</strong>. Do not share it.</p>
  <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;">
  <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 BillingTool · All rights reserved</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    }

    private function buildWelcomeEmailHtml(string $name, string $email = '', string $loginUrl = '', string $trialEndsAt = ''): string
    {
        if (!$loginUrl) $loginUrl = 'http://localhost:3000';
        $loginLink = $loginUrl . '/login';
        $trialLine = $trialEndsAt
            ? "<p style=\"margin:12px 0 0;color:#374151;font-size:14px;\">Your <strong>14-day free trial</strong> runs until <strong>{$trialEndsAt}</strong>. No credit card needed.</p>"
            : '';
        $emailLine = $email
            ? "<p style=\"margin:12px 0 0;color:#6b7280;font-size:13px;\">Log in anytime with: <strong>{$email}</strong></p>"
            : '';

        return <<<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(124,58,237,.1);">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#c026d3);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">Welcome to BillingTool 🎉</h1>
  <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">Your account is ready to go</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 12px;color:#374151;font-size:16px;">Hi <strong>{$name}</strong>,</p>
  <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Your first invoice is saved and waiting in your dashboard. You can log in from any device using your email — we'll send you a one-time code, no password needed.</p>
  {$trialLine}
  {$emailLine}
  <div style="text-align:center;margin:28px 0;">
    <a href="{$loginLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">Go to Dashboard →</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">If you didn't sign up for BillingTool, you can safely ignore this email.</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;">
  <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 BillingTool · All rights reserved</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    }
}
