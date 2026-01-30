<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\CompanyTypeModel;
use CodeIgniter\API\ResponseTrait;

class CompanyTypeController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $model = new CompanyTypeModel();
        $types = $model->findAll();
        // Return as is (id, name)
        return $this->response->setJSON($types)->setStatusCode(200);
    }

    public function create()
    {
        $model = new CompanyTypeModel();
        $data = $this->request->getJSON(true);

        // Basic validation
        if (empty($data['name'])) {
            return $this->failValidationError('Name is required');
        }

        // Check for duplicates
        if ($model->where('name', $data['name'])->first()) {
           return $this->fail('Company type name must be unique'); 
        }

        if (!$model->insert($data)) {
            return $this->failValidationError($model->errors());
        }

        return $this->respondCreated(['id' => $model->getInsertID(), 'message' => 'Company type created']);
    }

    public function update($id = null)
    {
        $model = new CompanyTypeModel();
        $data = $this->request->getJSON(true);

        if (!$model->find($id)) {
            return $this->failNotFound('Company type not found');
        }

        if (isset($data['name'])) {
             // Check for duplicates excluding current
            $existing = $model->where('name', $data['name'])->first();
            if ($existing && $existing['id'] != $id) {
                return $this->fail('Company type name must be unique');
            }
        }

        if (!$model->update($id, $data)) {
            return $this->failValidationError($model->errors());
        }

        return $this->response->setJSON(['id' => $id, 'message' => 'Company type updated'])->setStatusCode(200);
    }

    public function delete($id = null)
    {
        $model = new CompanyTypeModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('Company type not found');
        }

        // TODO: Check for dependencies (Roles, CompanyProfiles) before deleting?
        // For now, let's assume DB constraints or manual check is needed, 
        // but as per basic requirement, we allow delete.
        
        $model->delete($id);

        return $this->respondDeleted(['id' => $id, 'message' => 'Company type deleted']);
    }
}
