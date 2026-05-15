<?php

namespace App\Controllers;

use App\Models\TenantModel;
use App\Models\UserModel;
use App\Models\SubscriptionModel;
use App\Models\RoleModel;
use App\Models\UserRoleModel;
use App\Models\CompanyTypeModel;
use App\Models\CompanyProfileModel;
use App\Helpers\JWTHelper;
use CodeIgniter\API\ResponseTrait;
use Exception;

class Onboarding extends BaseController
{
    use ResponseTrait;

    public function signup()
    {
        $rules = [
            'company_name' => 'required|min_length[3]|max_length[100]',
            'email'        => 'required|valid_email|is_unique[users.email]',
            'password'     => 'required|min_length[8]',
        ];

        $input = $this->request->getJSON(true);

        if (empty($input)) {
             $this->response->setStatusCode(400);
             return $this->respond(['message' => 'No data provided']);
        }

        log_message('info', 'Signup Payload: ' . json_encode(array_diff_key($input, ['password' => ''])));

        $validation = \Config\Services::validation();
        $validation->setRules($rules);

        if (!$validation->run($input)) {
            log_message('error', 'Signup Validation Errors: ' . json_encode($validation->getErrors()));
            return $this->fail($validation->getErrors());
        }

        // Resolve subdomain: use provided value or auto-generate from company name
        $subdomain = $this->resolveSubdomain($input['subdomain'] ?? '', $input['company_name']);

        $db = \Config\Database::connect();
        $db->transStart();

        try {
            log_message('info', 'Step 1: Creating tenant');
            $tenantModel = new TenantModel();
            $tenantData = [
                'company_name' => $input['company_name'],
                'website'      => $input['website'] ?? null,
                'subdomain'    => $subdomain,
                'plan_id'      => $input['plan_id'] ?? 1,
                'status'       => 'active',
            ];

            $tenantId = $tenantModel->insert($tenantData);

            if (!$tenantId) {
                 $errors = json_encode($tenantModel->errors());
                 log_message('error', 'Tenant Insert Failed: ' . $errors);
                 throw new Exception('Tenant creation failed: ' . $errors);
            }

            log_message('info', 'Step 2: Creating user');
            $userModel = new UserModel();
            $userData = [
                'tenant_id'      => $tenantId,
                'email'          => $input['email'],
                'password_hash'  => password_hash($input['password'], PASSWORD_BCRYPT),
                'name'           => 'Admin',
                'role'           => 'admin',
                'email_verified' => 0,
                'created_at'     => date('Y-m-d H:i:s')
            ];

            $userId = $userModel->insert($userData);

            if (!$userId) {
                 $errors = json_encode($userModel->errors());
                 log_message('error', 'User Insert Failed: ' . $errors);
                 throw new Exception('User creation failed: ' . $errors);
            }

            log_message('info', 'Step 3: Determining Company Type and Role');
            $companyTypeModel = new CompanyTypeModel();
            $companyType = $companyTypeModel->where('name', 'Technology / Automation')->first();
            if (!$companyType) {
                $companyType = $companyTypeModel->first();
            }
            $companyTypeId = $companyType ? $companyType['id'] : 1;

            $roleModel = new RoleModel();
            $role = $roleModel->where([
                'company_type_id' => $companyTypeId,
                'name' => 'Admin'
            ])->first();

            if (!$role) {
                $role = $roleModel->where('name', 'Admin')->first();
            }
            if (!$role) {
                $role = $roleModel->first();
            }
            if (!$role) {
                throw new Exception('No available roles found in system');
            }

            $userRoleModel = new UserRoleModel();
            try {
                $userRoleModel->builder()->insert([
                    'user_id' => $userId,
                    'role_id' => $role['id']
                ]);
            } catch (Exception $e) {
                throw new Exception('Role assignment failed: ' . $e->getMessage());
            }

            log_message('info', 'Step 4: Creating company profile');
            $companyProfileModel = new CompanyProfileModel();
            $profileData = [
                'tenant_id'       => $tenantId,
                'company_type_id' => $companyTypeId,
                'name'            => $input['company_name'],
                'email'           => $input['email'],
                'country'         => $input['country'] ?? 'India',
                'city'            => $input['city'] ?? 'Unknown',
                'street'          => $input['address'] ?? 'Unknown',
                'postal_code'     => $input['postal_code'] ?? '000000',
            ];

            if (!$companyProfileModel->insert($profileData)) {
                $errors = json_encode($companyProfileModel->errors());
                throw new Exception('Company profile creation failed: ' . $errors);
            }

            log_message('info', 'Step 5: Creating subscription');
            $subscriptionModel = new SubscriptionModel();
            $subData = [
                'tenant_id'            => $tenantId,
                'plan_id'              => $tenantData['plan_id'],
                'status'               => 'active',
                'current_period_start' => date('Y-m-d H:i:s'),
                'current_period_end'   => date('Y-m-d H:i:s', strtotime('+1 year')),
                'created_at'           => date('Y-m-d H:i:s')
            ];
            if (!$subscriptionModel->insert($subData)) {
                $errors = json_encode($subscriptionModel->errors());
                throw new Exception('Subscription creation failed: ' . $errors);
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                throw new Exception('Database transaction failed at commit');
            }

            // Generate and store verification token
            $verificationCode = $this->generateVerificationCode($input['email']);

            $this->sendWelcomeEmail($input['email'], $input['company_name']);
            $this->sendVerificationEmail($input['email'], $input['company_name'], $verificationCode);

            return $this->response->setJSON([
                'success'          => true,
                'message'          => 'Account created. Please verify your email.',
                'needs_verification' => true,
                'email'            => $input['email'],
            ])->setStatusCode(200);

        } catch (Exception $e) {
            $db->transRollback();
            log_message('error', 'Signup Exception: ' . $e->getMessage());
            return $this->fail('Failed to create account: ' . $e->getMessage());
        }
    }

    public function verifyEmail()
    {
        $input = $this->request->getJSON(true);

        if (empty($input['email']) || empty($input['code'])) {
            return $this->fail('Email and verification code are required');
        }

        $db = \Config\Database::connect();
        $record = $db->table('email_verification_tokens')
            ->where('email', $input['email'])
            ->where('token', $input['code'])
            ->get()->getRowArray();

        if (!$record) {
            return $this->fail('Invalid verification code');
        }

        // Expire after 24 hours
        if (time() - strtotime($record['created_at']) > 86400) {
            $db->table('email_verification_tokens')->where('email', $input['email'])->delete();
            return $this->fail('Verification code has expired. Please request a new one.');
        }

        $db->table('email_verification_tokens')->where('email', $input['email'])->delete();

        $userModel = new UserModel();
        $user = $userModel->withoutTenant()->where('email', $input['email'])->first();

        if (!$user) {
            return $this->fail('User not found');
        }

        $userModel->withoutTenant()->update($user['id'], ['email_verified' => 1, 'last_login' => date('Y-m-d H:i:s')]);

        $tenantModel = new TenantModel();
        $tenant = $tenantModel->find($user['tenant_id']);

        if (!$tenant || $tenant['status'] !== 'active') {
            return $this->fail('Tenant account is not active');
        }

        $token = JWTHelper::generateToken($user['id'], $user['tenant_id'], $user['email'], $user['name'], 'customer');

        $frontendDomain = getenv('FRONTEND_DOMAIN') ?: ($_ENV['FRONTEND_DOMAIN'] ?? 'localhost');
        $frontendPort   = getenv('FRONTEND_PORT')   ?: ($_ENV['FRONTEND_PORT']   ?? '');
        $protocol       = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
        $portSuffix     = $frontendPort ? ":{$frontendPort}" : '';
        $redirectUrl    = "{$protocol}://{$tenant['subdomain']}.{$frontendDomain}{$portSuffix}/?token={$token}#/dashboard";

        unset($user['password_hash']);

        return $this->response->setJSON([
            'success'      => true,
            'message'      => 'Email verified successfully',
            'token'        => $token,
            'user'         => $user,
            'tenant'       => $tenant,
            'redirect_url' => $redirectUrl,
        ])->setStatusCode(200);
    }

    public function resendVerification()
    {
        $input = $this->request->getJSON(true);

        if (empty($input['email'])) {
            return $this->fail('Email is required');
        }

        $userModel = new UserModel();
        $user = $userModel->withoutTenant()->where('email', $input['email'])->first();

        if (!$user) {
            // Silently succeed to prevent email enumeration
            return $this->response->setJSON(['success' => true])->setStatusCode(200);
        }

        if ($user['email_verified']) {
            return $this->fail('Email is already verified');
        }

        $db = \Config\Database::connect();
        // Rate limit: max 3 resends in 15 minutes
        $recentCount = $db->table('email_verification_tokens')
            ->where('email', $input['email'])
            ->where('created_at >=', date('Y-m-d H:i:s', time() - 900))
            ->countAllResults();

        if ($recentCount >= 3) {
            return $this->fail('Too many requests. Please wait 15 minutes before requesting another code.');
        }

        $verificationCode = $this->generateVerificationCode($input['email']);
        $tenantModel = new TenantModel();
        $tenant = $tenantModel->find($user['tenant_id']);
        $companyName = $tenant['company_name'] ?? 'there';

        $this->sendVerificationEmail($input['email'], $companyName, $verificationCode);

        return $this->response->setJSON(['success' => true, 'message' => 'Verification code sent'])->setStatusCode(200);
    }

    private function resolveSubdomain(string $requested, string $companyName): string
    {
        $tenantModel = new TenantModel();
        $reserved = ['www', 'api', 'admin', 'app', 'mail', 'demo', 'billingtool'];

        // Slugify a base string
        $slugify = function (string $s): string {
            return trim(preg_replace('/-+/', '-', preg_replace('/[^a-z0-9]/', '-', strtolower($s))), '-');
        };

        // Start from provided value, fall back to company name
        $base = $requested !== '' ? $slugify($requested) : $slugify($companyName);

        // Ensure min length
        if (strlen($base) < 3) {
            $base = 'workspace';
        }

        // Truncate to 46 chars so suffix fits within 50
        $base = substr($base, 0, 46);

        // Find a unique, non-reserved slug
        $candidate = $base;
        $attempt   = 0;
        while (true) {
            if (!in_array($candidate, $reserved) && !$tenantModel->where('subdomain', $candidate)->first()) {
                return $candidate;
            }
            $attempt++;
            $candidate = $base . $attempt;
        }
    }

    public function checkSubdomain()
    {
        $subdomain = $this->request->getGet('subdomain');

        if (empty($subdomain)) {
             return $this->fail('Subdomain required');
        }

        if (!preg_match('/^[a-z0-9-]+$/', $subdomain)) {
            return $this->response->setJSON([
                'available' => false,
                'message' => 'Invalid characters'
            ])->setStatusCode(200);
        }

        $reserved = ['www', 'api', 'admin', 'app', 'mail', 'demo', 'billingtool'];
        if (in_array($subdomain, $reserved)) {
             return $this->response->setJSON([
                'available' => false,
                'message' => 'Reserved'
            ])->setStatusCode(200);
        }

        $tenantModel = new TenantModel();
        $exists = $tenantModel->where('subdomain', $subdomain)->first();

        return $this->response->setJSON([
            'available' => !$exists,
            'message' => $exists ? 'Taken' : 'Available'
        ])->setStatusCode(200);
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private function generateVerificationCode(string $email): string
    {
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $db = \Config\Database::connect();
        $db->table('email_verification_tokens')->where('email', $email)->delete();
        $db->table('email_verification_tokens')->insert([
            'email'      => $email,
            'token'      => $code,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $code;
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

    private function sendWelcomeEmail(string $toEmail, string $companyName): void
    {
        try {
            $emailLib = \Config\Services::email();
            $emailLib->initialize($this->smtpConfig());
            $fromEmail = getenv('MAIL_FROM_EMAIL') ?: 'noreply@billingtool.app';
            $fromName  = getenv('MAIL_FROM_NAME')  ?: 'BillingTool';
            $emailLib->setFrom($fromEmail, $fromName);
            $emailLib->setTo($toEmail);
            $emailLib->setSubject('Welcome to BillingTool – Your workspace is ready!');
            $emailLib->setMessage($this->buildWelcomeEmailHtml($companyName, $toEmail));
            $emailLib->send();
        } catch (\Exception $e) {
            log_message('error', '[Onboarding] sendWelcomeEmail: ' . $e->getMessage());
        }
    }

    private function sendVerificationEmail(string $toEmail, string $companyName, string $code): void
    {
        try {
            $emailLib = \Config\Services::email();
            $emailLib->initialize($this->smtpConfig());
            $fromEmail = getenv('MAIL_FROM_EMAIL') ?: 'noreply@billingtool.app';
            $fromName  = getenv('MAIL_FROM_NAME')  ?: 'BillingTool';
            $emailLib->setFrom($fromEmail, $fromName);
            $emailLib->setTo($toEmail);
            $emailLib->setSubject('Verify your email – BillingTool');
            $emailLib->setMessage($this->buildVerificationEmailHtml($companyName, $code));
            $emailLib->send();
        } catch (\Exception $e) {
            log_message('error', '[Onboarding] sendVerificationEmail: ' . $e->getMessage());
        }
    }

    private function buildWelcomeEmailHtml(string $companyName, string $email): string
    {
        return <<<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,.12);">
  <tr><td style="background:linear-gradient(135deg,#7c3aed,#c026d3);padding:36px 48px;text-align:center;">
    <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:12px;padding:12px 16px;margin-bottom:16px;">
      <span style="font-size:28px;">📄</span>
    </div>
    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">Welcome to BillingTool!</h1>
    <p style="margin:8px 0 0;color:#e9d5ff;font-size:15px;">Your workspace is ready</p>
  </td></tr>
  <tr><td style="padding:40px 48px;">
    <p style="margin:0 0 16px;color:#374151;font-size:16px;">Hi <strong>{$companyName}</strong>,</p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
      Your BillingTool workspace is set up. Start creating professional invoices, managing clients, and tracking payments — all in one place.
    </p>
    <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Your account email: <strong style="color:#374151;">{$email}</strong></p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">You can explore all features within the limits of your current plan. Upgrade anytime from your dashboard.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 48px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 BillingTool · All rights reserved</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    }

    private function buildVerificationEmailHtml(string $companyName, string $code): string
    {
        return <<<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,.12);">
  <tr><td style="background:linear-gradient(135deg,#7c3aed,#c026d3);padding:36px 48px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Verify Your Email Address</h1>
    <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">One last step before you get started</p>
  </td></tr>
  <tr><td style="padding:40px 48px;">
    <p style="margin:0 0 20px;color:#374151;font-size:16px;">Hi <strong>{$companyName}</strong>,</p>
    <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.7;">
      Enter the 6-digit code below in the registration form to verify your email address and access your dashboard.
    </p>
    <div style="background:#f5f3ff;border:2px solid #ddd6fe;border-radius:12px;padding:28px;text-align:center;margin:0 0 28px;">
      <p style="margin:0 0 8px;color:#7c3aed;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
      <span style="font-size:44px;font-weight:800;letter-spacing:12px;color:#7c3aed;font-family:monospace;">{$code}</span>
    </div>
    <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">⏱ This code expires in <strong>24 hours</strong>.</p>
    <p style="margin:0;color:#9ca3af;font-size:13px;">If you did not create a BillingTool account, you can safely ignore this email.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 48px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 BillingTool · All rights reserved</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    }
}
