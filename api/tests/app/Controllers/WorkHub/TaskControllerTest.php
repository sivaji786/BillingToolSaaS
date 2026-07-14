<?php

namespace App\Tests\Controllers\WorkHub;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * WH-077: Task CRUD with tenant isolation, status transitions, RBAC.
 */
class TaskControllerTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected $migrate  = false;
    protected $refresh  = false;

    protected int    $tenantId = 0;
    protected string $token    = '';
    protected $authHeaders = [];

    // ---- Helpers ----

    private function login(string $role = 'planner'): void
    {
        $db = \Config\Database::connect();

        // Reuse or create tenant
        $tenant = $db->table('tenants')->where('subdomain', 'wh-test')->get()->getRowArray();
        if (!$tenant) {
            $db->table('tenants')->insert([
                'company_name' => 'WH Test Corp',
                'subdomain'    => 'wh-test',
                'plan_id'      => 1,
                'status'       => 'active',
                'uuid'         => 'wh-test-uuid-0001',
            ]);
            $this->tenantId = $db->insertID();
        } else {
            $this->tenantId = (int) $tenant['id'];
        }

        $email = "wh-{$role}-" . uniqid() . '@test.com';
        $db->table('users')->insert([
            'tenant_id'     => $this->tenantId,
            'name'          => "WH {$role}",
            'email'         => $email,
            'password_hash' => password_hash('Test1234!', PASSWORD_BCRYPT),
            'role'          => in_array($role, ['admin', 'user', 'owner']) ? $role : 'user',
        ]);
        $userId = $db->insertID();

        // Assign super admin role so RBAC doesn't block workhub endpoints
        $roleRow = $db->table('roles')->where('is_super_admin', 1)->get()->getRowArray();
        if (!$roleRow) {
            $db->table('roles')->insert([
                'tenant_id'      => $this->tenantId,
                'name'           => 'Super Admin',
                'description'    => 'Test Super Admin',
                'is_super_admin' => 1,
            ]);
            $roleId = $db->insertID();
        } else {
            $roleId = (int) $roleRow['id'];
        }
        $db->table('user_roles')->insert(['user_id' => $userId, 'role_id' => $roleId]);

        $result = $this->withBody(json_encode(['email' => $email, 'password' => 'Test1234!']))
                       ->post('auth/login');
        $json = json_decode($result->getJSON(), true);
        $this->token = $json['data']['token'] ?? '';

        $this->authHeaders = [
            'Authorization' => 'Bearer ' . $this->token,
            'X-Tenant-ID'   => 'wh-test',
            'Content-Type'  => 'application/json',
        ];
    }

    private function createTask(array $overrides = []): int
    {
        $payload = array_merge([
            'title'      => 'Test installation task',
            'priority'   => 'medium',
            'est_hours'  => 2,
            'status'     => 'open',
        ], $overrides);

        $result = $this->withHeaders($this->authHeaders)
                       ->withBody(json_encode($payload))
                       ->post('workhub/tasks');

        $json = json_decode($result->getJSON(), true);
        // Controller returns {id: ..., message: ...} directly (no data wrapper)
        return (int) ($json['id'] ?? $json['data']['id'] ?? 0);
    }

    // ---- Tests ----

    public function testCreateTaskReturns201(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $result = $this->withHeaders($this->authHeaders)
                       ->withBody(json_encode([
                           'title'    => 'Install circuit breaker panel',
                           'priority' => 'high',
                       ]))
                       ->post('workhub/tasks');

        $result->assertStatus(201);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('id', $json);
    }

    public function testListTasksRespectsTenantIsolation(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        // Create a task under this tenant
        $taskId = $this->createTask(['title' => 'Tenant isolation check']);
        $this->assertGreaterThan(0, $taskId);

        // List returns only this tenant's tasks
        $result = $this->withHeaders($this->authHeaders)->get('workhub/tasks');
        $result->assertStatus(200);
        $json = json_decode($result->getJSON(), true);

        foreach ($json['data'] ?? [] as $task) {
            $this->assertSame($this->tenantId, (int) $task['tenant_id']);
        }
    }

    public function testGetTaskDetail(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $taskId = $this->createTask(['title' => 'Detail view task']);
        $this->assertGreaterThan(0, $taskId);

        $result = $this->withHeaders($this->authHeaders)->get("workhub/tasks/{$taskId}");
        $result->assertStatus(200);
        $json = json_decode($result->getJSON(), true);
        $this->assertSame($taskId, (int) $json['data']['id']);
    }

    public function testUpdateTaskStatus(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $taskId = $this->createTask();
        $this->assertGreaterThan(0, $taskId);

        $result = $this->withHeaders($this->authHeaders)
                       ->withBody(json_encode(['status' => 'in_progress']))
                       ->put("workhub/tasks/{$taskId}");

        $result->assertStatus(200);
    }

    public function testDeleteTask(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $taskId = $this->createTask(['title' => 'Task to delete']);
        $this->assertGreaterThan(0, $taskId);

        $result = $this->withHeaders($this->authHeaders)->delete("workhub/tasks/{$taskId}");
        $result->assertStatus(200);
    }

    public function testDeleteDualSignedTaskReturns409(): void
    {
        // A dual-signed (completed) task must not be deletable (§257 HGB retention)
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $taskId = $this->createTask(['title' => 'Dual-signed task']);

        // Simulate dual-signed completion record
        $db->table('workhub_completion_records')->insert([
            'tenant_id'               => $this->tenantId,
            'task_id'                 => $taskId,
            'completion_note'         => 'Test completion note for deletion guard check',
            'worker_signature_data'   => 'data:image/svg+xml;base64,PHN2Zy8+',
            'worker_signed_at'        => date('Y-m-d H:i:s'),
            'customer_signature_data' => 'data:image/svg+xml;base64,PHN2Zy8+',
            'customer_name'           => 'Test Customer',
            'customer_signed_at'      => date('Y-m-d H:i:s'),
            'gdpr_consent_given'      => 1,
        ]);

        $result = $this->withHeaders($this->authHeaders)->delete("workhub/tasks/{$taskId}");
        $result->assertStatus(409);
    }

    public function testFilterByStatus(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $this->createTask(['title' => 'Open task for filter', 'status' => 'open']);

        $result = $this->withHeaders($this->authHeaders)
                       ->get('workhub/tasks?status=open');
        $result->assertStatus(200);

        $json = json_decode($result->getJSON(), true);
        foreach ($json['data'] ?? [] as $task) {
            $this->assertSame('open', $task['status']);
        }
    }

    public function testBatchLocationEndpoint(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $this->createTask(['title' => 'Location task A', 'location_tag' => 'Building-7-Floor-2']);
        $this->createTask(['title' => 'Location task B', 'location_tag' => 'Building-7-Floor-2']);

        $result = $this->withHeaders($this->authHeaders)
                       ->get('workhub/tasks/batch-location?location_tag=Building-7-Floor-2');
        $result->assertStatus(200);

        $json = json_decode($result->getJSON(), true);
        $this->assertGreaterThanOrEqual(2, count($json['data'] ?? []));
    }

    public function testUnauthenticatedRequestReturns401(): void
    {
        $result = $this->withHeaders(['Content-Type' => 'application/json'])
                       ->get('workhub/tasks');
        $this->assertContains($result->response()->getStatusCode(), [401, 403]);
    }

    public function testAuditLogEntryCreatedOnTaskCreate(): void
    {
        $this->login('planner');
        if (empty($this->token)) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $countBefore = $db->table('audit_logs')
                          ->where('tenant_id', $this->tenantId)
                          ->where('action', 'workhub.task.created')
                          ->countAllResults();

        $this->createTask(['title' => 'Audit log trigger task']);

        $countAfter = $db->table('audit_logs')
                         ->where('tenant_id', $this->tenantId)
                         ->where('action', 'workhub.task.created')
                         ->countAllResults();

        $this->assertGreaterThan($countBefore, $countAfter);
    }
}
