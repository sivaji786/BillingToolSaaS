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
}
