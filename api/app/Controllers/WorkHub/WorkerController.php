<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubWorkerModel;

/**
 * WH-031: Worker endpoints.
 *
 * GET  /workhub/workers             — list all active workers with computed capacity
 * GET  /workhub/workers/{id}        — single worker detail
 * GET  /workhub/profile             — current user's worker profile
 * PATCH /workhub/profile            — update current user's worker profile
 */
class WorkerController extends BaseController
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

    private function isSuperAdmin(): bool
    {
        $db = \Config\Database::connect();
        return (bool) $db->table('user_roles ur')
            ->join('roles r', 'r.id = ur.role_id')
            ->where('ur.user_id', $this->userId)
            ->where('r.is_super_admin', 1)
            ->countAllResults();
    }

    private function callerWhRole(): ?string
    {
        $db  = \Config\Database::connect();
        $row = $db->table('workhub_workers')
            ->select('wh_role')
            ->where('user_id', $this->userId)
            ->where('tenant_id', $this->tenantId)
            ->get()->getRowArray();

        return $row['wh_role'] ?? null;
    }

    // Onboarding/offboarding a worker — same privilege bar as WorkHub Settings
    // (SettingsController::isPrivilegedUser()): planner/manager/finance or super-admin.
    private function isPrivilegedUser(): bool
    {
        if ($this->isSuperAdmin()) return true;
        return in_array($this->callerWhRole() ?? '', ['planner', 'manager', 'finance'], true);
    }

    // Changing WHO holds manager/finance/planner is a stricter action than onboarding a
    // worker — only an existing Manager (or super-admin) may grant it, otherwise any
    // privileged-but-lesser role (e.g. Finance) could PATCH its own wh_role to escalate.
    private function isManagerOrSuperAdmin(): bool
    {
        if ($this->isSuperAdmin()) return true;
        return $this->callerWhRole() === 'manager';
    }

    // WH-031: GET /workhub/workers
    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model   = new WorkhubWorkerModel();
        $workers = $model->getWithCapacity($this->tenantId);

        // Enrich with user name. role comes from wh_role only — never from users.role.
        $db = \Config\Database::connect();
        foreach ($workers as &$w) {
            $user = $db->table('users')
                       ->select('name, email')
                       ->where('id', $w['user_id'])
                       ->get()->getRowArray();
            $w['name']  = $user['name']  ?? 'Unknown';
            $w['email'] = $user['email'] ?? '';
            // Effective WorkHub role: use wh_role if set, otherwise 'worker'.
            $w['role']  = !empty($w['wh_role']) ? $w['wh_role'] : 'worker';
            // Decode skills JSON
            if (!empty($w['skills_json'])) {
                $decoded = json_decode($w['skills_json'], true);
                $w['skills'] = is_array($decoded) ? $decoded : [$w['skills_json']];
            } else {
                $w['skills'] = [];
            }
            unset($w['skills_json']);
        }
        unset($w);

        return $this->respond(['data' => $workers]);
    }

    // GET /workhub/workers/available — tenant users not yet active workers
    public function available(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db = \Config\Database::connect();

        $existingIds = array_column(
            $db->table('workhub_workers')
               ->select('user_id')
               ->where('tenant_id', $this->tenantId)
               ->where('active', 1)
               ->get()->getResultArray(),
            'user_id'
        );

        $query = $db->table('users')
                    ->select('id, name, email, role')
                    ->where('tenant_id', $this->tenantId);

        if (!empty($existingIds)) {
            $query->whereNotIn('id', $existingIds);
        }

        return $this->respond(['data' => $query->get()->getResultArray()]);
    }

    // POST /workhub/workers — add a user as a worker
    public function store(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->isPrivilegedUser()) {
            return $this->failForbidden('Only planners, managers, finance, or super-admins may add workers.');
        }

        $data   = $this->request->getJSON(true) ?? [];
        $userId = (int) ($data['user_id'] ?? 0);

        if (!$userId) {
            return $this->fail('user_id is required.', 422);
        }

        $db   = \Config\Database::connect();
        $user = $db->table('users')
                   ->select('id, name, email, role')
                   ->where('id', $userId)
                   ->where('tenant_id', $this->tenantId)
                   ->get()->getRowArray();

        if (!$user) {
            return $this->failNotFound('User not found in this workspace.');
        }

        $model    = new WorkhubWorkerModel();
        $existing = $model->where('user_id', $userId)
                          ->where('tenant_id', $this->tenantId)
                          ->first();

        if ($existing) {
            if ((int) $existing['active'] === 1) {
                return $this->fail('This user is already an active worker.', 409);
            }
            $model->update($existing['id'], ['active' => 1]);
            $workerId = $existing['id'];
        } else {
            try {
                $workerId = $model->insert([
                    'tenant_id'               => $this->tenantId,
                    'user_id'                 => $userId,
                    'capacity_hours_per_week' => (float) ($data['capacity_hours_per_week'] ?? 40),
                    'active'                  => 1,
                ], true);
            } catch (\RuntimeException $e) {
                // Thrown by UsageEnforcement::checkLimits() when the tenant's plan
                // worker-seat limit is reached.
                return $this->fail($e->getMessage(), 422, 'workhub_workers');
            }
        }

        $this->assignWorkerRole($db, $userId);

        $this->logAction('workhub.worker.added', 'WH-worker-' . $workerId, 'Worker added: ' . $user['name']);

        return $this->respondCreated(['data' => $model->find($workerId), 'user' => $user]);
    }

    // PATCH /workhub/workers/{id}/role — set WorkHub-specific role override
    public function setRole(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->isManagerOrSuperAdmin()) {
            return $this->failForbidden('Only a Manager or super-admin may change a worker\'s WorkHub role.');
        }

        $model  = new WorkhubWorkerModel();
        $worker = $model->where('id', $id)
                        ->where('tenant_id', $this->tenantId)
                        ->first();

        if (!$worker) {
            return $this->failNotFound('Worker not found.');
        }

        $data    = $this->request->getJSON(true) ?? [];
        $whRole  = $data['wh_role'] ?? null;

        $allowed = ['worker', 'planner', 'manager', 'finance', 'client', null, ''];
        if (!in_array($whRole, $allowed, true)) {
            return $this->fail('Invalid wh_role. Allowed: worker, planner, manager, finance, client (or null to clear).', 422);
        }

        $model->update($id, ['wh_role' => ($whRole === '' ? null : $whRole)]);

        return $this->respond(['message' => 'WorkHub role updated.']);
    }

    // DELETE /workhub/workers/{id} — deactivate worker
    public function destroy(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->isPrivilegedUser()) {
            return $this->failForbidden('Only planners, managers, finance, or super-admins may remove workers.');
        }

        $model  = new WorkhubWorkerModel();
        $worker = $model->where('id', $id)
                        ->where('tenant_id', $this->tenantId)
                        ->first();

        if (!$worker) {
            return $this->failNotFound('Worker not found.');
        }

        $model->update($id, ['active' => 0]);

        $this->logAction('workhub.worker.removed', 'WH-worker-' . $id, 'Worker deactivated: ' . $id);

        return $this->respond(['message' => 'Worker removed.']);
    }

    // Grants the "WorkHub Worker" role to a user if they don't already have it.
    private function assignWorkerRole(\CodeIgniter\Database\BaseConnection $db, int $userId): void
    {
        $role = $db->table('roles')->where('name', 'WorkHub Worker')->get()->getRow();
        if (!$role) return;

        $already = $db->table('user_roles')
            ->where('user_id', $userId)
            ->where('role_id', $role->id)
            ->countAllResults();

        if (!$already) {
            $db->table('user_roles')->insert(['user_id' => $userId, 'role_id' => $role->id]);
        }
    }

    // GET /workhub/workers/{id}
    public function show(int $workerId): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model  = new WorkhubWorkerModel();
        $worker = $model->where('id', $workerId)
                        ->where('tenant_id', $this->tenantId)
                        ->first();

        if (!$worker) {
            return $this->failNotFound('Worker not found.');
        }

        $db   = \Config\Database::connect();
        $user = $db->table('users')
                   ->select('name, email, role')
                   ->where('id', $worker['user_id'])
                   ->get()->getRowArray();

        $worker['name']  = $user['name']  ?? 'Unknown';
        $worker['email'] = $user['email'] ?? '';
        $worker['role']  = $user['role']  ?? '';

        if (!empty($worker['skills_json'])) {
            $decoded = json_decode($worker['skills_json'], true);
            $worker['skills'] = is_array($decoded) ? $decoded : [$worker['skills_json']];
        } else {
            $worker['skills'] = [];
        }
        unset($worker['skills_json']);

        // Compute capacity inline
        $workers = (new WorkhubWorkerModel())->getWithCapacity($this->tenantId);
        $cap     = array_values(array_filter($workers, fn($w) => (int) $w['id'] === $workerId));
        if ($cap) {
            $worker['utilisation_pct']    = $cap[0]['utilisation_pct'];
            $worker['utilisation_colour'] = $cap[0]['utilisation_colour'];
            $worker['queue_depth']        = $cap[0]['queue_depth'];
            $worker['free_from_date']     = $cap[0]['free_from_date'];
        }

        return $this->respond(['data' => $worker]);
    }

    // GET /workhub/profile — current user's own worker profile
    public function profile(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $db = \Config\Database::connect();

        // Resolve worker record for this user
        $worker = $db->table('workhub_workers w')
                     ->select('w.*, u.name, u.email, u.role')
                     ->join('users u', 'u.id = w.user_id', 'left')
                     ->where('w.user_id', $this->userId)
                     ->where('w.tenant_id', $this->tenantId)
                     ->get()->getRowArray();

        if (!$worker) {
            // Auto-create minimal worker profile on first access
            $model    = new WorkhubWorkerModel();
            $workerId = $model->insert([
                'tenant_id'               => $this->tenantId,
                'user_id'                 => $this->userId,
                'capacity_hours_per_week' => 40,
                'active'                  => 1,
            ], true);

            $this->assignWorkerRole($db, $this->userId);

            $worker = $db->table('workhub_workers w')
                         ->select('w.*, u.name, u.email, u.role')
                         ->join('users u', 'u.id = w.user_id', 'left')
                         ->where('w.id', $workerId)
                         ->get()->getRowArray();
        } else {
            // Ensure existing workers always have the WorkHub Worker role
            $this->assignWorkerRole($db, $this->userId);
        }

        // Decode skills
        if (!empty($worker['skills_json'])) {
            $decoded = json_decode($worker['skills_json'], true);
            $worker['skills'] = is_array($decoded) ? $decoded : explode(',', $worker['skills_json']);
        } else {
            $worker['skills'] = [];
        }
        unset($worker['skills_json']);

        // Check identity photo
        $hasIdentityPhoto = false;
        if ($worker['id'] ?? 0) {
            $taskIds = $db->table('workhub_tasks')
                          ->select('id')
                          ->where('tenant_id', $this->tenantId)
                          ->where('assigned_worker_id', $worker['id'])
                          ->get()->getResultArray();
            $tidList = array_column($taskIds, 'id');
            if (!empty($tidList)) {
                $hasIdentityPhoto = (bool) $db->table('workhub_task_photos')
                                              ->where('tenant_id', $this->tenantId)
                                              ->where('photo_type', 'identity')
                                              ->whereIn('task_id', $tidList)
                                              ->countAllResults();
            }
        }

        $worker['has_identity_photo'] = $hasIdentityPhoto;
        $worker['ui_language']     = $worker['language_pref'] ?? 'en';
        $worker['export_language'] = $worker['language_pref'] ?? 'en';

        // Resolve effective WorkHub role.
        // wh_role is the sole source of truth for role/privilege in WorkHub.
        // system users.role is intentionally NOT used — billing roles (owner/admin/manager)
        // must not leak into WorkHub access control.
        if (!empty($worker['wh_role'])) {
            $worker['role']     = $worker['wh_role'];
            $worker['is_admin'] = false;
        } else {
            $isSuperAdmin = (bool) $db->table('user_roles')
                ->join('roles', 'roles.id = user_roles.role_id')
                ->where('user_roles.user_id', $this->userId)
                ->where('roles.is_super_admin', 1)
                ->countAllResults();
            // Super-admins get manager-level access by default; everyone else defaults to worker.
            $worker['role']     = $isSuperAdmin ? 'manager' : 'worker';
            $worker['is_admin'] = $isSuperAdmin;
        }

        return $this->respond(['data' => $worker]);
    }

    // PATCH /workhub/profile — update capacity, skills, language
    public function updateProfile(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $data = $this->request->getJSON(true) ?? [];

        $db     = \Config\Database::connect();
        $worker = $db->table('workhub_workers')
                     ->where('user_id', $this->userId)
                     ->where('tenant_id', $this->tenantId)
                     ->get()->getRowArray();

        if (!$worker) {
            return $this->failNotFound('Worker profile not found. Fetch GET /profile first to auto-create.');
        }

        $update = [];

        if (isset($data['capacity_hours_per_week'])) {
            $cap = (float) $data['capacity_hours_per_week'];
            if ($cap < 1 || $cap > 168) {
                return $this->fail('capacity_hours_per_week must be between 1 and 168.', 422);
            }
            $update['capacity_hours_per_week'] = $cap;
        }

        if (isset($data['skills'])) {
            $skills = is_array($data['skills']) ? $data['skills'] : explode(',', (string) $data['skills']);
            $skills = array_values(array_filter(array_map('trim', $skills)));
            $update['skills_json'] = json_encode($skills);
        }

        if (isset($data['ui_language']) || isset($data['export_language'])) {
            $lang = $data['ui_language'] ?? $data['export_language'] ?? 'en';
            if (!in_array($lang, ['en', 'de', 'pl', 'fr', 'it'], true)) {
                return $this->fail('Invalid language. Supported: en, de, pl, fr, it.', 422);
            }
            $update['language_pref'] = $lang;
        }

        if (!empty($update)) {
            $model = new WorkhubWorkerModel();
            $model->update($worker['id'], $update);
        }

        return $this->respond(['message' => 'Profile updated.']);
    }
}
