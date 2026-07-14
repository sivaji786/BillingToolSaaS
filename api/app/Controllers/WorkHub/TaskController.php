<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Traits\PlanLimitTrait;
use App\Models\WorkhubTaskModel;
use App\Models\WorkhubTimeEntryModel;
use App\Models\WorkhubCompletionRecordModel;
use App\Models\WorkhubMaterialEntryModel;
use App\Models\WorkhubTaskPhotoModel;
use App\Models\WorkhubInboxMessageModel;
use App\Services\WorkHubStorageService;

class TaskController extends BaseController
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

    // WH-013: GET /workhub/tasks
    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model = new WorkhubTaskModel();
        $db    = \Config\Database::connect();

        $status           = $this->request->getGet('status');
        $assignedWorkerId = $this->request->getGet('assigned_worker_id');
        $projectId        = $this->request->getGet('project_id');
        $priority         = $this->request->getGet('priority');
        $locationTag      = $this->request->getGet('location_tag');
        $dateFrom         = $this->request->getGet('date_from');   // YYYY-MM-DD, filters due_date >=
        $dateTo           = $this->request->getGet('date_to');     // YYYY-MM-DD, filters due_date <=
        $page             = max(1, (int) ($this->request->getGet('page') ?? 1));
        $perPage          = min(100, max(1, (int) ($this->request->getGet('per_page') ?? 20)));

        // WH-030: sortable task list — whitelist columns to avoid injecting arbitrary SQL
        $sortColumns = [
            'due_date'   => 'due_date',
            'created_at' => 'created_at',
            'title'      => 'title',
            'priority'   => "CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END",
        ];
        $sortKey  = $this->request->getGet('sort') ?: 'due_date';
        $sortExpr = $sortColumns[$sortKey] ?? $sortColumns['due_date'];
        $sortDir  = strtolower((string) $this->request->getGet('sort_dir')) === 'desc' ? 'DESC' : 'ASC';

        if ($status)      $model->where('status', $status);
        if ($projectId)   $model->where('project_id', (int) $projectId);
        if ($priority)    $model->where('priority', $priority);
        if ($locationTag) $model->where('location_tag', $locationTag);
        if ($dateFrom)    $model->where('due_date >=', $dateFrom);
        if ($dateTo)      $model->where('due_date <=', $dateTo);

        $model->where('tenant_id', $this->tenantId);

        // Client-role users may only see tasks within their linked customer's projects.
        // The link is established by workhub_customers.user_id matching the session user.
        $customer = $db->table('workhub_customers')
            ->select('id')
            ->where('tenant_id', $this->tenantId)
            ->where('user_id', $this->userId)
            ->get()->getRowArray();

        if ($customer) {
            // Restrict to projects belonging to this customer
            $projectIds = $db->table('workhub_projects')
                ->select('id')
                ->where('tenant_id', $this->tenantId)
                ->where('customer_id', (int) $customer['id'])
                ->get()->getResultArray();

            $allowedIds = array_column($projectIds, 'id');

            if (empty($allowedIds)) {
                // Customer has no projects yet — return empty result
                return $this->respond([
                    'data'       => [],
                    'unread_inbox_count' => 0,
                    'pagination' => ['page' => 1, 'per_page' => $perPage, 'total' => 0, 'last_page' => 1],
                ]);
            }

            $model->whereIn('project_id', $allowedIds);
        } elseif ($this->isPrivilegedUser($db)) {
            // Admins / planners / managers / finance may filter by any worker (optional).
            if ($assignedWorkerId) $model->where('assigned_worker_id', (int) $assignedWorkerId);
        } else {
            // Plain workers: always restrict to their own assigned tasks regardless of params.
            $workerRow = $db->table('workhub_workers')
                ->select('id')
                ->where('user_id', $this->userId)
                ->where('tenant_id', $this->tenantId)
                ->get()->getRowArray();

            if ($workerRow) {
                $model->where('assigned_worker_id', (int) $workerRow['id']);
            }
        }

        $total = $model->countAllResults(false);
        $tasks = $model->orderBy($sortExpr, $sortDir)
                       ->findAll($perPage, ($page - 1) * $perPage);

        $inboxModel = new WorkhubInboxMessageModel();
        $unread     = $inboxModel->getUnreadCount($this->tenantId, $this->userId);

        return $this->respond([
            'data'       => $tasks,
            'unread_inbox_count' => $unread,
            'pagination' => [
                'page'       => $page,
                'per_page'   => $perPage,
                'total'      => $total,
                'last_page'  => (int) ceil($total / $perPage),
            ],
        ]);
    }

    // WH-018: GET /workhub/tasks/batch-location — must be registered before tasks/(:num)
    public function batchLocation(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $locationTag = $this->request->getGet('location_tag');
        if (empty($locationTag)) {
            return $this->fail('location_tag query parameter is required.', 400);
        }

        $model = new WorkhubTaskModel();
        $tasks = $model->getByLocation($this->tenantId, $locationTag);

        return $this->respond(['data' => $tasks]);
    }

    // WH-017: GET /workhub/tasks/:id
    public function show(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model = new WorkhubTaskModel();
        $task  = $model->where('tenant_id', $this->tenantId)->find($id);

        if (!$task) {
            return $this->failNotFound('Task not found.');
        }

        // Enforce worker isolation on single-task view.
        $db = \Config\Database::connect();
        if (!$this->isPrivilegedUser($db)) {
            $customer = $db->table('workhub_customers')
                ->select('id')
                ->where('tenant_id', $this->tenantId)
                ->where('user_id', $this->userId)
                ->get()->getRowArray();

            if (!$customer) {
                $workerRow = $db->table('workhub_workers')
                    ->select('id')
                    ->where('user_id', $this->userId)
                    ->where('tenant_id', $this->tenantId)
                    ->get()->getRowArray();

                if (!$workerRow || (int) $task['assigned_worker_id'] !== (int) $workerRow['id']) {
                    return $this->failForbidden('Access denied.');
                }
            }
        }

        $timeEntryModel  = new WorkhubTimeEntryModel();
        $completionModel = new WorkhubCompletionRecordModel();
        $materialModel   = new WorkhubMaterialEntryModel();
        $photoModel      = new WorkhubTaskPhotoModel();

        $task['net_seconds']        = $timeEntryModel->getNetSecondsForTask($id);
        $task['net_hours_formatted'] = gmdate('H:i:s', $task['net_seconds']);
        $task['completion_record']  = $completionModel->getByTask($id);
        $task['materials']          = $materialModel->getForTask($id);
        $task['material_total']     = $materialModel->getTotalForTask($id);

        $storage = new WorkHubStorageService();
        $task['photos'] = array_map(function (array $p) use ($storage): array {
            return [
                'id'         => $p['id'],
                'photo_type' => $p['photo_type'],
                'url'        => $storage->presignUrl($p['storage_path']),
                'created_at' => $p['created_at'],
            ];
        }, $photoModel->getForTask($id));

        return $this->respond(['data' => $task]);
    }

    // WH-014: POST /workhub/tasks
    public function create(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->withinWorkhubTaskMonthlyLimit()) {
            return $this->fail('Monthly task limit reached. Please upgrade your plan.', 402);
        }

        $data = $this->request->getJSON(true) ?? [];

        if (empty($data['title'])) {
            return $this->fail('title is required.', 422);
        }

        $allowedPriorities = ['low', 'medium', 'high', 'urgent'];
        if (isset($data['priority']) && !in_array($data['priority'], $allowedPriorities, true)) {
            return $this->fail('Invalid priority.', 422);
        }

        $allowedTaskTypes = ['fault_resolution', 'commissioning', 'configuration', 'investigation', 'maintenance'];
        if (isset($data['task_type']) && !in_array($data['task_type'], $allowedTaskTypes, true)) {
            return $this->fail('Invalid task_type.', 422);
        }

        $insert = [
            'tenant_id'          => $this->tenantId,
            'created_by'         => $this->userId,
            'status'             => 'open',
            'title'              => trim($data['title']),
            'description'        => $data['description'] ?? null,
            'project_id'         => $data['project_id'] ?? null,
            'priority'           => $data['priority'] ?? 'medium',
            'est_hours'          => $data['est_hours'] ?? null,
            'assigned_worker_id' => $data['assigned_worker_id'] ?? null,
            'location_tag'       => $data['location_tag'] ?? null,
            'due_date'           => $data['due_date'] ?? null,
            'pfe_ref_type'       => $data['pfe_ref_type'] ?? null,
            'pfe_ref_id'         => $data['pfe_ref_id'] ?? null,
            'correlation_id'     => $data['correlation_id'] ?? null,
            'source_module'      => $data['source_module'] ?? 'manual',
            'task_type'          => $data['task_type'] ?? null,
        ];

        $model = new WorkhubTaskModel();
        $id    = $model->insert($insert, true);

        if (!$id) {
            return $this->failServerError('Failed to create task.');
        }

        $this->logAction('workhub.task.created', 'WH-' . $id, 'Task created: ' . $insert['title']);

        if (!empty($insert['assigned_worker_id'])) {
            $this->sendWorkerInboxMessage(
                (int) $insert['assigned_worker_id'],
                $id,
                'New task assigned: ' . $insert['title'],
                'A new task has been assigned to you. Ref: WH-' . $id
            );
        }

        return $this->respondCreated(['id' => $id, 'message' => 'Task created.']);
    }

    // WH-015: PUT /workhub/tasks/:id
    public function update(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db    = \Config\Database::connect();
        $model = new WorkhubTaskModel();
        $task  = $model->where('tenant_id', $this->tenantId)->find($id);

        if (!$task) {
            return $this->failNotFound('Task not found.');
        }

        $data = $this->request->getJSON(true) ?? [];

        // Privilege check: workers may only update status on their own assigned tasks.
        // Planners, managers, finance, and super-admins can edit all fields on any task.
        if (!$this->isPrivilegedUser($db)) {
            $workerRow = $db->table('workhub_workers')
                ->select('id')
                ->where('user_id', $this->userId)
                ->where('tenant_id', $this->tenantId)
                ->get()->getRowArray();

            $myWorkerId = $workerRow ? (int) $workerRow['id'] : 0;

            if ((int) $task['assigned_worker_id'] !== $myWorkerId) {
                return $this->failForbidden('You can only edit tasks assigned to you.');
            }

            // Workers can only change status — not reassign, rename, etc.
            $data = array_intersect_key($data, array_flip(['status']));
        }

        if (isset($data['status']) && $data['status'] !== $task['status']) {
            if (!$model->isValidTransition($task['status'], $data['status'])) {
                return $this->fail(
                    sprintf("Invalid status transition: '%s' → '%s'.", $task['status'], $data['status']),
                    422
                );
            }

            if ($data['status'] === 'done') {
                $completionModel = new WorkhubCompletionRecordModel();
                if (!$completionModel->getByTask($id)) {
                    return $this->fail(
                        "Task cannot be set to 'done' without a completion record. Submit a done report first.",
                        422
                    );
                }
            }
        }

        if (array_key_exists('project_id', $data) && $data['project_id'] !== null) {
            $projectExists = $db->table('workhub_projects')
                ->where('id', (int) $data['project_id'])
                ->where('tenant_id', $this->tenantId)
                ->countAllResults() > 0;

            if (!$projectExists) {
                return $this->fail('Invalid project_id.', 422);
            }
        }

        $updateData = array_intersect_key($data, array_flip([
            'title', 'description', 'status', 'priority', 'project_id',
            'est_hours', 'assigned_worker_id', 'location_tag', 'due_date',
        ]));

        if (empty($updateData)) {
            return $this->fail('No updatable fields provided.', 422);
        }

        $model->update($id, $updateData);

        $detail = isset($data['status'])
            ? "Status changed: {$task['status']} → {$data['status']}"
            : 'Task fields updated';
        $this->logAction('workhub.task.updated', 'WH-' . $id, $detail);

        // Notify newly assigned worker
        if (isset($data['assigned_worker_id']) && $data['assigned_worker_id'] !== $task['assigned_worker_id']) {
            $this->sendWorkerInboxMessage(
                (int) $data['assigned_worker_id'],
                $id,
                'Task assigned to you: ' . ($task['title'] ?? 'WH-' . $id),
                'Task WH-' . $id . ' has been assigned to you.'
            );
        }

        return $this->respond(['id' => $id, 'message' => 'Task updated.']);
    }

    // WH-016: DELETE /workhub/tasks/:id
    public function delete(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model = new WorkhubTaskModel();
        $task  = $model->where('tenant_id', $this->tenantId)->find($id);

        if (!$task) {
            return $this->failNotFound('Task not found.');
        }

        // Block deletion of dual-signed (billable) tasks
        $completionModel = new WorkhubCompletionRecordModel();
        $completion      = $completionModel->getByTask($id);
        if ($completion && $completionModel->isDualSigned($completion)) {
            return $this->fail(
                'Cannot delete a task with a dual-signed completion record (§257 HGB retention).',
                409
            );
        }

        $model->delete($id);
        $this->logAction('workhub.task.deleted', 'WH-' . $id, 'Task soft-deleted: ' . ($task['title'] ?? ''));

        return $this->respondDeleted(['id' => $id, 'message' => 'Task deleted.']);
    }

    private function sendWorkerInboxMessage(int $workhubWorkerId, int $taskId, string $subject, string $body): void
    {
        $db     = \Config\Database::connect();
        $worker = $db->table('workhub_workers')
            ->select('user_id')
            ->where('id', $workhubWorkerId)
            ->where('tenant_id', $this->tenantId)
            ->get()->getRowArray();

        if (!$worker) return;

        $inboxModel = new WorkhubInboxMessageModel();
        $inboxModel->insert([
            'tenant_id'         => $this->tenantId,
            'recipient_user_id' => (int) $worker['user_id'],
            'task_id'           => $taskId,
            'sender_type'       => 'planner',
            'sender_id'         => $this->userId ?: null,
            'subject'           => mb_substr($subject, 0, 255),
            'body'              => $body,
        ]);
    }

    // Returns true for super-admins and privileged WorkHub roles (planner/manager/finance).
    // wh_role is the sole source of truth for WorkHub privilege; system users.role is NOT used
    // here to avoid billing roles (owner/admin/manager) leaking into WorkHub access control.
    private function isPrivilegedUser(\CodeIgniter\Database\BaseConnection $db): bool
    {
        $workerRow = $db->table('workhub_workers')
            ->select('wh_role')
            ->where('user_id', $this->userId)
            ->where('tenant_id', $this->tenantId)
            ->get()->getRowArray();

        if ($workerRow && !empty($workerRow['wh_role'])) {
            return in_array($workerRow['wh_role'], ['planner', 'manager', 'finance'], true);
        }

        // No explicit wh_role — only super-admins are privileged; everyone else defaults to worker.
        return (bool) $db->table('user_roles ur')
            ->join('roles r', 'r.id = ur.role_id')
            ->where('ur.user_id', $this->userId)
            ->where('r.is_super_admin', 1)
            ->countAllResults();
    }
}
