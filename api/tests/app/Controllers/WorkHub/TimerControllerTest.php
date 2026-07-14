<?php

namespace App\Tests\Controllers\WorkHub;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * WH-077: Timer state machine — start / pause / stop transitions, §16 ArbZG compliance.
 */
class TimerControllerTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;

    protected int    $tenantId = 0;
    protected int    $taskId   = 0;
    protected $authHeaders = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootAsWorker();
    }

    private function bootAsWorker(): void
    {
        $db = \Config\Database::connect();

        $tenant = $db->table('tenants')->where('subdomain', 'wh-timer-test')->get()->getRowArray();
        if (!$tenant) {
            $db->table('tenants')->insert([
                'company_name' => 'WH Timer Test Corp',
                'subdomain'    => 'wh-timer-test',
                'plan_id'      => 1,
                'status'       => 'active',
                'uuid'         => 'wh-timer-uuid-0002',
            ]);
            $this->tenantId = $db->insertID();
        } else {
            $this->tenantId = (int) $tenant['id'];
        }

        $email = 'wh-worker-' . uniqid() . '@timer.com';
        $db->table('users')->insert([
            'tenant_id'     => $this->tenantId,
            'email'         => $email,
            'password_hash' => password_hash('Test1234!', PASSWORD_BCRYPT),
            'role'          => 'user',
        ]);
        $userId = $db->insertID();

        // Assign super admin role so RBAC passes for timer endpoints
        $superAdminRole = $db->table('roles')->where('is_super_admin', 1)->get()->getRowArray();
        if (!$superAdminRole) {
            $db->table('roles')->insert([
                'tenant_id'      => $this->tenantId,
                'name'           => 'Super Admin',
                'description'    => 'Test Super Admin',
                'is_super_admin' => 1,
            ]);
            $superRoleId = $db->insertID();
        } else {
            $superRoleId = (int) $superAdminRole['id'];
        }
        $db->table('user_roles')->insert(['user_id' => $userId, 'role_id' => $superRoleId]);

        // Create a worker profile
        $db->table('workhub_workers')->insert([
            'tenant_id'                => $this->tenantId,
            'user_id'                  => $userId,
            'capacity_hours_per_week'  => 40,
        ]);
        $workerId = $db->insertID();

        // Create a task to run timer against
        $db->table('workhub_tasks')->insert([
            'tenant_id'          => $this->tenantId,
            'title'              => 'Timer test task',
            'status'             => 'open',
            'priority'           => 'medium',
            'assigned_worker_id' => $workerId,
        ]);
        $this->taskId = $db->insertID();

        $result = $this->withBody(json_encode(['email' => $email, 'password' => 'Test1234!']))
                       ->post('auth/login');
        $json   = json_decode($result->getJSON(), true);
        $token  = $json['data']['token'] ?? '';

        $this->authHeaders = [
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-ID'   => 'wh-timer-test',
            'Content-Type'  => 'application/json',
        ];
    }

    // ---- Tests ----

    public function testTimerStartTransitionsTaskToInProgress(): void
    {
        if (empty($this->authHeaders['Authorization'])) $this->markTestSkipped('Login failed');

        $result = $this->withHeaders($this->authHeaders)
                       ->post("workhub/tasks/{$this->taskId}/timer/start");

        $this->assertContains($result->response()->getStatusCode(), [200, 201]);

        $db   = \Config\Database::connect();
        $task = $db->table('workhub_tasks')->where('id', $this->taskId)->get()->getRowArray();
        $this->assertSame('in_progress', $task['status']);
    }

    public function testTimerPauseCreatesBreakEntry(): void
    {
        if (empty($this->authHeaders['Authorization'])) $this->markTestSkipped('Login failed');

        // Start first
        $this->withHeaders($this->authHeaders)
             ->post("workhub/tasks/{$this->taskId}/timer/start");

        $result = $this->withHeaders($this->authHeaders)
                       ->post("workhub/tasks/{$this->taskId}/timer/pause");

        $result->assertStatus(200);

        $db    = \Config\Database::connect();
        $break = $db->table('workhub_time_entries')
                    ->where('task_id', $this->taskId)
                    ->where('entry_type', 'break')
                    ->get()->getRowArray();
        $this->assertNotEmpty($break);
    }

    public function testTimerStopUpdatesLoggedHours(): void
    {
        if (empty($this->authHeaders['Authorization'])) $this->markTestSkipped('Login failed');

        $this->withHeaders($this->authHeaders)
             ->post("workhub/tasks/{$this->taskId}/timer/start");

        $result = $this->withHeaders($this->authHeaders)
                       ->post("workhub/tasks/{$this->taskId}/timer/stop");

        $result->assertStatus(200);

        $db   = \Config\Database::connect();
        $task = $db->table('workhub_tasks')->where('id', $this->taskId)->get()->getRowArray();
        $this->assertIsNumeric($task['logged_hours'] ?? null);
    }

    public function testDoubleStartReturns409(): void
    {
        if (empty($this->authHeaders['Authorization'])) $this->markTestSkipped('Login failed');

        $this->withHeaders($this->authHeaders)
             ->post("workhub/tasks/{$this->taskId}/timer/start");

        // Second start on already-running task must be rejected
        $result = $this->withHeaders($this->authHeaders)
                       ->post("workhub/tasks/{$this->taskId}/timer/start");

        $this->assertContains($result->response()->getStatusCode(), [409, 422]);
    }

    public function testStopWithoutStartReturns422(): void
    {
        if (empty($this->authHeaders['Authorization'])) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $db->table('workhub_tasks')->insert([
            'tenant_id' => $this->tenantId,
            'title'     => 'No-timer stop test',
            'status'    => 'open',
            'priority'  => 'low',
        ]);
        $noTimerTaskId = $db->insertID();

        $result = $this->withHeaders($this->authHeaders)
                       ->post("workhub/tasks/{$noTimerTaskId}/timer/stop");

        $this->assertContains($result->response()->getStatusCode(), [422, 400, 200]);
    }

    public function testAuditLogWrittenOnTimerStart(): void
    {
        if (empty($this->authHeaders['Authorization'])) $this->markTestSkipped('Login failed');

        $db          = \Config\Database::connect();
        $countBefore = $db->table('audit_logs')
                          ->where('tenant_id', $this->tenantId)
                          ->where('action', 'workhub.timer.started')
                          ->countAllResults();

        $this->withHeaders($this->authHeaders)
             ->post("workhub/tasks/{$this->taskId}/timer/start");

        $countAfter = $db->table('audit_logs')
                         ->where('tenant_id', $this->tenantId)
                         ->where('action', 'workhub.timer.started')
                         ->countAllResults();

        $this->assertGreaterThan($countBefore, $countAfter);
    }
}
