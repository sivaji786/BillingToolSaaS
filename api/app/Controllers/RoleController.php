<?php

namespace App\Controllers;

use App\Models\RoleModel;
use App\Models\RoleRightModel;
use CodeIgniter\API\ResponseTrait;

class RoleController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $model = new RoleModel();
        $tenantId = $this->request->tenantId ?? null;
        $companyTypeId = $this->request->getGet('company_type_id');

        // Every tenant sees: its own custom roles (tenant_id = own tenant) plus the
        // global platform-seeded template roles (tenant_id IS NULL). Never another
        // tenant's custom roles.
        $query = $model->groupStart()
            ->where('tenant_id', $tenantId)
            ->orWhere('tenant_id IS NULL', null, false)
            ->groupEnd();

        if ($companyTypeId) {
            // Include roles for the requested type AND global roles (company_type_id IS NULL)
            $query->groupStart()
                  ->where('company_type_id', $companyTypeId)
                  ->orWhere('company_type_id IS NULL', null, false)
                  ->groupEnd();
        }

        return $this->response->setJSON($query->findAll())->setStatusCode(200);
    }

    public function show($id = null)
    {
        $model = new RoleModel();
        $role = $model->find($id);

        if (!$role || !$this->roleVisibleToCurrentTenant($role)) {
            return $this->failNotFound('Role not found');
        }

        // Fetch assigned rights
        $roleRightModel = new RoleRightModel();
        $rights = $roleRightModel->builder()
            ->select('rights.*')
            ->join('rights', 'rights.id = role_rights.right_id')
            ->where('role_rights.role_id', $id)
            ->get()
            ->getResultArray();

        $role['rights'] = $rights;

        return $this->response->setJSON($role)->setStatusCode(200);
    }

    public function create()
    {
        $model = new RoleModel();
        $roleRightModel = new RoleRightModel();
        $data = $this->request->getJSON(true);

        // Whitelist explicitly rather than passing the raw request body through — is_super_admin
        // is never accepted from a client, and tenant_id is always the caller's own tenant, never
        // client-supplied. (RoleModel::$allowedFields also blocks is_super_admin as a second layer.)
        $roleData = [
            'tenant_id'       => $this->request->tenantId ?? null,
            'name'            => $data['name'] ?? null,
            'department'      => $data['department'] ?? null,
            'description'     => $data['description'] ?? null,
            'company_type_id' => $data['company_type_id'] ?? null,
        ];

        if (!$model->insert($roleData)) {
            return $this->failValidationError($model->errors());
        }

        $roleId = $model->getInsertID();

        // Assign rights if provided
        if (isset($data['rights']) && is_array($data['rights'])) {
            foreach ($data['rights'] as $rightId) {
                // Check uniqueness or just insert (assuming clean input)
                $roleRightModel->builder()->insert([
                    'role_id' => $roleId,
                    'right_id' => $rightId
                ]);
            }
        }

        return $this->respondCreated(['id' => $roleId, 'message' => 'Role created']);
    }

    public function update($id = null)
    {
        $model = new RoleModel();
        $roleRightModel = new RoleRightModel();
        $data = $this->request->getJSON(true);

        $role = $model->find($id);
        if (!$role || !$this->roleOwnedByCurrentTenant($role)) {
            return $this->failNotFound('Role not found');
        }

        // Whitelist: same reasoning as create() — is_super_admin/tenant_id are never
        // accepted from the request body.
        $updateData = [];
        foreach (['name', 'department', 'description', 'company_type_id'] as $field) {
            if (array_key_exists($field, $data)) {
                $updateData[$field] = $data[$field];
            }
        }

        if (!empty($updateData) && !$model->update($id, $updateData)) {
            return $this->failValidationError($model->errors());
        }

        // Sync rights if provided
        if (isset($data['rights']) && is_array($data['rights'])) {
            // Delete existing
            $roleRightModel->builder()->where('role_id', $id)->delete();

            // Insert new
            foreach ($data['rights'] as $rightId) {
                $roleRightModel->builder()->insert([
                    'role_id' => $id,
                    'right_id' => $rightId
                ]);
            }
        }

        return $this->response->setJSON(['id' => $id, 'message' => 'Role updated'])->setStatusCode(200);
    }

    public function delete($id = null)
    {
        $model = new RoleModel();
        $roleRightModel = new RoleRightModel();

        $role = $model->find($id);
        if (!$role || !$this->roleOwnedByCurrentTenant($role)) {
            return $this->failNotFound('Role not found');
        }

        // Delete associations first (if no cascade)
        $roleRightModel->builder()->where('role_id', $id)->delete();

        // Delete role
        $model->delete($id);

        return $this->respondDeleted(['id' => $id, 'message' => 'Role deleted']);
    }

    /**
     * Read-only visibility: a tenant may view its own custom roles plus the global
     * platform-seeded template roles (tenant_id IS NULL).
     */
    private function roleVisibleToCurrentTenant(array $role): bool
    {
        $tenantId = $this->request->tenantId ?? null;
        return $role['tenant_id'] === null || (string) $role['tenant_id'] === (string) $tenantId;
    }

    /**
     * Write access: a tenant may only mutate/delete roles it created itself. Global
     * template roles (tenant_id IS NULL) are shared across every tenant that uses
     * them, so no single tenant may edit or delete them via this API.
     */
    private function roleOwnedByCurrentTenant(array $role): bool
    {
        $tenantId = $this->request->tenantId ?? null;
        return $tenantId !== null && (string) $role['tenant_id'] === (string) $tenantId;
    }
}
