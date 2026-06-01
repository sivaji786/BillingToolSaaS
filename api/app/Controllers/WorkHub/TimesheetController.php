<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Traits\PlanLimitTrait;

class TimesheetController extends BaseController
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

    // WH-022: GET /workhub/timesheet
    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $workerId = (int) ($this->request->getGet('worker_id') ?? $this->userId);
        $week     = $this->request->getGet('week');   // ISO week: 2026-W22
        $month    = $this->request->getGet('month');  // 2026-05

        [$startDate, $endDate] = $this->resolveDateRange($week, $month);

        $db = \Config\Database::connect();

        // Fetch all work entries for the worker in the period (tenant-scoped)
        $entries = $db->table('workhub_time_entries AS te')
            ->select('te.*, t.title AS task_title, t.project_id')
            ->join('workhub_tasks t', 't.id = te.task_id', 'left')
            ->where('te.tenant_id', $this->tenantId)
            ->where('te.worker_id', $workerId)
            ->where('te.entry_type', 'work')
            ->where('te.started_at >=', $startDate . ' 00:00:00')
            ->where('te.started_at <=', $endDate . ' 23:59:59')
            ->orderBy('te.started_at', 'ASC')
            ->get()->getResultArray();

        // Group by date
        $byDate = [];
        foreach ($entries as $e) {
            $date = substr($e['started_at'], 0, 10);
            if (!isset($byDate[$date])) {
                $byDate[$date] = [
                    'date'           => $date,
                    'entries'        => [],
                    'total_net_hours' => 0.0,
                    'total_break_min' => 0,
                    'overtime_flag'  => false,
                ];
            }

            $endedAt   = $e['ended_at'] ?? date('Y-m-d H:i:s');
            $seconds   = max(0, strtotime($endedAt) - strtotime($e['started_at']));
            $netSeconds = max(0, $seconds - (int) ($e['break_minutes'] ?? 0) * 60);

            $byDate[$date]['entries'][] = [
                'id'         => $e['id'],
                'task_id'    => $e['task_id'],
                'task_title' => $e['task_title'] ?? '',
                'started_at' => $e['started_at'],
                'ended_at'   => $e['ended_at'],
                'net_hours'  => round($netSeconds / 3600, 2),
                'break_min'  => (int) ($e['break_minutes'] ?? 0),
                'notes'      => $e['notes'] ?? '',
            ];

            $byDate[$date]['total_net_hours'] += round($netSeconds / 3600, 4);
            $byDate[$date]['total_break_min'] += (int) ($e['break_minutes'] ?? 0);
        }

        // Also add break entries to break totals
        $breakEntries = $db->table('workhub_time_entries')
            ->select('DATE(started_at) AS entry_date, SUM(TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW()))) AS break_minutes')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', $workerId)
            ->where('entry_type', 'break')
            ->where('started_at >=', $startDate . ' 00:00:00')
            ->where('started_at <=', $endDate . ' 23:59:59')
            ->groupBy('entry_date')
            ->get()->getResultArray();

        foreach ($breakEntries as $b) {
            $d = $b['entry_date'];
            if (isset($byDate[$d])) {
                $byDate[$d]['total_break_min'] += (int) $b['break_minutes'];
            }
        }

        // Mark overtime (>8h net work)
        $totalNetHours = 0.0;
        foreach ($byDate as &$day) {
            $day['total_net_hours'] = round($day['total_net_hours'], 2);
            $day['overtime_flag']   = $day['total_net_hours'] > 8.0;
            $totalNetHours += $day['total_net_hours'];
        }
        unset($day);

        return $this->respond([
            'worker_id'       => $workerId,
            'period_start'    => $startDate,
            'period_end'      => $endDate,
            'total_net_hours' => round($totalNetHours, 2),
            'days'            => array_values($byDate),
        ]);
    }

    // WH-023b: POST /workhub/timesheet/signoff
    // EuGH C-55/18 requires workers to formally confirm their weekly time record.
    public function signoff(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $week = $this->request->getPost('week') ?? $this->request->getJSON(true)['week'] ?? null;

        if (!$week || !preg_match('/^\d{4}-W\d{1,2}$/', $week)) {
            return $this->fail('Invalid or missing week parameter (expected format: 2026-W22)', 422);
        }

        // Resolve the worker record for the current user
        $db = \Config\Database::connect();
        $worker = $db->table('workhub_workers')
            ->where('tenant_id', $this->tenantId)
            ->where('user_id', $this->userId)
            ->get()->getRowArray();

        if (!$worker) {
            return $this->fail('No worker profile found for your account.', 404);
        }

        $workerId = (int) $worker['id'];

        // Check for existing sign-off for this week
        $existing = $db->table('workhub_timesheet_signoffs')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', $workerId)
            ->where('week', $week)
            ->get()->getRowArray();

        if ($existing) {
            return $this->respond([
                'message'     => 'Week already signed off.',
                'signoff'     => $existing,
                'already_signed' => true,
            ]);
        }

        // Snapshot total hours for the week at sign-off time
        [$startDate, $endDate] = $this->resolveDateRange($week, null);

        $row = $db->table('workhub_time_entries')
            ->selectSum('TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))', 'total_seconds')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', $workerId)
            ->where('entry_type', 'work')
            ->where('started_at >=', $startDate . ' 00:00:00')
            ->where('started_at <=', $endDate . ' 23:59:59')
            ->get()->getRowArray();

        $totalNetHours = round((int) ($row['total_seconds'] ?? 0) / 3600, 2);

        $signoffData = [
            'tenant_id'        => $this->tenantId,
            'worker_id'        => $workerId,
            'week'             => $week,
            'total_net_hours'  => $totalNetHours,
            'signed_at'        => date('Y-m-d H:i:s'),
            'signed_ip'        => $this->request->getIPAddress(),
            'signed_user_agent'=> substr((string) $this->request->getUserAgent(), 0, 500),
            'created_at'       => date('Y-m-d H:i:s'),
        ];

        $db->table('workhub_timesheet_signoffs')->insert($signoffData);
        $signoffId = $db->insertID();

        $this->logAction(
            'workhub.timesheet.signoff',
            "week:{$week}:worker:{$workerId}",
            "Worker signed off timesheet for {$week} ({$totalNetHours}h)"
        );

        return $this->respondCreated(array_merge($signoffData, ['id' => $signoffId]));
    }

    // WH-023c: GET /workhub/timesheet/signoff-status
    // Returns the sign-off record for a given week, if it exists.
    public function signoffStatus(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $week = $this->request->getGet('week');
        if (!$week || !preg_match('/^\d{4}-W\d{1,2}$/', $week)) {
            return $this->fail('Invalid or missing week parameter', 422);
        }

        $db = \Config\Database::connect();
        $worker = $db->table('workhub_workers')
            ->where('tenant_id', $this->tenantId)
            ->where('user_id', $this->userId)
            ->get()->getRowArray();

        if (!$worker) {
            return $this->respond(['signed' => false]);
        }

        $signoff = $db->table('workhub_timesheet_signoffs')
            ->where('tenant_id', $this->tenantId)
            ->where('worker_id', (int) $worker['id'])
            ->where('week', $week)
            ->get()->getRowArray();

        return $this->respond([
            'signed'   => !empty($signoff),
            'signoff'  => $signoff ?: null,
        ]);
    }

    // WH-023: GET /workhub/timesheet/export
    // Full PDF rendering is implemented in Epic 6 (WH-030/PrintController).
    // This endpoint returns the structured timesheet payload; Sprint 5 wires the PDF view.
    public function export(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->withinWorkhubPdfLimit()) {
            return $this->fail('Monthly PDF export limit reached. Please upgrade your plan.', 402);
        }

        // Delegate data assembly to index() logic
        $data = json_decode((string) $this->index()->getBody(), true);

        $this->logAction(
            'workhub.pdf.generated',
            'WH-timesheet-' . ($this->request->getGet('worker_id') ?? $this->userId),
            'Timesheet export requested'
        );

        // Respond with the data payload; PDF rendering added in WH-030
        return $this->respond([
            'status'  => 'pdf_pending',
            'message' => 'Timesheet data ready. PDF rendering is enabled in Sprint 5 (WH-030).',
            'data'    => $data,
        ]);
    }

    // ---- helpers ----

    private function resolveDateRange(?string $week, ?string $month): array
    {
        if ($week) {
            // ISO week format: 2026-W22
            if (preg_match('/^(\d{4})-W(\d{1,2})$/', $week, $m)) {
                $dt        = new \DateTime();
                $dt->setISODate((int) $m[1], (int) $m[2]);
                $startDate = $dt->format('Y-m-d');
                $dt->modify('+6 days');
                $endDate   = $dt->format('Y-m-d');
                return [$startDate, $endDate];
            }
        }

        if ($month) {
            // Month format: 2026-05
            if (preg_match('/^(\d{4})-(\d{2})$/', $month, $m)) {
                $startDate = $m[1] . '-' . $m[2] . '-01';
                $endDate   = date('Y-m-t', strtotime($startDate));
                return [$startDate, $endDate];
            }
        }

        // Default: current ISO week
        $dt        = new \DateTime();
        $dt->setISODate((int) $dt->format('o'), (int) $dt->format('W'));
        $startDate = $dt->format('Y-m-d');
        $dt->modify('+6 days');
        $endDate   = $dt->format('Y-m-d');
        return [$startDate, $endDate];
    }
}
