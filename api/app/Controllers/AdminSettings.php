<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CompanyProfileModel;

class AdminSettings extends ResourceController
{
    use ResponseTrait;

    /**
     * Get all admin settings
     * GET /api/admin/settings
     */
    public function index()
    {
        try {

            $db = \Config\Database::connect();
            
            // Get platform company details
            $platformModel = new \App\Models\PlatformCompanyDetailsModel();
            $companyProfile = $platformModel->first();

            // If it doesn't exist, create a default one
            if (!$companyProfile) {
                $defaultProfile = [
                    'name' => 'BillingTool Platform',
                    'street' => '123 Business Avenue',
                    'city' => 'Antwerp',
                    'postal_code' => '2000',
                    'country' => 'BE',
                    'email' => 'admin@billingtool.com',
                    'phone' => '+32 3 123 45 67',
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                $platformModel->insert($defaultProfile);
                $companyProfile = $platformModel->first();
            }

            // Get API Keys
            $apiKeys = $db->table('api_keys')->get()->getResultArray();

            // Mask Telegram bot token — never return the raw secret
            if (!empty($companyProfile['telegram_bot_token'])) {
                $companyProfile['telegram_bot_token_set'] = true;
                $companyProfile['telegram_bot_token'] = str_repeat('•', 8)
                    . substr($companyProfile['telegram_bot_token'], -4);
            } else {
                $companyProfile['telegram_bot_token_set'] = false;
            }

            return $this->respond([
                'success' => true,
                'data' => [
                    'companyProfile' => $companyProfile,
                    'apiKeys' => $apiKeys,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch settings: ' . $e->getMessage());
        }
    }

    /**
     * Update admin profile
     * PUT /api/admin/settings/profile
     */
    public function updateProfile()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $data = $this->request->getJSON(true);
        $model = new \App\Models\AdminUserModel();

        $updateData = [];
        if (isset($data['name'])) $updateData['name'] = $data['name'];
        if (isset($data['email'])) $updateData['email'] = $data['email'];

        $model->update($admin['id'], $updateData);

        return $this->respond(['success' => true, 'message' => 'Profile updated']);
    }

    /**
     * Change password
     * POST /api/admin/settings/password
     */
    public function changePassword()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $data = $this->request->getJSON(true);
        $model = new \App\Models\AdminUserModel();
        $user = $model->find($admin['id']);

        if (!password_verify($data['currentPassword'], $user['password'])) {
            return $this->fail('Current password is incorrect');
        }

        $model->update($admin['id'], [
            'password' => password_hash($data['newPassword'], PASSWORD_DEFAULT)
        ]);

        return $this->respond(['success' => true, 'message' => 'Password changed']);
    }

    /**
     * Update system settings (company profile)
     * PUT /api/admin/settings/system
     */
    public function updateSystemSettings()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $data = $this->request->getJSON(true);
        $platformModel = new \App\Models\PlatformCompanyDetailsModel();
        
        // Get existing record or create new one
        $existing = $platformModel->first();
        
        $updateData = [
            'name' => $data['name'] ?? '',
            'vat_id' => $data['vat_id'] ?? null,
            'street' => $data['street'] ?? '',
            'city' => $data['city'] ?? '',
            'postal_code' => $data['postal_code'] ?? '',
            'country' => $data['country'] ?? '',
            'email' => $data['email'] ?? '',
            'phone' => $data['phone'] ?? '',
            'bank_iban' => $data['bank_iban'] ?? null,
            'bank_bic' => $data['bank_bic'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'updated_at' => date('Y-m-d H:i:s')
        ];

        // Telegram settings — only write token if user supplied a new non-masked value
        if (isset($data['telegram_chat_id'])) {
            $updateData['telegram_chat_id'] = $data['telegram_chat_id'] ?: null;
        }
        if (isset($data['telegram_enabled'])) {
            $updateData['telegram_enabled'] = (int)(bool)$data['telegram_enabled'];
        }
        if (!empty($data['telegram_bot_token']) && !str_contains($data['telegram_bot_token'], '•')) {
            $updateData['telegram_bot_token'] = $data['telegram_bot_token'];
        }

        if ($existing) {
            $platformModel->update($existing['id'], $updateData);
        } else {
            $platformModel->insert($updateData);
        }

        return $this->respond(['success' => true, 'message' => 'System settings updated']);
    }

    /**
     * Generate new API key
     * POST /api/admin/settings/api-keys
     */
    public function generateApiKey()
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $newKey = [
            'name' => $data['name'],
            'key' => bin2hex(random_bytes(32)),
            'created_at' => date('Y-m-d H:i:s'),
            'status' => 'active'
        ];

        $db->table('api_keys')->insert($newKey);
        $insertId = $db->insertID();
        $newKey['id'] = $insertId;

        return $this->respond(['success' => true, 'data' => $newKey]);
    }

    /**
     * Revoke API key
     * DELETE /api/admin/settings/api-keys/(:segment)
     */
    public function revokeApiKey($id = null)
    {
        $admin = AdminAuth::getAuthenticatedUser($this->request);
        if (!$admin) return $this->failUnauthorized();

        $db = \Config\Database::connect();
        $db->table('api_keys')->where('id', $id)->delete();

        return $this->respond(['success' => true, 'message' => 'API key revoked']);
    }

    /**
     * Send a test message to verify Telegram configuration.
     * POST /api/admin/settings/test-telegram
     */
    public function testTelegram()
    {
        $svc = new \App\Services\TelegramService();

        if (!$svc->isConfigured()) {
            return $this->fail('Telegram is not configured. Set a Bot Token, Chat ID, and enable it first.', 400);
        }

        $ok = $svc->send(
            "✅ <b>BillingTool Test Message</b>\n\nTelegram notifications are configured correctly."
        );

        if ($ok) {
            return $this->respond(['success' => true, 'message' => 'Test message sent successfully']);
        }
        return $this->fail('Failed to send test message. Check the Bot Token and Chat ID.', 500);
    }

    /**
     * Send a test email to verify SMTP configuration.
     * POST /api/admin/settings/test-email
     */
    public function testEmail()
    {
        $data = $this->request->getJSON(true);
        $to   = $data['email'] ?? null;

        if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return $this->fail('A valid recipient email is required.');
        }

        $emailService = \Config\Services::email();
        $emailService->initialize($this->smtpConfig());

        $fromEmail = getenv('MAIL_FROM_EMAIL') ?: 'noreply@billingtool.com';
        $fromName  = getenv('MAIL_FROM_NAME')  ?: 'BillingTool';

        $emailService->setFrom($fromEmail, $fromName);
        $emailService->setTo($to);
        $emailService->setSubject('BillingTool SMTP Test');
        $emailService->setMailType('html');
        $emailService->setMessage(
            '<p>This is a test email sent from <strong>BillingTool</strong> to confirm your SMTP configuration is working.</p>'
            . '<p>Sent at: ' . date('Y-m-d H:i:s') . '</p>'
        );

        if ($emailService->send()) {
            return $this->respond(['success' => true, 'message' => "Test email sent to {$to}"]);
        }

        return $this->fail('SMTP send failed: ' . $emailService->printDebugger(['headers']));
    }

    /**
     * Return a system health snapshot.
     * GET /api/admin/settings/health
     */
    public function health()
    {
        $checks = [];

        // Database connectivity
        try {
            $db = \Config\Database::connect();
            $db->query('SELECT 1');
            $checks['database'] = ['status' => 'ok', 'message' => 'Connected'];
        } catch (\Throwable $e) {
            $checks['database'] = ['status' => 'error', 'message' => $e->getMessage()];
        }

        // Disk space (ROOTPATH partition)
        $free  = disk_free_space(ROOTPATH);
        $total = disk_total_space(ROOTPATH);
        $usedPct = $total > 0 ? round(($total - $free) / $total * 100, 1) : 0;
        $checks['disk'] = [
            'status'  => $usedPct < 90 ? 'ok' : 'warning',
            'message' => round($free / 1073741824, 2) . ' GB free (' . $usedPct . '% used)',
        ];

        // Mail configuration
        $smtpHost = getenv('MAIL_HOST') ?: '';
        $checks['mail'] = [
            'status'  => $smtpHost ? 'ok' : 'warning',
            'message' => $smtpHost ? "SMTP host: {$smtpHost}" : 'MAIL_HOST not configured',
        ];

        // Gemini API key
        $geminiKey = getenv('GEMINI_API_KEY') ?: getenv('GOOGLE_API_KEY') ?: '';
        $checks['gemini'] = [
            'status'  => $geminiKey ? 'ok' : 'warning',
            'message' => $geminiKey ? 'API key present (' . strlen($geminiKey) . ' chars)' : 'GEMINI_API_KEY not set',
        ];

        // PHP version
        $checks['php'] = [
            'status'  => version_compare(PHP_VERSION, '8.1.0', '>=') ? 'ok' : 'warning',
            'message' => 'PHP ' . PHP_VERSION,
        ];

        $hasError   = array_reduce($checks, fn($carry, $c) => $carry || $c['status'] === 'error',   false);
        $hasWarning = array_reduce($checks, fn($carry, $c) => $carry || $c['status'] === 'warning', false);
        $overall = $hasError ? 'error' : ($hasWarning ? 'warning' : 'ok');

        return $this->respond(['overall' => $overall, 'checks' => $checks]);
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
}
