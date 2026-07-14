<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Traits\PlanLimitTrait;

/**
 * Sprint E — Server-side aggregate endpoints.
 *
 * GET /workhub/kanban        — tasks grouped by status (kanban column data)
 * GET /workhub/capacity      — per-worker utilisation, queue depth, free-from date
 * GET /workhub/finance/summary — billing aggregates for finance role
 */
class AggregateController extends BaseController
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

    // GET /workhub/kanban — tasks pre-grouped by status for the kanban board
    public function kanban(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db        = \Config\Database::connect();
        $projectId = (int) ($this->request->getGet('project_id') ?? 0);

        $builder = $db->table('workhub_tasks t')
            ->select('t.id, t.title, t.status, t.priority, t.est_hours, t.logged_hours, t.due_date, t.location_tag, t.assigned_worker_id, t.project_id, t.task_type, t.source_module, w.user_id AS worker_user_id')
            ->join('workhub_workers w', 'w.id = t.assigned_worker_id', 'left')
            ->where('t.tenant_id', $this->tenantId)
            ->where('t.deleted_at IS NULL')
            ->whereIn('t.status', ['open', 'in_progress', 'problem', 'done'])
            ->orderBy('FIELD(t.priority, "urgent", "high", "medium", "low")', 'DESC', false)
            ->orderBy('t.due_date', 'ASC');

        if ($projectId > 0) {
            $builder->where('t.project_id', $projectId);
        }

        $tasks = $builder->get()->getResultArray();

        // Group by status
        $columns = [
            'open'        => ['label' => 'Open',        'tasks' => []],
            'in_progress' => ['label' => 'In Progress',  'tasks' => []],
            'done'        => ['label' => 'Done',         'tasks' => []],
            'problem'     => ['label' => 'Problem',      'tasks' => []],
        ];

        foreach ($tasks as $t) {
            $status = $t['status'];
            if (isset($columns[$status])) {
                $columns[$status]['tasks'][] = $t;
            }
        }

        $summary = [];
        foreach ($columns as $status => $col) {
            $summary[] = [
                'status' => $status,
                'label'  => $col['label'],
                'count'  => count($col['tasks']),
                'tasks'  => $col['tasks'],
            ];
        }

        return $this->respond([
            'project_id' => $projectId ?: null,
            'columns'    => $summary,
            'total'      => count($tasks),
        ]);
    }

    // GET /workhub/capacity — per-worker utilisation and queue depth
    public function capacity(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db = \Config\Database::connect();

        // Resolve the current ISO week date range for utilisation
        $dt        = new \DateTime();
        $dt->setISODate((int) $dt->format('o'), (int) $dt->format('W'));
        $weekStart = $dt->format('Y-m-d');
        $dt->modify('+6 days');
        $weekEnd   = $dt->format('Y-m-d');

        // All workers for this tenant
        $workers = $db->table('workhub_workers w')
            ->select('w.id, w.user_id, w.wh_role AS role, w.capacity_hours_per_week, u.name, u.email')
            ->join('users u', 'u.id = w.user_id', 'left')
            ->where('w.tenant_id', $this->tenantId)
            ->get()->getResultArray();

        $workerIds = array_column($workers, 'id');
        if (empty($workerIds)) {
            return $this->respond(['workers' => [], 'week' => $weekStart . '/' . $weekEnd]);
        }

        // Hours logged this week per worker
        $hoursRows = $db->table('workhub_time_entries')
            ->select('worker_id, SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))) AS total_seconds')
            ->where('tenant_id', $this->tenantId)
            ->where('entry_type', 'work')
            ->where('started_at >=', $weekStart . ' 00:00:00')
            ->where('started_at <=', $weekEnd . ' 23:59:59')
            ->whereIn('worker_id', $workerIds)
            ->groupBy('worker_id')
            ->get()->getResultArray();

        $hoursMap = [];
        foreach ($hoursRows as $h) {
            $hoursMap[(int) $h['worker_id']] = round((int) $h['total_seconds'] / 3600, 2);
        }

        // Queue depth: count of open/in_progress tasks assigned to each worker
        $queueRows = $db->table('workhub_tasks')
            ->select('assigned_worker_id, COUNT(*) AS queue_depth')
            ->where('tenant_id', $this->tenantId)
            ->whereIn('status', ['open', 'in_progress'])
            ->where('deleted_at IS NULL')
            ->whereIn('assigned_worker_id', $workerIds)
            ->groupBy('assigned_worker_id')
            ->get()->getResultArray();

        $queueMap = [];
        foreach ($queueRows as $q) {
            $queueMap[(int) $q['assigned_worker_id']] = (int) $q['queue_depth'];
        }

        // Free-from date: latest due_date of in_progress tasks per worker
        $freeFromRows = $db->table('workhub_tasks')
            ->select('assigned_worker_id, MAX(due_date) AS free_from_date')
            ->where('tenant_id', $this->tenantId)
            ->where('status', 'in_progress')
            ->where('deleted_at IS NULL')
            ->whereIn('assigned_worker_id', $workerIds)
            ->groupBy('assigned_worker_id')
            ->get()->getResultArray();

        $freeFromMap = [];
        foreach ($freeFromRows as $f) {
            $freeFromMap[(int) $f['assigned_worker_id']] = $f['free_from_date'];
        }

        // Build response
        $result = [];
        foreach ($workers as $w) {
            $id             = (int) $w['id'];
            $capacity       = (float) ($w['capacity_hours_per_week'] ?? 40);
            $loggedHours    = $hoursMap[$id] ?? 0.0;
            $utilisationPct = $capacity > 0 ? round(($loggedHours / $capacity) * 100, 1) : 0.0;
            $queueDepth     = $queueMap[$id] ?? 0;

            $result[] = [
                'worker_id'              => $id,
                'user_id'                => (int) $w['user_id'],
                'name'                   => $w['name'] ?? '—',
                'email'                  => $w['email'] ?? null,
                'role'                   => $w['role'] ?? 'worker',
                'capacity_hours_per_week'=> $capacity,
                'logged_hours_this_week' => $loggedHours,
                'utilisation_pct'        => $utilisationPct,
                'queue_depth'            => $queueDepth,
                'queue_label'            => $queueDepth === 0 ? 'free'
                    : ($queueDepth <= 2 ? 'light' : ($queueDepth <= 5 ? 'busy' : 'overloaded')),
                'free_from_date'         => $freeFromMap[$id] ?? null,
            ];
        }

        // Sort by utilisation descending for dashboard display
        usort($result, fn ($a, $b) => $b['utilisation_pct'] <=> $a['utilisation_pct']);

        return $this->respond([
            'week_start' => $weekStart,
            'week_end'   => $weekEnd,
            'workers'    => $result,
        ]);
    }

    // GET /workhub/finance/summary — billing aggregates for finance role
    public function financeSummary(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db = \Config\Database::connect();

        // Get tenant billing settings
        $settingsRow = $db->table('workhub_settings')
            ->where('tenant_id', $this->tenantId)
            ->get()->getRowArray();

        $hourlyRate = (float) ($settingsRow['default_hourly_rate'] ?? 0);
        $currency   = $settingsRow['currency'] ?? 'EUR';
        $taxPct     = (float) ($settingsRow['tax_percent'] ?? 19);

        // Completed tasks with completion records
        $tasks = $db->table('workhub_tasks t')
            ->select('t.id, t.title, t.logged_hours, t.location_tag, t.project_id, cr.worker_signed_at, cr.customer_signed_at, cr.id AS completion_record_id')
            ->join('workhub_completion_records cr', 'cr.task_id = t.id', 'left')
            ->where('t.tenant_id', $this->tenantId)
            ->where('t.status', 'done')
            ->where('t.deleted_at IS NULL')
            ->orderBy('cr.customer_signed_at', 'DESC')
            ->get()->getResultArray();

        // Material totals per task
        $materialRows = $db->table('workhub_material_entries')
            ->select('task_id, SUM(total_price) AS materials_total')
            ->where('tenant_id', $this->tenantId)
            ->groupBy('task_id')
            ->get()->getResultArray();

        $materialsMap = [];
        foreach ($materialRows as $m) {
            $materialsMap[(int) $m['task_id']] = (float) $m['materials_total'];
        }

        $billableRows  = [];
        $grandLabour   = 0.0;
        $grandMaterials= 0.0;
        $dualSignedCnt = 0;

        foreach ($tasks as $t) {
            $hours      = (float) ($t['logged_hours'] ?? 0);
            $labour     = round($hours * $hourlyRate, 2);
            $materials  = $materialsMap[(int) $t['id']] ?? 0.0;
            $subtotal   = $labour + $materials;
            $tax        = round($subtotal * $taxPct / 100, 2);
            $total      = $subtotal + $tax;
            $dualSigned = !empty($t['customer_signed_at']);

            if ($dualSigned) $dualSignedCnt++;
            $grandLabour    += $labour;
            $grandMaterials += $materials;

            $billableRows[] = [
                'task_id'              => (int) $t['id'],
                'title'                => $t['title'],
                'location_tag'         => $t['location_tag'],
                'logged_hours'         => $hours,
                'labour'               => $labour,
                'materials_total'      => $materials,
                'subtotal'             => $subtotal,
                'tax'                  => $tax,
                'total'                => $total,
                'dual_signed'          => $dualSigned,
                'customer_signed_at'   => $t['customer_signed_at'],
                'completion_record_id' => $t['completion_record_id'] ? (int) $t['completion_record_id'] : null,
            ];
        }

        $grandSubtotal = $grandLabour + $grandMaterials;
        $grandTax      = round($grandSubtotal * $taxPct / 100, 2);
        $grandTotal    = $grandSubtotal + $grandTax;

        return $this->respond([
            'currency'         => $currency,
            'hourly_rate'      => $hourlyRate,
            'tax_percent'      => $taxPct,
            'summary'          => [
                'billable_task_count' => count($tasks),
                'dual_signed_count'   => $dualSignedCnt,
                'pending_sig_count'   => count($tasks) - $dualSignedCnt,
                'grand_labour'        => round($grandLabour, 2),
                'grand_materials'     => round($grandMaterials, 2),
                'grand_subtotal'      => round($grandSubtotal, 2),
                'grand_tax'           => $grandTax,
                'grand_total'         => round($grandTotal, 2),
            ],
            'tasks'            => $billableRows,
        ]);
    }
}
