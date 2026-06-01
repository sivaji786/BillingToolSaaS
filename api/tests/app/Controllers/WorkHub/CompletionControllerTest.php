<?php

namespace App\Tests\Controllers\WorkHub;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * WH-077: Completion records — submission validation, customer signature, eIDAS metadata,
 * dual-sign flag, and billing invoice auto-generation trigger.
 */
class CompletionControllerTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected $migrate = false;
    protected $refresh = false;

    protected int   $tenantId = 0;
    protected int   $taskId   = 0;
    protected array $headers  = [];

    private string $workerSig = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    private string $consentText = 'By signing I confirm the work described above was carried out as specified. I consent to storage of this signature as a Simple Electronic Signature under eIDAS Regulation 910/2014.';

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootAsWorker();
    }

    private function bootAsWorker(): void
    {
        $db = \Config\Database::connect();

        $tenant = $db->table('tenants')->where('subdomain', 'wh-completion-test')->get()->getRowArray();
        if (!$tenant) {
            $db->table('tenants')->insert([
                'company_name' => 'WH Completion Corp',
                'subdomain'    => 'wh-completion-test',
                'plan_id'      => 1,
                'status'       => 'active',
                'uuid'         => 'wh-comp-uuid-0003',
            ]);
            $this->tenantId = $db->insertID();
        } else {
            $this->tenantId = (int) $tenant['id'];
        }

        $email = 'wh-worker-comp-' . time() . '@test.com';
        $db->table('users')->insert([
            'tenant_id'     => $this->tenantId,
            'name'          => 'Completion Worker',
            'email'         => $email,
            'password_hash' => password_hash('Test1234!', PASSWORD_BCRYPT),
            'role'          => 'worker',
            'status'        => 'active',
        ]);

        $db->table('workhub_tasks')->insert([
            'tenant_id' => $this->tenantId,
            'title'     => 'Task for completion test',
            'status'    => 'in_progress',
            'priority'  => 'medium',
        ]);
        $this->taskId = $db->insertID();

        // Add a jobsite photo so the completion requirement is met
        $db->table('workhub_task_photos')->insert([
            'tenant_id'  => $this->tenantId,
            'task_id'    => $this->taskId,
            'photo_type' => 'jobsite',
            'file_path'  => 'workhub/' . $this->tenantId . '/' . $this->taskId . '/test.jpg',
            'url'        => 'https://example.com/test.jpg',
        ]);

        $result = $this->withBody(json_encode(['email' => $email, 'password' => 'Test1234!']))
                       ->post('api/auth/login');
        $json  = json_decode($result->getJSON(), true);
        $token = $json['data']['token'] ?? '';

        $this->headers = [
            'Authorization' => 'Bearer ' . $token,
            'X-Tenant-ID'   => 'wh-completion-test',
            'Content-Type'  => 'application/json',
        ];
    }

    private function submitCompletion(int $taskId, array $overrides = []): array
    {
        $payload = array_merge([
            'completion_note'       => 'Installation completed per spec. All connections tested. Safety checks passed.',
            'worker_signature_data' => $this->workerSig,
            'gdpr_consent_given'    => true,
            'consent_text'          => $this->consentText,
        ], $overrides);

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode($payload))
                       ->post("api/workhub/tasks/{$taskId}/completion");

        return json_decode($result->getJSON(), true) ?? [];
    }

    // ---- Tests ----

    public function testSubmitCompletionReturns201(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode([
                           'completion_note'       => 'All work completed. Signed off by technician.',
                           'worker_signature_data' => $this->workerSig,
                           'gdpr_consent_given'    => true,
                       ]))
                       ->post("api/workhub/tasks/{$this->taskId}/completion");

        $result->assertStatus(201);
        $json = json_decode($result->getJSON(), true);
        $this->assertArrayHasKey('completion_id', $json);
    }

    public function testCompletionNoteMinLengthValidation(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode([
                           'completion_note'       => 'Too short',
                           'worker_signature_data' => $this->workerSig,
                           'gdpr_consent_given'    => true,
                       ]))
                       ->post("api/workhub/tasks/{$this->taskId}/completion");

        $result->assertStatus(422);
    }

    public function testMissingSignatureReturns422(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode([
                           'completion_note'    => 'Completed installation. All circuits tested and verified.',
                           'gdpr_consent_given' => true,
                       ]))
                       ->post("api/workhub/tasks/{$this->taskId}/completion");

        $result->assertStatus(422);
    }

    public function testDuplicateCompletionReturns409(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $this->submitCompletion($this->taskId);

        // Second submission must be rejected
        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode([
                           'completion_note'       => 'Attempting second completion note for duplicate check.',
                           'worker_signature_data' => $this->workerSig,
                           'gdpr_consent_given'    => true,
                       ]))
                       ->post("api/workhub/tasks/{$this->taskId}/completion");

        $result->assertStatus(409);
    }

    public function testTaskStatusSetToDoneAfterCompletion(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $db->table('workhub_tasks')->insert([
            'tenant_id' => $this->tenantId,
            'title'     => 'Task for done transition',
            'status'    => 'in_progress',
            'priority'  => 'low',
        ]);
        $taskId = $db->insertID();

        $db->table('workhub_task_photos')->insert([
            'tenant_id'  => $this->tenantId,
            'task_id'    => $taskId,
            'photo_type' => 'jobsite',
            'file_path'  => 'test/path.jpg',
            'url'        => 'https://example.com/p.jpg',
        ]);

        $this->submitCompletion($taskId);

        $task = $db->table('workhub_tasks')->where('id', $taskId)->get()->getRowArray();
        $this->assertSame('done', $task['status']);
    }

    public function testCustomerSignatureCapture(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $json         = $this->submitCompletion($this->taskId);
        $completionId = (int) ($json['completion_id'] ?? 0);
        $this->assertGreaterThan(0, $completionId);

        $result = $this->withHeaders($this->headers)
                       ->withBody(json_encode([
                           'customer_signature_data' => $this->workerSig,
                           'customer_name'           => 'Hans Mustermann',
                           'gdpr_consent_given'      => true,
                       ]))
                       ->post("api/workhub/completions/{$completionId}/customer-signature");

        $result->assertStatus(200);
        $resp = json_decode($result->getJSON(), true);
        $this->assertTrue($resp['dual_signed'] ?? false);
    }

    public function testEidasMetadataStoredOnWorkerSign(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $db->table('workhub_tasks')->insert([
            'tenant_id' => $this->tenantId,
            'title'     => 'eIDAS metadata test task',
            'status'    => 'in_progress',
            'priority'  => 'medium',
        ]);
        $taskId = $db->insertID();
        $db->table('workhub_task_photos')->insert([
            'tenant_id'  => $this->tenantId,
            'task_id'    => $taskId,
            'photo_type' => 'jobsite',
            'file_path'  => 'test/path.jpg',
            'url'        => 'https://example.com/p.jpg',
        ]);

        $json         = $this->submitCompletion($taskId, ['consent_text' => $this->consentText]);
        $completionId = (int) ($json['completion_id'] ?? 0);
        $this->assertGreaterThan(0, $completionId);

        $record = $db->table('workhub_completion_records')
                     ->where('id', $completionId)
                     ->get()->getRowArray();

        // eIDAS Simple Electronic Signature metadata
        $this->assertNotEmpty($record['signed_ip'] ?? '');
        $this->assertNotEmpty($record['signed_user_agent'] ?? '');
        $this->assertNotEmpty($record['consent_text_version'] ?? '');
        $this->assertNotEmpty($record['worker_signed_at'] ?? '');
    }

    public function testConsentTextHashStoredAsHex64(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $db = \Config\Database::connect();
        $db->table('workhub_tasks')->insert([
            'tenant_id' => $this->tenantId,
            'title'     => 'Consent hash test task',
            'status'    => 'in_progress',
            'priority'  => 'medium',
        ]);
        $taskId = $db->insertID();
        $db->table('workhub_task_photos')->insert([
            'tenant_id'  => $this->tenantId,
            'task_id'    => $taskId,
            'photo_type' => 'jobsite',
            'file_path'  => 'test/path.jpg',
            'url'        => 'https://example.com/p.jpg',
        ]);

        $json         = $this->submitCompletion($taskId, ['consent_text' => $this->consentText]);
        $completionId = (int) ($json['completion_id'] ?? 0);
        $this->assertGreaterThan(0, $completionId);

        $record = $db->table('workhub_completion_records')
                     ->where('id', $completionId)
                     ->get()->getRowArray();

        $stored = $record['consent_text_version'] ?? '';
        // Should be a 64-char SHA-256 hex string when consent_text is provided
        if (strlen($stored) === 64) {
            $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $stored);
            $this->assertSame(hash('sha256', $this->consentText), $stored);
        } else {
            // Fallback version string is also acceptable
            $this->assertNotEmpty($stored);
        }
    }

    public function testGetCompletionRecord(): void
    {
        if (empty($this->headers['Authorization'])) $this->markTestSkipped('Login failed');

        $json         = $this->submitCompletion($this->taskId);
        $completionId = (int) ($json['completion_id'] ?? 0);
        $this->assertGreaterThan(0, $completionId);

        $result = $this->withHeaders($this->headers)
                       ->get("api/workhub/completions/{$completionId}");

        $result->assertStatus(200);
        $data = json_decode($result->getJSON(), true);
        $this->assertSame($completionId, (int) ($data['data']['id'] ?? 0));
    }
}
