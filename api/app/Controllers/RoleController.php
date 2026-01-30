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
        // optionally filter by company_type_id if passed
        $companyTypeId = $this->request->getGet('company_type_id');
        
        if ($companyTypeId) {
            $roles = $model->where('company_type_id', $companyTypeId)->findAll();
        } else {
            $roles = $model->findAll();
        }
        
        return $this->response->setJSON($roles)->setStatusCode(200);
    }

    public function show($id = null)
    {
        $model = new RoleModel();
        $role = $model->find($id);

        if (!$role) {
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
        
        // Basic validation could be improved
        if (!$model->insert($data)) {
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

        if (!$model->find($id)) {
            return $this->failNotFound('Role not found');
        }

        if (!$model->update($id, $data)) {
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

        if (!$model->find($id)) {
            return $this->failNotFound('Role not found');
        }

        // Delete associations first (if no cascade)
        $roleRightModel->builder()->where('role_id', $id)->delete();
        
        // Delete role
        $model->delete($id);

        return $this->respondDeleted(['id' => $id, 'message' => 'Role deleted']);
    }
}
