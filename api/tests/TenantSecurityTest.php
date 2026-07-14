<?php

namespace App\Tests;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use App\Models\TenantModel;
use App\Models\UserModel;
use App\Models\InvoiceModel;
use App\Models\PlanModel;

class TenantSecurityTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected $tenantA;
    protected $tenantB;
    protected $planStarter;
    protected $planBusiness;

    protected function setUp(): void
    {
        parent::setUp();
        
        $db = \Config\Database::connect();
        
        // Ensure plans exist
        $planModel = new PlanModel();
        $this->planStarter = $planModel->where('slug', 'starter')->first();
        if (!$this->planStarter) {
            $planModel->insert([
                'name' => 'Starter',
                'slug' => 'starter',
                'price' => 19.00,
                'billing_period' => 'monthly',
                'limits' => json_encode(['invoices' => 2, 'users' => 1])
            ]);
            $this->planStarter = $planModel->where('slug', 'starter')->first();
        }

        // 1. Setup Tenant A
        $tenantModel = new TenantModel();
        $this->tenantA = $tenantModel->where('subdomain', 'tenant-a')->first();
        if (!$this->tenantA) {
            $id = $tenantModel->insert([
                'company_name' => 'Tenant A Corp',
                'subdomain' => 'tenant-a',
                'plan_id' => $this->planStarter['id'],
                'status' => 'active'
            ]);
            $this->tenantA = $tenantModel->find($id);
        }

        // 2. Setup Tenant B
        $this->tenantB = $tenantModel->where('subdomain', 'tenant-b')->first();
        if (!$this->tenantB) {
            $id = $tenantModel->insert([
                'company_name' => 'Tenant B Corp',
                'subdomain' => 'tenant-b',
                'plan_id' => $this->planStarter['id'],
                'status' => 'active'
            ]);
            $this->tenantB = $tenantModel->find($id);
        }
        // 3. Reset Starter Plan Limits to avoid interference
        $planModel->update($this->planStarter['id'], [
            'limits' => json_encode(['invoices' => 50, 'users' => 10])
        ]);

        // 4. Cleanup test data
        $db->table('invoices')->whereIn('tenant_id', [$this->tenantA['id'], $this->tenantB['id']])->delete();
        $db->table('users')->whereIn('tenant_id', [$this->tenantA['id'], $this->tenantB['id']])->delete();
    }

    /**
     * Test Case: Cross-Tenant Data Leakage
     * Tenant B should NOT be able to see/access Tenant A's data.
     */
    public function testCrossTenantIsolation()
    {
        $invoiceModel = new InvoiceModel();
        
        // 1. Create invoice for Tenant A
        $appConfig = config('App');
        $appConfig->currentTenant = (object)$this->tenantA;
        
        $invoiceId = $invoiceModel->insert([
            'invoice_number' => 'SECURITY-A-' . time(),
            'issue_date' => date('Y-m-d'),
            'currency' => 'EUR',
            'seller_name' => 'Tenant A'
        ]);

        // 2. Switch to Tenant B and attempt to fetch Tenant A's invoice
        $appConfig->currentTenant = (object)$this->tenantB;
        $attempt = $invoiceModel->find($invoiceId);

        $this->assertNull($attempt, "Tenant B should NOT be able to find Tenant A's invoice.");
        
        // 3. Verify scoped count (using findAll which is hooked)
        $scopedInvoices = $invoiceModel->findAll();
        $this->assertCount(0, $scopedInvoices, "Tenant B should see 0 invoices via findAll().");
    }

    /**
     * Test Case: Usage Enforcement (Hard Limits)
     */
    public function testUsageEnforcementLimits()
    {
        $invoiceModel = new InvoiceModel();
        $planModel = new PlanModel();
        
        // Set a very low limit for the test
        $planModel->update($this->tenantA['plan_id'], [
            'limits' => json_encode(['invoices' => 2, 'users' => 10])
        ]);

        config('App')->currentTenant = (object)$this->tenantA;

        // Clean up previous test data for this tenant
        $invoiceModel->where('tenant_id', $this->tenantA['id'])->delete();

        // 1. Create 1st invoice (Allowed)
        $invoiceModel->insert([
            'invoice_number' => 'LIMIT-A-1',
            'issue_date' => date('Y-m-d'),
            'currency' => 'EUR',
            'seller_name' => 'Tenant A'
        ]);

        // 2. Create 2nd invoice (Allowed)
        $invoiceModel->insert([
            'invoice_number' => 'LIMIT-A-2',
            'issue_date' => date('Y-m-d'),
            'currency' => 'EUR',
            'seller_name' => 'Tenant A'
        ]);

        // 3. Create 3rd invoice (Should Fail)
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage("Usage Limit Exceeded");

        $invoiceModel->insert([
            'invoice_number' => 'LIMIT-A-3',
            'issue_date' => date('Y-m-d'),
            'currency' => 'EUR',
            'seller_name' => 'Tenant A'
        ]);
    }

    /**
     * Test Case: Fail-Closed Security
     * If no tenant context is provided, no data should be returned.
     */
    public function testFailClosedSecurity()
    {
        $invoiceModel = new InvoiceModel();
        
        // 1. Ensure no tenant context
        $appConfig = config('App');
        unset($appConfig->currentTenant);

        // 2. Attempt to fetch all invoices
        $invoices = $invoiceModel->findAll();

        $this->assertCount(0, $invoices, "Should return 0 records when NO tenant context is present.");
    }
}
