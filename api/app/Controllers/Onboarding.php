<?php

namespace App\Controllers;

use App\Models\TenantModel;
use App\Models\UserModel;
use App\Models\SubscriptionModel;
use CodeIgniter\API\ResponseTrait;
use Exception;

class Onboarding extends BaseController
{
    use ResponseTrait;

    public function signup()
    {
        $rules = [
            'company_name' => 'required|min_length[3]|max_length[100]',
            'subdomain' => 'required|min_length[3]|max_length[50]|alpha_dash|is_unique[tenants.subdomain]',
            'email' => 'required|valid_email|is_unique[users.email]', // user email might need to be unique globally? Yes usually.
            'password' => 'required|min_length[8]',
        ];
        
        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }
        
        $db = \Config\Database::connect();
        $db->transStart();
        
        try {
            // 1. Create tenant
            $tenantModel = new TenantModel();
            $tenantId = $tenantModel->insert([
                'company_name' => $this->request->getPost('company_name'),
                'subdomain' => strtolower($this->request->getPost('subdomain')),
                'plan_id' => 1, // Default to Starter plan ID 1
                'status' => 'active',
                'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+14 days'))
            ]);
            
            if (!$tenantId) {
                // Return model errors if insert failed
                 return $this->fail($tenantModel->errors());
            }

            // 2. Create owner user
            // NOTE: UserModel uses TenantScope. We need to manually inject tenant_id if we are outside context?
            // BUT TenantScope works on find, update... insert logic in TenantScope automatically adds tenant_id from config.
            // Here, we don't have config set yet because it's signup.
            // So we must manually set tenant_id in data.
            // And ensure UserModel doesn't overwrite it with null if config is null.
            
            // Checking TenantScope trait: 
            /*
            if ($tenant) {
               if (!isset($data['data']['tenant_id'])) {
                   $data['data']['tenant_id'] = $tenant['id'];
               }
            }
            */
            // So if $tenant is null (which it is for signup), it won't touch it. Perfect.
            
            $userModel = new UserModel();
            $userData = [
                'tenant_id' => $tenantId,
                'email' => $this->request->getPost('email'),
                'password_hash' => password_hash($this->request->getPost('password'), PASSWORD_BCRYPT),
                'name' => 'Admin', // Default name or ask in form?
                'role' => 'admin',
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $userId = $userModel->insert($userData);
            
            if (!$userId) {
                 // Check if it failed due to unique email?
                 // But rule checked it. 
                 throw new Exception(implode(', ', $userModel->errors()));
            }
            
            // 3. Create trial subscription
            $subscriptionModel = new SubscriptionModel();
            $subData = [
                'tenant_id' => $tenantId,
                'plan_id' => 1,
                'status' => 'trialing',
                'current_period_start' => date('Y-m-d H:i:s'),
                'current_period_end' => date('Y-m-d H:i:s', strtotime('+14 days')),
                'created_at' => date('Y-m-d H:i:s')
            ];
            $subscriptionModel->insert($subData);
            
            $db->transComplete();
            
            if ($db->transStatus() === false) {
                throw new Exception('Database transaction failed');
            }
            
            // In dev, usage of .localhost might be implied.
            $subdomain = strtolower($this->request->getPost('subdomain'));
            // Construct redirect URL based on env
            // Simple logic: protocol + subdomain + base domain
            // Here we just return subdomain.
            
            return $this->respond([
                'success' => true,
                'message' => 'Account created successfully!',
                'subdomain' => $subdomain,
                'redirect_url' => "http://{$subdomain}.localhost:8080" // Construct appropriate URL
            ]);
            
        } catch (Exception $e) {
            $db->transRollback();
            return $this->fail('Failed to create account: ' . $e->getMessage());
        }
    }
    
    public function checkSubdomain()
    {
        $subdomain = $this->request->getGet('subdomain');
        
        if (empty($subdomain)) {
             return $this->fail('Subdomain required');
        }
        
        // Validate format
        if (!preg_match('/^[a-z0-9-]+$/', $subdomain)) {
            return $this->respond([
                'available' => false,
                'message' => 'Invalid characters'
            ]);
        }
        
        // Reserved
        $reserved = ['www', 'api', 'admin', 'app', 'mail', 'demo', 'billingtool'];
        if (in_array($subdomain, $reserved)) {
             return $this->respond([
                'available' => false,
                'message' => 'Reserved'
            ]);
        }
        
        $tenantModel = new TenantModel();
        $exists = $tenantModel->where('subdomain', $subdomain)->first();
        
        return $this->respond([
            'available' => !$exists,
            'message' => $exists ? 'Taken' : 'Available'
        ]);
    }
}
