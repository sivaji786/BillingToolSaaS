<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubProjectModel;

/**
 * WH-032: Project CRUD.
 *
 * GET    /workhub/projects           — list with task count, progress %, customer name
 * GET    /workhub/projects/{id}      — detail
 * POST   /workhub/projects           — create (requires workhub.project.manage)
 * PUT    /workhub/projects/{id}      — update (requires workhub.project.manage)
 * DELETE /workhub/projects/{id}      — soft delete (requires workhub.project.manage)
 */
class ProjectController extends BaseController
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

    // GET /workhub/projects
    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model    = new WorkhubProjectModel();
        $projects = $model->where('tenant_id', $this->tenantId)
                          ->orderBy('name', 'ASC')
                          ->findAll();

        $db = \Config\Database::connect();

        // Resolve current user's workhub_workers.id for per-worker count
        $myWorkerRow = $db->table('workhub_workers')
            ->select('id')
            ->where('user_id', $this->userId)
            ->where('tenant_id', $this->tenantId)
            ->where('active', 1)
            ->get()->getRow();
        $myWorkerId = $myWorkerRow ? (int) $myWorkerRow->id : null;

        foreach ($projects as &$p) {
            // Task counts by status
            $rows = $db->table('workhub_tasks')
                       ->select('status, COUNT(*) AS cnt')
                       ->where('tenant_id', $this->tenantId)
                       ->where('project_id', $p['id'])
                       ->where('deleted_at IS NULL', null, false)
                       ->groupBy('status')
                       ->get()->getResultArray();

            $counts = ['open' => 0, 'in_progress' => 0, 'done' => 0, 'problem' => 0];
            foreach ($rows as $r) {
                $counts[$r['status']] = (int) $r['cnt'];
            }
            $total = array_sum($counts);

            $p['task_count'] = $total;

            // Per-worker count (tasks assigned to the calling user)
            $p['my_task_count'] = $myWorkerId
                ? (int) $db->table('workhub_tasks')
                    ->where('tenant_id', $this->tenantId)
                    ->where('project_id', $p['id'])
                    ->where('assigned_worker_id', $myWorkerId)
                    ->where('deleted_at IS NULL', null, false)
                    ->countAllResults()
                : null;
            $p['tasks_by_status'] = $counts;
            $p['progress_pct'] = $total > 0 ? round(($counts['done'] / $total) * 100) : 0;

            // Customer name
            if ($p['customer_id']) {
                $customer = $db->table('workhub_customers')
                               ->select('name')
                               ->where('id', $p['customer_id'])
                               ->where('tenant_id', $this->tenantId)
                               ->get()->getRowArray();
                $p['customer_name'] = $customer['name'] ?? null;
            } else {
                $p['customer_name'] = null;
            }
        }
        unset($p);

        return $this->respond(['data' => $projects]);
    }

    // GET /workhub/projects/{id}
    public function show(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model   = new WorkhubProjectModel();
        $project = $model->where('tenant_id', $this->tenantId)->find($id);

        if (!$project) {
            return $this->failNotFound('Project not found.');
        }

        $db   = \Config\Database::connect();
        $tasks = $db->table('workhub_tasks')
                    ->where('tenant_id', $this->tenantId)
                    ->where('project_id', $id)
                    ->where('deleted_at IS NULL', null, false)
                    ->orderBy('due_date', 'ASC')
                    ->get()->getResultArray();

        $counts = ['open' => 0, 'in_progress' => 0, 'done' => 0, 'problem' => 0];
        foreach ($tasks as $t) $counts[$t['status']] = ($counts[$t['status']] ?? 0) + 1;
        $total = array_sum($counts);

        $project['tasks']         = $tasks;
        $project['task_count']    = $total;
        $project['tasks_by_status'] = $counts;
        $project['progress_pct']  = $total > 0 ? round(($counts['done'] / $total) * 100) : 0;

        if ($project['customer_id']) {
            $customer = $db->table('workhub_customers')
                           ->select('name, email, phone, company')
                           ->where('id', $project['customer_id'])
                           ->where('tenant_id', $this->tenantId)
                           ->get()->getRowArray();
            $project['customer'] = $customer;
        }

        return $this->respond(['data' => $project]);
    }

    // POST /workhub/projects
    public function create(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $data = $this->request->getJSON(true) ?? [];

        $insert = [
            'tenant_id'     => $this->tenantId,
            'name'          => trim($data['name'] ?? ''),
            'description'   => $data['description'] ?? null,
            'status'        => $data['status'] ?? 'active',
            'colour_accent' => $data['colour_accent'] ?? '#6d28d9',
            'customer_id'   => isset($data['customer_id']) ? (int) $data['customer_id'] : null,
            'started_at'    => $data['started_at'] ?? date('Y-m-d'),
            'due_at'        => $data['due_at'] ?? null,
        ];

        if (strlen($insert['name']) < 2) {
            return $this->fail('Project name must be at least 2 characters.', 422);
        }

        $model = new WorkhubProjectModel();
        $id    = $model->insert($insert, true);

        if (!$id) {
            return $this->failServerError('Failed to create project.');
        }

        $this->logWorkhubEvent('workhub.project.created', 0, [], $insert, "Project: {$insert['name']}");

        return $this->respondCreated(['data' => $model->find($id)]);
    }

    // PUT /workhub/projects/{id}
    public function update(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model   = new WorkhubProjectModel();
        $project = $model->where('tenant_id', $this->tenantId)->find($id);
        if (!$project) return $this->failNotFound('Project not found.');

        $data    = $this->request->getJSON(true) ?? [];
        $allowed = ['name', 'description', 'status', 'colour_accent', 'customer_id', 'started_at', 'due_at'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (isset($update['name']) && strlen(trim($update['name'])) < 2) {
            return $this->fail('Project name must be at least 2 characters.', 422);
        }

        $model->update($id, $update);

        $this->logWorkhubEvent('workhub.project.updated', 0, $project, $update, "Project: {$project['name']}");

        return $this->respond(['data' => $model->find($id)]);
    }

    // DELETE /workhub/projects/{id}
    public function delete(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model   = new WorkhubProjectModel();
        $project = $model->where('tenant_id', $this->tenantId)->find($id);
        if (!$project) return $this->failNotFound('Project not found.');

        // Block if project has tasks still open
        $db        = \Config\Database::connect();
        $openCount = $db->table('workhub_tasks')
                        ->where('tenant_id', $this->tenantId)
                        ->where('project_id', $id)
                        ->whereIn('status', ['open', 'in_progress'])
                        ->where('deleted_at IS NULL', null, false)
                        ->countAllResults();

        if ($openCount > 0) {
            return $this->fail(
                "Cannot delete project with {$openCount} open or in-progress task(s). Complete or reassign them first.",
                409
            );
        }

        $model->delete($id);

        $this->logWorkhubEvent('workhub.project.deleted', 0, $project, [], "Project: {$project['name']}");

        return $this->respond(['message' => 'Project deleted.']);
    }
}
