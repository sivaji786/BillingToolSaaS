<?php

namespace App\Controllers;

use App\Models\TenantModel;
use App\Models\UserModel;
use App\Models\SubscriptionModel;
use App\Models\RoleModel;
use App\Models\UserRoleModel;
use App\Models\CompanyTypeModel;
use App\Models\CompanyProfileModel;
use CodeIgniter\API\ResponseTrait;
use Exception;

class Onboarding extends BaseController
{
    use ResponseTrait;

    public function signup()
    {
        $rules = [
            'company_name' => 'required|min_length[3]|max_length[100]',
            'website' => 'permit_empty|valid_url_strict',
            'subdomain' => 'required|min_length[3]|max_length[50]|alpha_dash|is_unique[tenants.subdomain]',
            'email' => 'required|valid_email|is_unique[users.email]', // user email might need to be unique globally? Yes usually.
            'password' => 'required|min_length[8]',
        ];
        
        // Get raw JSON input
        $input = $this->request->getJSON(true);
        
        if (empty($input)) {
             $this->response->setStatusCode(400);
             return $this->respond(['message' => 'No data provided']);
        }

        // Log incoming data for debugging
        log_message('error', 'Signup Payload: ' . json_encode($input));
        
        $validation = \Config\Services::validation();
        $validation->setRules($rules);

        if (!$validation->run($input)) {
            log_message('error', 'Signup Validation Errors: ' . json_encode($validation->getErrors()));
            return $this->fail($validation->getErrors());
        }
        
        $db = \Config\Database::connect();
        $db->transStart();
        
        try {
            // 1. Create tenant
            log_message('info', 'Step 1: Creating tenant');
            $tenantModel = new TenantModel();
            $tenantData = [
                'company_name' => $input['company_name'],
                'website'      => $input['website'] ?? null,
                'subdomain'    => strtolower($input['subdomain']),
                'plan_id'      => $input['plan_id'] ?? 1, 
                'status'       => 'active',
                'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+14 days'))
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
                'tenant_id' => $tenantId,
                'email' => $input['email'],
                'password_hash' => password_hash($input['password'], PASSWORD_BCRYPT),
                'name' => 'Admin', 
                'role' => 'admin',
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $userId = $userModel->insert($userData);
            
            if (!$userId) {
                 $errors = json_encode($userModel->errors());
                 log_message('error', 'User Insert Failed: ' . $errors);
                 throw new Exception('User creation failed: ' . $errors);
            }
            
            // 2b. Determine Company Type and Assign Role
            log_message('info', 'Step 3: Determining Company Type and Role');
            
            // Look up "Technology / Automation" as default company type if not specified
            $companyTypeModel = new CompanyTypeModel();
            $companyType = $companyTypeModel->where('name', 'Technology / Automation')->first();
            if (!$companyType) {
                $companyType = $companyTypeModel->first();
            }
            $companyTypeId = $companyType ? $companyType['id'] : 1;

            // Look up "Admin" role for this company type
            $roleModel = new RoleModel();
            $role = $roleModel->where([
                'company_type_id' => $companyTypeId,
                'name' => 'Admin'
            ])->first();
            
            // Fallback: search for any Admin role if specific one not found
            if (!$role) {
                $role = $roleModel->where('name', 'Admin')->first();
            }
            
            // Fallback 2: search for any role at all if no Admin found
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
                log_message('info', "Assigned role ID {$role['id']} ({$role['name']}) to user ID {$userId}");
            } catch (Exception $e) {
                log_message('error', 'UserRole Insert Failed: ' . $e->getMessage());
                throw new Exception('Role assignment failed: ' . $e->getMessage());
            }
            
            // 2c. Create Default Company Profile
            log_message('info', 'Step 4: Creating company profile');
            $companyProfileModel = new CompanyProfileModel();
            $profileData = [
                'tenant_id' => $tenantId,
                'company_type_id' => $companyTypeId,
                'name' => $input['company_name'],
                'email' => $input['email'],
                'country' => $input['country'] ?? 'India',
                'city' => $input['city'] ?? 'Unknown',
                'street' => $input['address'] ?? 'Unknown',
                'postal_code' => $input['postal_code'] ?? '000000',
            ];
            
            if (!$companyProfileModel->insert($profileData)) {
                $errors = json_encode($companyProfileModel->errors());
                log_message('error', 'Company Profile Insert Failed: ' . $errors);
                throw new Exception('Company profile creation failed: ' . $errors);
            }

            // 3. Create trial subscription
            log_message('info', 'Step 5: Creating subscription');
            $subscriptionModel = new SubscriptionModel();
            $subData = [
                'tenant_id' => $tenantId,
                'plan_id' => $tenantData['plan_id'],
                'status' => 'trialing',
                'current_period_start' => date('Y-m-d H:i:s'),
                'current_period_end' => date('Y-m-d H:i:s', strtotime('+14 days')),
                'created_at' => date('Y-m-d H:i:s')
            ];
            if (!$subscriptionModel->insert($subData)) {
                $errors = json_encode($subscriptionModel->errors());
                log_message('error', 'Subscription Insert Failed: ' . $errors);
                throw new Exception('Subscription creation failed: ' . $errors);
            }
            
            $db->transComplete();
            
            if ($db->transStatus() === false) {
                throw new Exception('Database transaction failed at commit');
            }
            
            // Re-fetch tenant to get the generated UUID
            $createdTenant = $tenantModel->find($tenantId);
            $tenantUuid = $createdTenant['uuid'];
            $subdomain = strtolower($input['subdomain']);
            
            // Dynamic Redirect URL - Single Domain Strategy
            $host = $_SERVER['HTTP_HOST'];
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
            
            // Use UUID for the Portal URL
            $redirectUrl = "{$protocol}://{$host}/portal/{$tenantUuid}/login";

            return $this->response->setJSON([
                'success' => true,
                'message' => 'Account created successfully!',
                'subdomain' => $subdomain,
                'redirect_url' => $redirectUrl
            ])->setStatusCode(200);
            
        } catch (Exception $e) {
            $db->transRollback();
            log_message('error', 'Signup Exception: ' . $e->getMessage());
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
            return $this->response->setJSON([
                'available' => false,
                'message' => 'Invalid characters'
            ])->setStatusCode(200);
        }
        
        // Reserved
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
}
