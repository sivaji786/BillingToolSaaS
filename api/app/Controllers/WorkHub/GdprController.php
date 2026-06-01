<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;

/**
 * GDPR Art. 15 — Right of access / data portability.
 * Returns all personal data held for the authenticated worker.
 * Every access is audit-logged per Art. 5(2) accountability principle.
 */
class GdprController extends BaseController
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

    // GET /workhub/my-data — GDPR Art. 15 data subject access request
    public function myData(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db = \Config\Database::connect();

        // Resolve worker record
        $worker = $db->table('workhub_workers w')
            ->select('w.*, u.name, u.email')
            ->join('users u', 'u.id = w.user_id', 'left')
            ->where('w.tenant_id', $this->tenantId)
            ->where('w.user_id', $this->userId)
            ->get()->getRowArray();

        if (!$worker) {
            return $this->failNotFound('No worker profile found for your account.');
        }

        $workerId = (int) $worker['id'];

        // Worker profile (personal data)
        $profile = [
            'name'                      => $worker['name'] ?? null,
            'email'                     => $worker['email'] ?? null,
            'role'                      => $worker['role'] ?? null,
            'capacity_hours_per_week'   => $worker['capacity_hours_per_week'] ?? null,
            'skills'                    => json_decode($worker['skills'] ?? '[]', true),
            'ui_language'               => $worker['ui_language'] ?? null,
            'export_language'           => $worker['export_language'] ?? null,
            'joined_at'                 => $worker['created_at'] ?? null,
        ];

        // All time entries (with task context)
        $timeEntries = $db->table('workhub_time_entries te')
            ->select('te.id, te.task_id, t.title AS task_title, te.entry_type, te.started_at, te.ended_at, te.break_minutes, te.notes, te.created_at')
            ->join('workhub_tasks t', 't.id = te.task_id', 'left')
            ->where('te.tenant_id', $this->tenantId)
            ->where('te.worker_id', $workerId)
            ->orderBy('te.started_at', 'ASC')
            ->get()->getResultArray();

        // Completion records (metadata only — no base64 signature blobs)
        $completions = $db->table('workhub_completion_records cr')
            ->select('cr.id, cr.task_id, t.title AS task_title, cr.worker_signed_at, cr.customer_signed_at, cr.copy_channel, cr.copy_status, cr.created_at')
            ->join('workhub_tasks t', 't.id = cr.task_id', 'left')
            ->where('cr.tenant_id', $this->tenantId)
            ->where('cr.worker_id', $workerId)
            ->orderBy('cr.created_at', 'DESC')
            ->get()->getResultArray();

        // Timesheet sign-offs
        $signoffs = $db->table('workhub_timesheet_signoffs')
            ->select('id, week, total_net_hours, signed_at, signed_ip, created_at')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', $workerId)
            ->orderBy('week', 'DESC')
            ->get()->getResultArray();

        // Photo records (metadata only — no pre-signed URLs; URLs are ephemeral)
        $photos = $db->table('workhub_task_photos p')
            ->select('p.id, p.task_id, t.title AS task_title, p.photo_type, p.mime_type, p.size_bytes, p.created_at')
            ->join('workhub_tasks t', 't.id = p.task_id', 'left')
            ->where('p.tenant_id', $this->tenantId)
            ->where('p.uploaded_by', $this->userId)
            ->orderBy('p.created_at', 'DESC')
            ->get()->getResultArray();

        // Inbox messages sent or received by this user
        $inboxMessages = $db->table('workhub_inbox_messages im')
            ->select('im.id, im.task_id, t.title AS task_title, im.sender_user_id, im.message_type, im.created_at')
            ->join('workhub_tasks t', 't.id = im.task_id', 'left')
            ->where('im.tenant_id', $this->tenantId)
            ->where('im.sender_user_id', $this->userId)
            ->orderBy('im.created_at', 'DESC')
            ->get()->getResultArray();

        // Audit this access — GDPR Art. 5(2) accountability
        $this->logWorkhubEvent(
            'workhub.gdpr.data_access',
            0,
            [],
            ['entries_count' => count($timeEntries), 'completions_count' => count($completions)],
            "GDPR Art.15 data export for worker #{$workerId}"
        );

        return $this->respond([
            'generated_at'     => date('c'),
            'legal_basis'      => 'GDPR Art. 15 — Right of access',
            'data_subject'     => [
                'user_id'   => $this->userId,
                'worker_id' => $workerId,
                'name'      => $profile['name'],
                'email'     => $profile['email'],
            ],
            'worker_profile'   => $profile,
            'time_entries'     => $timeEntries,
            'completion_records' => $completions,
            'timesheet_signoffs' => $signoffs,
            'photos'           => $photos,
            'inbox_messages'   => $inboxMessages,
            'retention_notice' => 'Records are retained for 10 years per §257 HGB / §147 AO. You may request erasure of non-mandatory data by contacting your administrator.',
        ]);
    }
}
