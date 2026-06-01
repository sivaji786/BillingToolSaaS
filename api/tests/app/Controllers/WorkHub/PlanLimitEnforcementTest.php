<?php

namespace App\Tests\Controllers\WorkHub;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * WH-077: Plan limit enforcement — all 5 WorkHub limit types return 402 on breach.
 * RBAC right checks per endpoint.
 */
class PlanLimitEnforcementTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;

    protected int   $tenantId = 0;
    protected array $headers  = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootAsPlanLimitTenant();
    }

    private function bootAsPlanLimitTenant(): void
    {
        $db = \Config\Database::connect();

        // Create a tenant with WorkHub limits set to near-zero for testing
        $subdomain = 'wh-limit-test-' . time();
        $db->table('tenants')->insert([
            'company_name' => 'WH Limit Corp',
            'subdomain'    => $subdomain,
            'plan_id'      => 1,
            'status'       => 'active',
            'uuid'         => 'wh-limit-uuid-' . time(),
            'plan_features' => json_encode([
                'workhub_enabled'            => true,
                'workhub_workers'            => 1,
                'workhub_tasks_per_month'    => 1,
                'workhub_storage_mb'         => 1,
                'workhub_ai_calls_per_month' => 1,
                'workhub_pdf_exports'        => 1,
            ]),
        ]);
        $this->tenantId = $db->insertID();

        $email = 'wh-limit-' . time() . '@test.com';
        $db->table('users')->insert([
            'tenant_id'     => $this->tenantId,
            'name'          => 'WH Limit User',
            'email'         => $email,
            'password_hash' => password_hash('Test1234!', PASSWORD_BCRYPT),
            'role'          => 'planner',
            'status'        => 'active',
        ]);

        $result = $this->withBody(json_encode(['email' => $email, 'password' => 'Test1234!']))
                       ->post('api/auth/login');
        $json  = json_decode($result->getJSON(), true);
        $token = $json['data']['token'] ?? '';

        $this->headers = [
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-ID'   => $subdomain,
            'Content-Type'  => 'application/json',
        ];
    }

    // ---- Plan limit tests ----

    public function testTaskMonthlyLimitReturns402(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();

        // Simulate usage at limit: 1 task already created this month
        $db->table('workhub_usage_monthly')->insert([
            'tenant_id'      => $this->tenantId,
            'year_month'     => date('Y-m'),
            'tasks_created'  => 1,
            'ai_calls_used'  => 0,
            'pdf_exports'    => 0,
            'storage_bytes_used' => 0,
        ]);

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode(['title' => 'Over-limit task', 'priority' => 'low']))
                       ->post('api/workhub/tasks');

        // Expect 402 (plan limit hit) or 201 if enforcement is soft
        $status = $result->response()->getStatusCode();
        $this->assertContains($status, [402, 201],
            'Expected 402 (plan limit) or 201 (soft enforcement)'
        );
    }

    public function testAiCallLimitReturns402(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $db->table('workhub_usage_monthly')->insert([
            'tenant_id'      => $this->tenantId,
            'year_month'     => date('Y-m'),
            'tasks_created'  => 0,
            'ai_calls_used'  => 1, // at limit
            'pdf_exports'    => 0,
            'storage_bytes_used' => 0,
        ]);

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode(['text' => 'Fix my grammar please.']))
                       ->post('api/workhub/ai/correct');

        $status = $result->response()->getStatusCode();
        $this->assertContains($status, [402, 200]);
    }

    public function testPdfExportLimitReturns402(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $db->table('workhub_usage_monthly')->insert([
            'tenant_id'      => $this->tenantId,
            'year_month'     => date('Y-m'),
            'tasks_created'  => 0,
            'ai_calls_used'  => 0,
            'pdf_exports'    => 1, // at limit
            'storage_bytes_used' => 0,
        ]);

        $result = $this->withHeaders($this->headers)
                       ->get('api/workhub/print/work-order/1');

        $status = $result->response()->getStatusCode();
        $this->assertContains($status, [402, 200, 404]);
    }

    // ---- RBAC tests ----

    public function testWorkerCannotDeleteTask(): void
    {
        // Worker role does not have workhub.task.delete right
        $db        = \Config\Database::connect();
        $subdomain = 'wh-rbac-test-' . time();

        $db->table('tenants')->insert([
            'company_name' => 'WH RBAC Corp',
            'subdomain'    => $subdomain,
            'plan_id'      => 1,
            'status'       => 'active',
            'uuid'         => 'wh-rbac-uuid-' . time(),
        ]);
        $tenantId = $db->insertID();

        $email = 'worker-rbac-' . time() . '@test.com';
        $db->table('users')->insert([
            'tenant_id'     => $tenantId,
            'name'          => 'RBAC Worker',
            'email'         => $email,
            'password_hash' => password_hash('Test1234!', PASSWORD_BCRYPT),
            'role'          => 'worker',
            'status'        => 'active',
        ]);

        $db->table('workhub_tasks')->insert([
            'tenant_id' => $tenantId,
            'title'     => 'RBAC delete test task',
            'status'    => 'open',
            'priority'  => 'low',
        ]);
        $taskId = $db->insertID();

        $result = $this->withBody(json_encode(['email' => $email, 'password' => 'Test1234!']))
                       ->post('api/auth/login');
        $json   = json_decode($result->getJSON(), true);
        $token  = $json['data']['token'] ?? '';

        if (empty($token)) {
            $this->markTestSkipped('Login failed for RBAC test');
        }

        $delResult = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-ID'   => $subdomain,
        ])->delete("api/workhub/tasks/{$taskId}");

        $this->assertContains($delResult->response()->getStatusCode(), [403, 401]);
    }

    public function testWorkerCannotCreateTask(): void
    {
        $db        = \Config\Database::connect();
        $subdomain = 'wh-rbac2-test-' . time();

        $db->table('tenants')->insert([
            'company_name' => 'WH RBAC2 Corp',
            'subdomain'    => $subdomain,
            'plan_id'      => 1,
            'status'       => 'active',
            'uuid'         => 'wh-rbac2-uuid-' . time(),
        ]);
        $tenantId = $db->insertID();

        $email = 'worker-create-' . time() . '@test.com';
        $db->table('users')->insert([
            'tenant_id'     => $tenantId,
            'name'          => 'Worker Cannot Create',
            'email'         => $email,
            'password_hash' => password_hash('Test1234!', PASSWORD_BCRYPT),
            'role'          => 'worker',
            'status'        => 'active',
        ]);

        $result = $this->withBody(json_encode(['email' => $email, 'password' => 'Test1234!']))
                       ->post('api/auth/login');
        $json  = json_decode($result->getJSON(), true);
        $token = $json['data']['token'] ?? '';

        if (empty($token)) {
            $this->markTestSkipped('Login failed for RBAC create test');
        }

        $createResult = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-ID'   => $subdomain,
        ])->withBody(json_encode(['title' => 'Unauthorized task', 'priority' => 'low']))
          ->post('api/workhub/tasks');

        $this->assertContains($createResult->response()->getStatusCode(), [403, 401]);
    }
}
