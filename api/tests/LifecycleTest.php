<?php

namespace App\Tests;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use App\Models\TenantModel;
use App\Models\UserModel;
use App\Models\InvoiceModel;
use App\Models\SubscriptionModel;

class LifecycleTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    
    // Manual cleanup or relying on dynamic IDs.
    protected $migrate = false;
    protected $refresh = false;
    
    protected $tenantId;
    protected $token;
    protected $headers;

    protected function setUp(): void
    {
        parent::setUp();
        
        // 1. Create Test Tenant
        $tenantModel = new TenantModel();
        // Check if exists
        $existing = $tenantModel->where('subdomain', 'lifecycle-test')->first();
        if ($existing) {
            $this->tenantId = $existing['id'];
        } else {
            $this->tenantId = $tenantModel->insert([
                'company_name' => 'Lifecycle Test Corp',
                'subdomain' => 'lifecycle-test',
                'plan_id' => 1,
                'status' => 'active',
                'uuid' => 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Static UUID for consistent testing
            ]);
            
            // Create subscription
            $subModel = new SubscriptionModel();
            $subModel->insert([
                'tenant_id' => $this->tenantId,
                'plan_id' => 1,
                'status' => 'active',
                'current_period_start' => date('Y-m-d H:i:s'),
                 'current_period_end' => date('Y-m-d H:i:s', strtotime('+1 year'))
            ]);
        }

        // 2. Create User
        $userModel = new UserModel();
        $email = 'test-' . uniqid() . '@lifecycle.com';
        $password = 'password123';
        
        $userId = $userModel->insert([
            'tenant_id' => $this->tenantId,
            'name' => 'Test User',
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'role' => 'admin'
        ]);
        
        // Check for company type
        $db = \Config\Database::connect();
        $companyType = $db->table('company_types')->where('id', 1)->get()->getRow();
        if (!$companyType) {
            $db->table('company_types')->insert(['id' => 1, 'name' => 'Test Corp Type']);
        }

        // Assign Super Admin Role to ensure permissions
        $role = $db->table('roles')->where('is_super_admin', 1)->get()->getRow();
        if (!$role) {
            $db->table('roles')->insert([
                'tenant_id' => $this->tenantId,
                'name' => 'Super Admin',
                'description' => 'Test Super Admin',
                'is_super_admin' => 1,
                'company_type_id' => 1 // Assuming 1 exists or nullable
            ]);
            $roleId = $db->insertID();
        } else {
            $roleId = $role->id;
        }
        
        $db->table('user_roles')->insert([
            'user_id' => $userId,
            'role_id' => $roleId
        ]);
        
        // Login to get Token
        $result = $this->withBody(json_encode([
            'email' => $email,
            'password' => $password
        ]))->post('auth/login');
        
        $json = json_decode($result->getJSON(), true);
        
        if (isset($json['data']['token'])) {
             $this->token = $json['data']['token'];
             $this->headers = [
                 'Authorization' => 'Bearer ' . $this->token,
                 'X-Tenant-ID' => 'lifecycle-test'
             ];
        } else {
            // Debug failure
            fwrite(STDERR, "Login Failed Response: " . $result->getJSON() . "\n");
            $this->headers = [];
        }
    }

    public function testInvoiceLifecycle()
    {
        if (empty($this->headers)) {
            $this->fail("Login failed, cannot run lifecycle test.");
        }

        // A. CREATE (Draft)
        $invoiceData = [
            'invoiceNumber' => 'INV-TEST-' . uniqid(),
            'issueDate' => date('Y-m-d'),
            'currency' => 'EUR',
            'status' => 'draft',
            'seller' => [
                'name' => 'Lifecycle Test Corp',
                'address' => ['street' => '123 Test St']
            ],
            'buyer' => [
                'name' => 'Client A',
                'address' => ['street' => '456 Client Rd']
            ],
            'lines' => [
                [
                    'description' => 'Test Item',
                    'quantity' => 2,
                    'unitCode' => 'H87',
                    'unitPrice' => 50,
                    'taxCategory' => 'S',
                    'taxPercent' => 20
                ]
            ],
            'payableAmount' => 120, // 2*50 + 20%
            'taxExclusiveAmount' => 100,
            'taxInclusiveAmount' => 120,
            'lineExtensionAmount' => 100
        ];

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode($invoiceData))
                       ->post('invoices');
                       
        $result->assertStatus(201);
        $json = json_decode($result->getJSON(), true);
        $invoiceId = $json['id'];
        
        // B. Validate first (draft → validated)
        $validateData = $invoiceData;
        $validateData['status'] = 'validated';

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode($validateData))
                       ->put('invoices/' . $invoiceId);
        $result->assertStatus(200);

        // C. UPDATE status to sent (validated → sent)
        $updateData = $invoiceData;
        $updateData['status'] = 'sent';

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode($updateData))
                       ->put('invoices/' . $invoiceId);

        $result->assertStatus(200);

        // D. VERIFY DB ISOLATION
        $model = new InvoiceModel();
        $invoice = $model->find($invoiceId);
        $this->assertEquals('sent', $invoice['status']);
        $this->assertEquals($this->tenantId, $invoice['tenant_id']);
        
        // D. DELETE
        $result = $this->withHeaders($this->headers)
                       ->delete('invoices/' . $invoiceId);
                       
        $result->assertStatus(200);
        
        $this->assertNull($model->find($invoiceId));
    }
}
