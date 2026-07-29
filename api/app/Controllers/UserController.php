<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Models\UserRoleModel;
use App\Services\MailService;
use CodeIgniter\API\ResponseTrait;

class UserController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $model = new UserModel();
        $tenantId = $this->request->tenantId ?? null;
        $users = $model->select('id, name, email, created_at')
                       ->where('tenant_id', $tenantId)
                       ->findAll();

        // Optionally fetch roles for each user (n+1 issue, but acceptable for small scale or can be optimized with join)
        $userRoleModel = new UserRoleModel();
        
        foreach ($users as &$user) {
            $roles = $userRoleModel->builder()
                ->select('roles.id, roles.name, roles.company_type_id')
                ->join('roles', 'roles.id = user_roles.role_id')
                ->where('user_roles.user_id', $user['id'])
                ->get()
                ->getResultArray();
            $user['roles'] = $roles;
        }

        return $this->response->setJSON($users)->setStatusCode(200);
    }

    public function create()
    {
        $model = new UserModel();
        $data = $this->request->getJSON(true);

        // Basic validation
        if (empty($data['email']) || empty($data['name'])) {
            return $this->failValidationError('Name and email are required');
        }

        // Check availability
        if ($model->where('email', $data['email'])->first()) {
            return $this->fail('Email already exists', 409);
        }

        // New users set their own password via the emailed invite link (see sendInviteEmail()).
        // This placeholder hash is random and unguessable, so the account is unusable until then.
        $data['password_hash'] = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
        $data['must_set_password'] = 1;
        unset($data['password']);

        try {
            $id = $model->insert($data);
        } catch (\RuntimeException $e) {
            // Thrown by UsageEnforcement::checkLimits() when the tenant's plan user-seat limit is reached
            return $this->fail($e->getMessage(), 422);
        }
        if (!$id) {
            return $this->failServerError('Failed to create user');
        }

        // Assign roles if provided
        if (isset($data['roles']) && is_array($data['roles'])) {
            $userRoleModel = new UserRoleModel();
            foreach ($data['roles'] as $roleId) {
                $userRoleModel->builder()->insert([
                    'user_id' => $id,
                    'role_id' => $roleId
                ]);
            }
        }

        $this->sendInviteEmail($data['email'], $data['name']);

        return $this->respondCreated(['id' => $id, 'message' => 'User created successfully']);
    }

    /**
     * Send the newly added user their username and a link to set their own password,
     * reusing the same password_resets token mechanism as Auth::forgotPassword().
     */
    private function sendInviteEmail(string $email, string $name): void
    {
        $token = bin2hex(random_bytes(32));
        \Config\Database::connect()->table('password_resets')->insert([
            'email'      => $email,
            'token'      => $token,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $tenant = $this->request->tenant ?? null;
        $frontendDomain = getenv('FRONTEND_DOMAIN') ?: ($_ENV['FRONTEND_DOMAIN'] ?? 'localhost');
        $frontendPort   = getenv('FRONTEND_PORT') ?: ($_ENV['FRONTEND_PORT'] ?? '');
        $protocol       = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');

        $subdomain   = $tenant->subdomain ?? '';
        $companyName = $tenant->company_name ?? 'BillingTool';
        $portSuffix  = $frontendPort ? ":{$frontendPort}" : '';
        $base        = "{$protocol}://{$subdomain}.{$frontendDomain}{$portSuffix}";

        $setPasswordUrl = "{$base}/#reset-password/{$token}";
        $loginUrl       = "{$base}/#login";

        $mailer = new MailService();
        $mailer->send(
            $email,
            "You've been added to {$companyName} on BillingTool",
            $this->buildInviteEmailHtml($name, $companyName, $email, $setPasswordUrl, $loginUrl)
        );
    }

    private function buildInviteEmailHtml(string $name, string $companyName, string $email, string $setPasswordUrl, string $loginUrl): string
    {
        $name        = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        $companyName = htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8');
        $email       = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
        $setPasswordUrl = htmlspecialchars($setPasswordUrl, ENT_QUOTES, 'UTF-8');
        $loginUrl       = htmlspecialchars($loginUrl, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,.12);">
  <tr><td style="background:linear-gradient(135deg,#7c3aed,#c026d3);padding:32px 48px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Welcome to {$companyName}</h1>
    <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">Your BillingTool account is ready</p>
  </td></tr>
  <tr><td style="padding:36px 48px;color:#111827;font-size:14px;line-height:1.6;">
    <p>Hi {$name},</p>
    <p>An account has been created for you on <strong>{$companyName}</strong>'s BillingTool workspace. Here's how to get started:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Your username</td><td style="padding:8px 0;font-weight:600;">{$email}</td></tr>
    </table>
    <p style="text-align:center;margin:28px 0;">
      <a href="{$setPasswordUrl}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Set Your Password</a>
    </p>
    <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If it expires, use "Forgot password" on the <a href="{$loginUrl}">login page</a> to request a new one.</p>
    <p style="margin-top:24px;"><strong>Quick start guide:</strong></p>
    <ol style="padding-left:20px;color:#374151;">
      <li>Set your password using the button above.</li>
      <li>Log in at the workspace login page with your email and new password.</li>
      <li>Check your dashboard for the tasks, invoices, or records assigned to your role.</li>
      <li>Questions? Contact the admin who added you to {$companyName}.</li>
    </ol>
  </td></tr>
  <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 48px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">BillingTool · Account Invitation</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
    }

    public function update($id = null)
    {
        $model = new UserModel();
        $userRoleModel = new UserRoleModel();
        $data = $this->request->getJSON(true);

        if (!$model->find($id)) {
            return $this->failNotFound('User not found');
        }

        try {
            $updateData = [];
            
            // Handle basic info update
            if (!empty($data['name'])) {
                $updateData['name'] = $data['name'];
            }
            // Check email uniqueness if changed
            if (!empty($data['email'])) {
                // Verify unique if different
                $existing = $model->where('email', $data['email'])->first();
                if ($existing && $existing['id'] != $id) {
                     return $this->fail('Email already in use', 409);
                }
                $updateData['email'] = $data['email'];
            }

            // Handle password update if provided
            if (!empty($data['password'])) {
                $updateData['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            if (!empty($updateData)) {
                $model->update($id, $updateData);
            }

            // Sync roles if provided
            if (isset($data['roles']) && is_array($data['roles'])) {
                // Delete existing
                $userRoleModel->builder()->where('user_id', $id)->delete();
                
                // Insert new
                foreach ($data['roles'] as $roleId) {
                    $userRoleModel->builder()->insert([
                        'user_id' => $id,
                        'role_id' => $roleId
                    ]);
                }
            }
            
            return $this->response->setJSON(['id' => $id, 'message' => 'User updated'])->setStatusCode(200);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to update user: ' . $e->getMessage());
        }
    }
}
