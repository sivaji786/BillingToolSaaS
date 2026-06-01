<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Traits\PlanLimitTrait;
use App\Models\WorkhubTaskModel;
use App\Models\WorkhubProjectModel;
use App\Models\WorkhubCompletionRecordModel;
use App\Models\WorkhubMaterialEntryModel;
use App\Models\WorkhubTaskPhotoModel;
use App\Models\WorkhubWorkerModel;
use App\Services\WorkHubStorageService;

/**
 * WH-030: GET /api/workhub/print/{type}/{id}
 *
 * Types: work-order, completion-certificate, timesheet, project-status, invoice, consent-form
 * Renders the corresponding PHP view to HTML, then converts to PDF via dompdf if installed.
 * Falls back to inline HTML download if dompdf is not available.
 *
 * Plan limit: checkWorkhubPdfLimit() — returns 402 on breach.
 * Audit: logs workhub.pdf.generated on success.
 */
class PrintController extends BaseController
{
    use ResponseTrait, AuditTrait, PlanLimitTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private const VALID_TYPES = [
        'work-order',
        'completion-certificate',
        'timesheet',
        'project-status',
        'invoice',
        'consent-form',
    ];

    // Maps URL-safe type slug → view file name
    private const TYPE_TO_VIEW = [
        'work-order'             => 'workhub/pdf/work_order',
        'completion-certificate' => 'workhub/pdf/completion_certificate',
        'timesheet'              => 'workhub/pdf/timesheet',
        'project-status'         => 'workhub/pdf/project_status',
        'invoice'                => 'workhub/pdf/invoice',
        'consent-form'           => 'workhub/pdf/consent_form',
    ];

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // WH-030: GET /workhub/print/{type}/{id}
    public function generate(string $type, string $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!in_array($type, self::VALID_TYPES, true)) {
            return $this->fail('Invalid document type. Valid types: ' . implode(', ', self::VALID_TYPES), 400);
        }

        // Plan limit check
        $limitError = $this->checkWorkhubPdfLimit();
        if ($limitError !== null) {
            return $this->response->setStatusCode(402)->setJSON($limitError);
        }

        // Collect data for the requested document type
        try {
            $data = $this->collectData($type, (int) $id);
        } catch (\RuntimeException $e) {
            $code = $e->getCode();
            return $this->fail($e->getMessage(), in_array($code, [400, 403, 404, 422], true) ? $code : 400);
        }

        // Render HTML view
        $viewName = self::TYPE_TO_VIEW[$type];
        $html     = view($viewName, $data);

        // Convert to PDF (dompdf if available, else HTML download)
        $filename = $this->buildFilename($type, (int) $id);

        $pdfBlob = $this->renderPdf($html);

        // Audit
        $this->logWorkhubEvent(
            'workhub.pdf.generated',
            (int) $id,
            [],
            ['type' => $type, 'filename' => $filename],
            "PDF generated: {$type} for ID {$id}"
        );

        if ($pdfBlob !== null) {
            return $this->response
                ->setStatusCode(200)
                ->setHeader('Content-Type', 'application/pdf')
                ->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '.pdf"')
                ->setHeader('Content-Length', (string) strlen($pdfBlob))
                ->setBody($pdfBlob);
        }

        // Fallback: stream HTML
        return $this->response
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/html; charset=UTF-8')
            ->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '.html"')
            ->setBody($html);
    }

    // ---- Data collectors ----

    private function collectData(string $type, int $id): array
    {
        $base = ['lang' => $this->resolveLang()];

        return match ($type) {
            'work-order'             => $base + $this->dataWorkOrder($id),
            'completion-certificate' => $base + $this->dataCompletion($id),
            'timesheet'              => $base + $this->dataTimesheet($id),
            'project-status'         => $base + $this->dataProject($id),
            'invoice'                => $base + $this->dataInvoice($id),
            'consent-form'           => $base + $this->dataConsent($id),
        };
    }

    private function dataWorkOrder(int $taskId): array
    {
        $taskModel = new WorkhubTaskModel();
        $task = $taskModel->where('tenant_id', $this->tenantId)->find($taskId);
        if (!$task) throw new \RuntimeException('Task not found.', 404);

        $workerRow = null;
        if ($task['assigned_worker_id']) {
            $db = \Config\Database::connect();
            $workerRow = $db->table('workhub_workers w')
                ->select('w.*, u.name, u.email')
                ->join('users u', 'u.id = w.user_id', 'left')
                ->where('w.id', $task['assigned_worker_id'])
                ->where('w.tenant_id', $this->tenantId)
                ->get()->getRowArray();
        }

        $tenant = $this->resolveTenant();

        return [
            'task'   => $task,
            'worker' => $workerRow,
            'tenant' => $tenant,
        ];
    }

    private function dataCompletion(int $completionId): array
    {
        $completionModel = new WorkhubCompletionRecordModel();
        $record = $completionModel->find($completionId);
        if (!$record || (int) $record['tenant_id'] !== $this->tenantId) {
            throw new \RuntimeException('Completion record not found.', 404);
        }

        $taskModel     = new WorkhubTaskModel();
        $materialModel = new WorkhubMaterialEntryModel();
        $photoModel    = new WorkhubTaskPhotoModel();
        $storage       = new WorkHubStorageService();

        $task      = $taskModel->find((int) $record['task_id']);
        $materials = $materialModel->getForTask((int) $record['task_id'], $completionId);
        $photos    = $photoModel->getForTask((int) $record['task_id']);

        // Presign photo URLs for embedding in PDF
        foreach ($photos as &$p) {
            $p['signed_url'] = $storage->presignUrl($p['storage_path']);
        }
        unset($p);

        $materialTotal = array_sum(array_column($materials, 'total_price'));

        return [
            'completion'    => $record,
            'task'          => $task,
            'materials'     => $materials,
            'material_total' => $materialTotal,
            'photos'        => $photos,
            'tenant'        => $this->resolveTenant(),
        ];
    }

    private function dataTimesheet(int $workerId): array
    {
        $week = $this->request->getGet('week') ?? date('Y-m-d');

        $db         = \Config\Database::connect();
        $weekStart  = date('Y-m-d 00:00:00', strtotime('monday this week', strtotime($week)));
        $weekEnd    = date('Y-m-d 23:59:59', strtotime('sunday this week', strtotime($week)));

        $workerRow = $db->table('workhub_workers w')
            ->select('w.*, u.name, u.email')
            ->join('users u', 'u.id = w.user_id', 'left')
            ->where('w.id', $workerId)
            ->where('w.tenant_id', $this->tenantId)
            ->get()->getRowArray();

        if (!$workerRow) throw new \RuntimeException('Worker not found.', 404);

        $entries = $db->table('workhub_time_entries te')
            ->select('te.*, wt.title AS task_title')
            ->join('workhub_tasks wt', 'wt.id = te.task_id', 'left')
            ->where('te.tenant_id', $this->tenantId)
            ->where('te.worker_id', $workerRow['user_id'])
            ->where('te.started_at >=', $weekStart)
            ->where('te.started_at <=', $weekEnd)
            ->orderBy('te.started_at', 'ASC')
            ->get()->getResultArray();

        // Group by date
        $days = [];
        foreach ($entries as $e) {
            $date      = substr($e['started_at'], 0, 10);
            $endedAt   = $e['ended_at'] ?? date('Y-m-d H:i:s');
            $minutes   = (int) round((strtotime($endedAt) - strtotime($e['started_at'])) / 60);

            $days[$date][] = [
                'task_id'     => $e['task_id'],
                'task_title'  => $e['task_title'] ?? 'Unknown task',
                'entry_type'  => $e['entry_type'],
                'started_at'  => $e['started_at'],
                'ended_at'    => $e['ended_at'],
                'minutes'     => $minutes,
            ];
        }

        // Day summary
        $daySummaries = [];
        $totalWorkMin = 0;
        foreach ($days as $date => $dayEntries) {
            $workMin  = array_sum(array_column(
                array_filter($dayEntries, fn($r) => $r['entry_type'] === 'work'),
                'minutes'
            ));
            $breakMin = array_sum(array_column(
                array_filter($dayEntries, fn($r) => $r['entry_type'] === 'break'),
                'minutes'
            ));
            $totalWorkMin += $workMin;
            $daySummaries[] = [
                'date'         => $date,
                'entries'      => $dayEntries,
                'work_minutes' => $workMin,
                'break_minutes' => $breakMin,
                'overtime_flag' => $workMin > 480, // >8h
            ];
        }

        return [
            'worker'       => $workerRow,
            'week'         => $week,
            'week_start'   => substr($weekStart, 0, 10),
            'week_end'     => substr($weekEnd, 0, 10),
            'days'         => $daySummaries,
            'total_work_minutes' => $totalWorkMin,
            'tenant'       => $this->resolveTenant(),
        ];
    }

    private function dataProject(int $projectId): array
    {
        $projectModel = new WorkhubProjectModel();
        $project = $projectModel->where('tenant_id', $this->tenantId)->find($projectId);
        if (!$project) throw new \RuntimeException('Project not found.', 404);

        $db    = \Config\Database::connect();
        $tasks = $db->table('workhub_tasks')
                    ->where('tenant_id', $this->tenantId)
                    ->where('project_id', $projectId)
                    ->where('deleted_at IS NULL', null, false)
                    ->get()->getResultArray();

        $byStatus = [
            'open'        => 0,
            'in_progress' => 0,
            'done'        => 0,
            'problem'     => 0,
        ];
        foreach ($tasks as $t) {
            $byStatus[$t['status']] = ($byStatus[$t['status']] ?? 0) + 1;
        }

        $total    = count($tasks);
        $progress = $total > 0 ? round(($byStatus['done'] / $total) * 100) : 0;

        return [
            'project'    => $project,
            'tasks'      => $tasks,
            'by_status'  => $byStatus,
            'total'      => $total,
            'progress'   => $progress,
            'tenant'     => $this->resolveTenant(),
        ];
    }

    private function dataInvoice(int $completionId): array
    {
        // Invoice is generated from a completion record
        return $this->dataCompletion($completionId) + ['type' => 'invoice'];
    }

    private function dataConsent(int $completionId): array
    {
        $completionModel = new WorkhubCompletionRecordModel();
        $record = $completionModel->find($completionId);
        if (!$record || (int) $record['tenant_id'] !== $this->tenantId) {
            throw new \RuntimeException('Completion record not found.', 404);
        }

        $taskModel = new WorkhubTaskModel();
        $task = $taskModel->find((int) $record['task_id']);

        return [
            'completion' => $record,
            'task'       => $task,
            'tenant'     => $this->resolveTenant(),
        ];
    }

    // ---- PDF rendering ----

    private function renderPdf(string $html): ?string
    {
        if (!class_exists('\Dompdf\Dompdf')) {
            return null;
        }

        try {
            $options = new \Dompdf\Options();
            $options->set('defaultFont', 'Arial');
            $options->set('isRemoteEnabled', false);
            $options->set('isPhpEnabled', false);

            $dompdf = new \Dompdf\Dompdf($options);
            $dompdf->loadHtml($html, 'UTF-8');
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            return $dompdf->output();
        } catch (\Throwable $e) {
            log_message('error', '[PrintController::renderPdf] ' . $e->getMessage());
            return null;
        }
    }

    // ---- Helpers ----

    private function buildFilename(string $type, int $id): string
    {
        $slug = str_replace('-', '_', $type);
        return "workhub_{$slug}_{$id}_" . date('Ymd');
    }

    private function resolveLang(): string
    {
        // Prefer worker's export_language setting
        $db = \Config\Database::connect();
        $workerRow = $db->table('workhub_workers')
                        ->where('user_id', $this->userId)
                        ->where('tenant_id', $this->tenantId)
                        ->get()->getRowArray();

        if ($workerRow && !empty($workerRow['language_pref'])) {
            return $workerRow['language_pref'];
        }

        // Fall back to tenant settings
        $setting = $db->table('workhub_settings')
                      ->where('tenant_id', $this->tenantId)
                      ->get()->getRowArray();

        return $setting['pdf_language'] ?? 'en';
    }

    private function resolveTenant(): array
    {
        $tenant = config('App')->currentTenant ?? null;
        if ($tenant) {
            return [
                'id'           => $tenant->id ?? 0,
                'company_name' => $tenant->company_name ?? '',
                'logo_url'     => $tenant->logo_url ?? null,
            ];
        }
        return ['id' => $this->tenantId, 'company_name' => '', 'logo_url' => null];
    }
}
