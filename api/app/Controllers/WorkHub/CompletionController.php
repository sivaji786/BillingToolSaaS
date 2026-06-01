<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubTaskModel;
use App\Models\WorkhubCompletionRecordModel;
use App\Models\WorkhubMaterialEntryModel;
use App\Models\WorkhubTaskPhotoModel;

class CompletionController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // WH-024: POST /workhub/tasks/:id/completion
    public function submit(int $taskId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $taskModel = new WorkhubTaskModel();
        $task      = $taskModel->where('tenant_id', $this->tenantId)->find($taskId);

        if (!$task) return $this->failNotFound('Task not found.');

        if (!in_array($task['status'], ['open', 'in_progress'], true)) {
            return $this->fail('Completion can only be submitted for open or in-progress tasks.', 422);
        }

        $data = $this->request->getJSON(true) ?? [];

        // --- Validate required fields ---
        $errors = [];

        $note = trim($data['completion_note'] ?? '');
        if (strlen($note) < 20)  $errors[] = 'completion_note must be at least 20 characters.';
        if (strlen($note) > 2000) $errors[] = 'completion_note must not exceed 2000 characters.';

        if (empty($data['worker_signature_data'])) {
            $errors[] = 'worker_signature_data (base64 SVG) is required.';
        }

        if (!isset($data['gdpr_consent_given']) || !$data['gdpr_consent_given']) {
            $errors[] = 'gdpr_consent_given must be true.';
        }

        // At least one photo must exist for this task
        $photoModel   = new WorkhubTaskPhotoModel();
        $existingPhotos = $photoModel->getForTask($taskId, 'jobsite');
        if (empty($existingPhotos) && empty($data['photos'])) {
            $errors[] = 'At least one jobsite photo is required.';
        }

        if ($errors) {
            return $this->fail($errors, 422);
        }

        $completionModel = new WorkhubCompletionRecordModel();

        // Guard: only one completion record per task
        if ($completionModel->getByTask($taskId)) {
            return $this->fail('A completion record already exists for this task.', 409);
        }

        $now = date('Y-m-d H:i:s');

        $record = [
            'tenant_id'                => $this->tenantId,
            'task_id'                  => $taskId,
            'completion_note'          => $note,
            'completion_note_original' => $data['completion_note_original'] ?? $note,
            'materials_json'           => isset($data['materials']) ? json_encode($data['materials']) : null,
            'worker_signature_data'    => $data['worker_signature_data'],
            'worker_signed_at'         => $now,
            'gdpr_consent_given'       => 1,
            'gdpr_consent_at'          => $now,
            'signed_ip'                => $this->request->getIPAddress(),
            'signed_user_agent'        => mb_substr($this->request->getUserAgent()->getAgentString(), 0, 500),
            // WH-083 eIDAS SES: store SHA-256 of displayed consent text when provided
            'consent_text_version'     => isset($data['consent_text'])
                                            ? hash('sha256', $data['consent_text'])
                                            : ($data['consent_text_version'] ?? 'v1'),
        ];

        $completionId = $completionModel->insert($record, true);

        if (!$completionId) {
            return $this->failServerError('Failed to save completion record.');
        }

        // Persist material entries as structured rows
        if (!empty($data['materials']) && is_array($data['materials'])) {
            $materialModel = new WorkhubMaterialEntryModel();
            foreach ($data['materials'] as $m) {
                $unitPrice = (float) ($m['unit_price'] ?? 0);
                $quantity  = (float) ($m['quantity'] ?? 1);
                $materialModel->insert([
                    'tenant_id'            => $this->tenantId,
                    'task_id'              => $taskId,
                    'completion_record_id' => $completionId,
                    'material_name'        => $m['material_name'] ?? 'Unknown',
                    'quantity'             => $quantity,
                    'unit'                 => $m['unit'] ?? 'pcs',
                    'unit_price'           => $unitPrice,
                    'total_price'          => round($unitPrice * $quantity, 2),
                    'catalogue_ref'        => $m['catalogue_ref'] ?? null,
                ]);
            }
        }

        // Transition task to 'done'
        $taskModel->update($taskId, ['status' => 'done']);

        $this->logAction(
            'workhub.completion.submitted',
            'WH-' . $taskId,
            'Done report submitted. Completion ID: ' . $completionId,
            true
        );
        $this->logAction('workhub.signature.worker_signed', 'WH-' . $taskId, 'Worker signature captured');

        return $this->respondCreated([
            'completion_id' => $completionId,
            'task_id'       => $taskId,
            'message'       => 'Done report submitted. Awaiting customer signature.',
        ]);
    }

    // WH-025: POST /workhub/completions/:id/customer-signature
    public function customerSignature(int $completionId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $completionModel = new WorkhubCompletionRecordModel();
        $record          = $completionModel->find($completionId);

        if (!$record || (int) $record['tenant_id'] !== $this->tenantId) {
            return $this->failNotFound('Completion record not found.');
        }

        if (!empty($record['customer_signed_at'])) {
            return $this->fail('Customer has already signed this completion record.', 409);
        }

        $data = $this->request->getJSON(true) ?? [];

        $errors = [];
        if (empty($data['customer_signature_data'])) $errors[] = 'customer_signature_data is required.';
        if (empty($data['customer_name']))            $errors[] = 'customer_name is required.';
        if (!isset($data['gdpr_consent_given']) || !$data['gdpr_consent_given']) {
            $errors[] = 'gdpr_consent_given must be accepted.';
        }
        if ($errors) return $this->fail($errors, 422);

        $now = date('Y-m-d H:i:s');

        $completionModel->update($completionId, [
            'customer_signature_data' => $data['customer_signature_data'],
            'customer_name'           => mb_substr(trim($data['customer_name']), 0, 255),
            'customer_signed_at'      => $now,
            'signed_ip'               => $this->request->getIPAddress(),
            'signed_user_agent'       => mb_substr($this->request->getUserAgent()->getAgentString(), 0, 500),
            'consent_text_version'    => $data['consent_text_version'] ?? ($record['consent_text_version'] ?? 'v1'),
            'gdpr_consent_given'      => 1,
            'gdpr_consent_at'         => $now,
        ]);

        $this->logAction(
            'workhub.signature.customer_signed',
            'WH-completion-' . $completionId,
            'Customer "' . ($data['customer_name']) . '" signed. eIDAS metadata recorded.',
            true
        );

        return $this->respond([
            'completion_id'     => $completionId,
            'customer_name'     => $data['customer_name'],
            'customer_signed_at' => $now,
            'dual_signed'       => true,
            'message'           => 'Customer signature captured. Completion record is now dual-signed.',
        ]);
    }

    // WH-026: GET /workhub/completions/:id
    public function show(int $completionId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $completionModel = new WorkhubCompletionRecordModel();
        $record          = $completionModel->find($completionId);

        if (!$record || (int) $record['tenant_id'] !== $this->tenantId) {
            return $this->failNotFound('Completion record not found.');
        }

        $materialModel = new WorkhubMaterialEntryModel();
        $photoModel    = new WorkhubTaskPhotoModel();

        $record['materials']     = $materialModel->getForTask((int) $record['task_id'], $completionId);
        $record['material_total'] = $materialModel->getTotalForTask((int) $record['task_id']);
        $record['photos']        = $photoModel->getForTask((int) $record['task_id']);
        $record['is_dual_signed'] = $completionModel->isDualSigned($record);

        return $this->respond(['data' => $record]);
    }
}
