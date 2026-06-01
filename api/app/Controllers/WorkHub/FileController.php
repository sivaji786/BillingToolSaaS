<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Traits\PlanLimitTrait;
use App\Models\WorkhubTaskModel;
use App\Models\WorkhubTaskPhotoModel;
use App\Models\WorkhubWorkerModel;
use App\Services\WorkHubStorageService;

/**
 * WH-029: POST /api/workhub/files/upload
 *
 * Accepts JPEG/PNG/HEIC, max 10 MB per file.
 * Validates MIME type via finfo (not just extension).
 * Stores to S3/R2 at workhub/{tenant_id}/{task_id}/{uuid}.ext.
 * Creates workhub_task_photos row.
 * Checks workhub_storage_mb plan limit.
 * Returns photo_id and pre-signed URL (15-min expiry).
 */
class FileController extends BaseController
{
    use ResponseTrait, AuditTrait, PlanLimitTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // WH-029: POST /workhub/files/upload
    public function upload(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $file = $this->request->getFile('file');

        if (!$file || !$file->isValid()) {
            return $this->fail('No valid file uploaded.', 400);
        }

        if ($file->hasMoved()) {
            return $this->fail('File already processed.', 400);
        }

        $taskId    = (int) ($this->request->getPost('task_id') ?? 0);
        $photoType = $this->request->getPost('photo_type') ?? 'jobsite';

        if (!in_array($photoType, ['jobsite', 'identity'], true)) {
            return $this->fail('photo_type must be jobsite or identity.', 422);
        }

        // Verify task belongs to this tenant
        if ($taskId > 0) {
            $taskModel = new WorkhubTaskModel();
            $task = $taskModel->where('tenant_id', $this->tenantId)->find($taskId);
            if (!$task) {
                return $this->failNotFound('Task not found.');
            }
        }

        $storage  = new WorkHubStorageService();
        $fileSize = $file->getSize();

        // Check storage plan limit
        $limitError = $this->checkWorkhubStorageLimit($fileSize);
        if ($limitError !== null) {
            return $this->response->setStatusCode(402)->setJSON($limitError);
        }

        // Validate MIME and extension
        try {
            $meta = $storage->validateUpload($file->getTempName(), $fileSize);
        } catch (\RuntimeException $e) {
            return $this->fail($e->getMessage(), $e->getCode() ?: 422);
        }

        // Identity photo: only one allowed per worker — check and replace if exists
        if ($photoType === 'identity') {
            $this->handleIdentityPhotoReplacement($taskId, $storage);
        }

        // Build storage key and upload
        $uuid       = bin2hex(random_bytes(16));
        $storageKey = $storage->buildStorageKey(
            $this->tenantId,
            $taskId ?: 0,
            $uuid,
            $meta['ext']
        );

        try {
            $storage->upload($file->getTempName(), $storageKey, $meta['mime']);
        } catch (\Throwable $e) {
            log_message('error', '[FileController::upload] S3 upload failed: ' . $e->getMessage());
            return $this->failServerError('File upload failed. Please try again.');
        }

        // Persist photo record
        $photoModel = new WorkhubTaskPhotoModel();
        $photoId    = $photoModel->insert([
            'tenant_id'         => $this->tenantId,
            'task_id'           => $taskId ?: null,
            'uploaded_by'       => $this->userId,
            'photo_type'        => $photoType,
            'storage_path'      => $storageKey,
            'original_filename' => $file->getClientName(),
            'mime_type'         => $meta['mime'],
            'size_bytes'        => $fileSize,
        ], true);

        if (!$photoId) {
            return $this->failServerError('Failed to save photo record.');
        }

        // Generate pre-signed URL
        $signedUrl = $storage->presignUrl($storageKey);

        $this->logWorkhubEvent(
            'workhub.file.uploaded',
            $taskId,
            [],
            ['photo_id' => $photoId, 'type' => $photoType, 'size_bytes' => $fileSize],
            "Photo uploaded for task WH-{$taskId}"
        );

        return $this->respondCreated([
            'photo_id'   => $photoId,
            'url'        => $signedUrl,
            'photo_type' => $photoType,
            'mime_type'  => $meta['mime'],
            'size_bytes' => $fileSize,
        ]);
    }

    // GET /workhub/tasks/:id/documents — list generated documents for a task
    public function listForTask(int $taskId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $taskModel = new WorkhubTaskModel();
        $task = $taskModel->where('tenant_id', $this->tenantId)->find($taskId);
        if (!$task) {
            return $this->failNotFound('Task not found.');
        }

        $photoModel = new WorkhubTaskPhotoModel();
        $photos     = $photoModel->getForTask($taskId);

        $storage = new WorkHubStorageService();

        // Generate fresh pre-signed URLs for each photo
        $docs = array_map(function (array $p) use ($storage): array {
            return [
                'id'         => $p['id'],
                'photo_type' => $p['photo_type'],
                'mime_type'  => $p['mime_type'] ?? 'image/jpeg',
                'size_bytes' => $p['size_bytes'] ?? 0,
                'url'        => $storage->presignUrl($p['storage_path']),
                'created_at' => $p['created_at'],
            ];
        }, $photos);

        // Audit pre-signed URL generation — required for S3 access accountability
        $this->logWorkhubEvent(
            'workhub.file.urls_generated',
            $taskId,
            [],
            ['photo_count' => count($docs), 'url_ttl_seconds' => 900],
            "Pre-signed URLs generated for task WH-{$taskId} ({$this->request->getIPAddress()})"
        );

        return $this->respond(['data' => $docs]);
    }

    // GET /workhub/files/proxy — development-only local file server.
    // In production, S3 pre-signed URLs are used directly; this route is a no-op.
    public function proxy(): \CodeIgniter\HTTP\ResponseInterface
    {
        $key = $this->request->getGet('key') ?? '';
        $exp = (int) ($this->request->getGet('exp') ?? 0);
        $sig = $this->request->getGet('sig') ?? '';

        // Validate HMAC signature and expiry
        $expected = hash_hmac('sha256', $key . $exp, env('APP_KEY', 'dev'));
        if (!hash_equals($expected, $sig)) {
            return $this->response->setStatusCode(403)->setBody('Forbidden');
        }
        if (time() > $exp) {
            return $this->response->setStatusCode(410)->setBody('URL expired');
        }

        // Prevent path traversal: key must start with workhub/
        if (!str_starts_with($key, 'workhub/')) {
            return $this->response->setStatusCode(403)->setBody('Forbidden');
        }

        $localPath = WRITEPATH . 'uploads/' . $key;
        if (!file_exists($localPath) || !is_file($localPath)) {
            return $this->response->setStatusCode(404)->setBody('Not found');
        }

        $mime = mime_content_type($localPath) ?: 'application/octet-stream';
        return $this->response
            ->setStatusCode(200)
            ->setHeader('Content-Type', $mime)
            ->setHeader('Cache-Control', 'private, max-age=900')
            ->setBody(file_get_contents($localPath));
    }

    // ---- Private helpers ----

    private function handleIdentityPhotoReplacement(int $taskId, WorkHubStorageService $storage): void
    {
        $photoModel = new WorkhubTaskPhotoModel();

        // Find the worker linked to this task
        $db = \Config\Database::connect();
        $workerRow = $db->table('workhub_workers')
                        ->where('user_id', $this->userId)
                        ->where('tenant_id', $this->tenantId)
                        ->get()->getRowArray();

        if (!$workerRow) return;

        // Find all tasks assigned to this worker to look up existing identity photos
        $taskIds = $db->table('workhub_tasks')
                      ->select('id')
                      ->where('tenant_id', $this->tenantId)
                      ->where('assigned_worker_id', $workerRow['id'])
                      ->get()->getResultArray();

        $taskIdList = array_column($taskIds, 'id');
        if (empty($taskIdList)) return;

        $existing = $db->table('workhub_task_photos')
                       ->where('tenant_id', $this->tenantId)
                       ->where('photo_type', 'identity')
                       ->whereIn('task_id', $taskIdList)
                       ->get()->getResultArray();

        foreach ($existing as $old) {
            try { $storage->delete($old['storage_path']); } catch (\Throwable $e) {}
            $photoModel->delete($old['id']);
        }
    }
}
