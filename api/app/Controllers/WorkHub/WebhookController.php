<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubTaskModel;

/**
 * Sprint D — External module webhook receiver.
 *
 * All inbound webhook calls are authenticated via HMAC-SHA256 signature
 * carried in the `X-WorkHub-Signature` header (format: sha256=<hex>).
 * The secret is WORKHUB_WEBHOOK_SECRET from the environment.
 *
 * Supported source modules and their auto-task behaviour:
 *   - PC-13 (fault detection):  fault_detected  → task_type=fault_resolution, priority=urgent
 *   - PFE   (hardware config):  hardware_discovered → task_type=commissioning, priority=high
 *                                change_required     → task_type=configuration, priority=medium
 *   - Generic:                  receive() route accepts any source_module + event_type
 *                               and logs the event; auto-task creation for unknown types
 *                               is skipped and returns 202 Accepted.
 */
class WebhookController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected int $tenantId = 0;

    // POST /workhub/webhooks/receive  — generic entry-point
    public function receive(): \CodeIgniter\HTTP\ResponseInterface
    {
        if (!$this->verifySignature()) {
            return $this->failUnauthorized('Invalid or missing webhook signature.');
        }

        $body = $this->request->getJSON(true);
        if (!$body) {
            return $this->fail('Request body must be valid JSON.', 400);
        }

        $sourceModule  = strtolower(trim($body['source_module'] ?? ''));
        $eventType     = strtolower(trim($body['event_type']    ?? ''));
        $correlationId = $body['correlation_id'] ?? null;
        $tenantId      = (int) ($body['tenant_id'] ?? 0);

        if (!$sourceModule || !$eventType) {
            return $this->fail('source_module and event_type are required.', 422);
        }

        if (!$tenantId) {
            return $this->fail('tenant_id is required.', 422);
        }

        $this->tenantId = $tenantId;

        // Route by source_module + event_type
        switch ($sourceModule) {
            case 'pc13':
                return $this->handlePc13($eventType, $correlationId, $body);

            case 'pfe':
                return $this->handlePfe($eventType, $correlationId, $body);

            default:
                // Log unknown source for observability; do not auto-create tasks
                log_message('info', "[WorkHub Webhook] Unhandled source_module={$sourceModule} event_type={$eventType} correlation_id={$correlationId}");
                $this->logWorkhubEvent(
                    "workhub.webhook.{$sourceModule}.{$eventType}",
                    0,
                    [],
                    ['source_module' => $sourceModule, 'event_type' => $eventType, 'correlation_id' => $correlationId],
                    "Unhandled webhook from {$sourceModule}"
                );
                return $this->response->setStatusCode(202)->setJSON([
                    'status'  => 'accepted',
                    'message' => "Event acknowledged. No handler registered for {$sourceModule}/{$eventType}.",
                ]);
        }
    }

    // POST /workhub/webhooks/pc13-fault  — dedicated PC-13 endpoint (simpler integration)
    public function pc13Fault(): \CodeIgniter\HTTP\ResponseInterface
    {
        if (!$this->verifySignature()) {
            return $this->failUnauthorized('Invalid or missing webhook signature.');
        }

        $body = $this->request->getJSON(true);
        if (!$body) {
            return $this->fail('Request body must be valid JSON.', 400);
        }

        $this->tenantId = (int) ($body['tenant_id'] ?? 0);
        if (!$this->tenantId) {
            return $this->fail('tenant_id is required.', 422);
        }

        return $this->handlePc13(
            'fault_detected',
            $body['correlation_id'] ?? null,
            $body
        );
    }

    // POST /workhub/webhooks/pfe-task  — dedicated PFE deep-link endpoint
    public function pfeTask(): \CodeIgniter\HTTP\ResponseInterface
    {
        if (!$this->verifySignature()) {
            return $this->failUnauthorized('Invalid or missing webhook signature.');
        }

        $body = $this->request->getJSON(true);
        if (!$body) {
            return $this->fail('Request body must be valid JSON.', 400);
        }

        $this->tenantId = (int) ($body['tenant_id'] ?? 0);
        if (!$this->tenantId) {
            return $this->fail('tenant_id is required.', 422);
        }

        $eventType = strtolower(trim($body['event_type'] ?? 'change_required'));
        return $this->handlePfe($eventType, $body['correlation_id'] ?? null, $body);
    }

    // ---- Source-module handlers ----

    private function handlePc13(string $eventType, ?string $correlationId, array $body): \CodeIgniter\HTTP\ResponseInterface
    {
        if ($eventType !== 'fault_detected') {
            return $this->response->setStatusCode(202)->setJSON([
                'status'  => 'accepted',
                'message' => "PC-13 event_type '{$eventType}' acknowledged but not handled.",
            ]);
        }

        // Prevent duplicate task creation for same correlation_id
        if ($correlationId && $this->correlationExists($correlationId)) {
            return $this->respond([
                'status'  => 'duplicate',
                'message' => 'A task for this correlation_id already exists.',
                'correlation_id' => $correlationId,
            ]);
        }

        $faultCode    = $body['fault_code']    ?? 'UNKNOWN';
        $faultDesc    = $body['fault_description'] ?? 'Automatic fault detected by PC-13';
        $locationTag  = $body['location_tag']  ?? null;
        $projectId    = $body['project_id']    ?? null;
        $pfeRefType   = 'pc13_fault';
        $pfeRefId     = $body['device_id']     ?? ($body['asset_ref'] ?? null);

        $title = "[PC-13 Fault] {$faultCode}" . ($locationTag ? " @ {$locationTag}" : '');

        $taskId = $this->createTask([
            'title'          => $title,
            'description'    => $faultDesc,
            'priority'       => 'urgent',
            'status'         => 'open',
            'task_type'      => 'fault_resolution',
            'source_module'  => 'pc13',
            'correlation_id' => $correlationId,
            'location_tag'   => $locationTag,
            'project_id'     => $projectId ? (int) $projectId : null,
            'pfe_ref_type'   => $pfeRefType,
            'pfe_ref_id'     => $pfeRefId,
        ]);

        if (!$taskId) {
            return $this->failServerError('Failed to create fault task.');
        }

        $this->logWorkhubEvent(
            'workhub.webhook.pc13.fault_detected',
            $taskId,
            [],
            ['fault_code' => $faultCode, 'correlation_id' => $correlationId, 'location_tag' => $locationTag],
            "PC-13 fault task WH-{$taskId} auto-created (fault: {$faultCode})"
        );

        return $this->respondCreated([
            'status'         => 'created',
            'task_id'        => $taskId,
            'correlation_id' => $correlationId,
            'message'        => "Fault task WH-{$taskId} created.",
        ]);
    }

    private function handlePfe(string $eventType, ?string $correlationId, array $body): \CodeIgniter\HTTP\ResponseInterface
    {
        $taskTypeMap = [
            'hardware_discovered' => 'commissioning',
            'change_required'     => 'configuration',
        ];

        if (!isset($taskTypeMap[$eventType])) {
            return $this->response->setStatusCode(202)->setJSON([
                'status'  => 'accepted',
                'message' => "PFE event_type '{$eventType}' acknowledged but not handled.",
            ]);
        }

        if ($correlationId && $this->correlationExists($correlationId)) {
            return $this->respond([
                'status'  => 'duplicate',
                'message' => 'A task for this correlation_id already exists.',
                'correlation_id' => $correlationId,
            ]);
        }

        $taskType    = $taskTypeMap[$eventType];
        $priority    = $eventType === 'hardware_discovered' ? 'high' : 'medium';
        $deviceRef   = $body['device_ref']  ?? $body['asset_ref'] ?? null;
        $deviceName  = $body['device_name'] ?? $body['asset_name'] ?? 'Unknown device';
        $locationTag = $body['location_tag'] ?? null;
        $projectId   = $body['project_id']  ?? null;

        $prefix = $eventType === 'hardware_discovered' ? '[PFE Commissioning]' : '[PFE Config]';
        $title  = "{$prefix} {$deviceName}" . ($locationTag ? " @ {$locationTag}" : '');

        $taskId = $this->createTask([
            'title'          => $title,
            'description'    => $body['description'] ?? "PFE event: {$eventType} for {$deviceName}",
            'priority'       => $priority,
            'status'         => 'open',
            'task_type'      => $taskType,
            'source_module'  => 'pfe',
            'correlation_id' => $correlationId,
            'location_tag'   => $locationTag,
            'project_id'     => $projectId ? (int) $projectId : null,
            'pfe_ref_type'   => 'pfe_device',
            'pfe_ref_id'     => $deviceRef,
        ]);

        if (!$taskId) {
            return $this->failServerError('Failed to create PFE task.');
        }

        $this->logWorkhubEvent(
            "workhub.webhook.pfe.{$eventType}",
            $taskId,
            [],
            ['device_ref' => $deviceRef, 'task_type' => $taskType, 'correlation_id' => $correlationId],
            "PFE task WH-{$taskId} auto-created ({$eventType}: {$deviceName})"
        );

        return $this->respondCreated([
            'status'         => 'created',
            'task_id'        => $taskId,
            'correlation_id' => $correlationId,
            'message'        => "PFE task WH-{$taskId} created.",
        ]);
    }

    // ---- Helpers ----

    private function createTask(array $fields): int|false
    {
        $model = new WorkhubTaskModel();
        return $model->insert(array_merge($fields, [
            'tenant_id'  => $this->tenantId,
            'created_by' => null,  // machine-created — no user actor
        ]), true);
    }

    private function correlationExists(string $correlationId): bool
    {
        $db = \Config\Database::connect();
        $row = $db->table('workhub_tasks')
            ->where('tenant_id', $this->tenantId)
            ->where('correlation_id', $correlationId)
            ->get()->getRowArray();
        return !empty($row);
    }

    private function verifySignature(): bool
    {
        $secret = $_ENV['WORKHUB_WEBHOOK_SECRET'] ?? getenv('WORKHUB_WEBHOOK_SECRET') ?? '';
        if (empty($secret)) {
            // No secret configured — reject all webhook calls
            log_message('error', '[WorkHub Webhook] WORKHUB_WEBHOOK_SECRET is not configured.');
            return false;
        }

        $header = $this->request->getHeaderLine('X-WorkHub-Signature');
        if (!$header || !str_starts_with($header, 'sha256=')) {
            return false;
        }

        $rawBody   = $this->request->getBody() ?? '';
        $expected  = 'sha256=' . hash_hmac('sha256', $rawBody, $secret);

        // Timing-safe comparison
        return hash_equals($expected, $header);
    }
}
