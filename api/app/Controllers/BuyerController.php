<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\BuyerModel;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;

class BuyerController extends BaseController
{
    use ResponseTrait, AuditTrait;

    public function index()
    {
        try {
            $model = new BuyerModel();
            $buyers = $model->findAll();
            
            $transformed = array_map([$this, 'transformBuyer'], $buyers);
            
            return $this->response->setJSON($transformed)->setStatusCode(200);
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER LIST ERROR: ' . $e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $model = new BuyerModel();
            $buyer = $model->find($id);
            
            if (!$buyer) {
                return $this->failNotFound('Buyer not found');
            }
            
            return $this->response->setJSON($this->transformBuyer($buyer))->setStatusCode(200);
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER SHOW ERROR: ' . $e->getMessage());
        }
    }

    public function create()
    {
        try {
            $model = new BuyerModel();
            $data = $this->request->getJSON(true);
            
            $dbData = $this->mapToDb($data);
            
            if ($id = $model->insert($dbData)) {
                $this->logAction('created', 'BUYER', "Buyer created: " . ($dbData['name'] ?? 'Unknown'));
                return $this->respondCreated(['id' => $id, 'message' => 'Buyer created']);
            }
            
            return $this->fail($model->errors());
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER CREATE ERROR: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        try {
            $model = new BuyerModel();
            $data = $this->request->getJSON(true);
            
            $dbData = $this->mapToDb($data);

            if ($model->update($id, $dbData)) {
                $this->logAction('updated', 'BUYER', "Buyer updated: " . ($dbData['name'] ?? 'Unknown'));
                return $this->respond(['id' => $id, 'message' => 'Buyer updated']);
            }
            
            return $this->fail($model->errors());
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER UPDATE ERROR: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            $model = new BuyerModel();
            $buyer = $model->find($id);
            
            if (!$buyer) {
                return $this->failNotFound('Buyer not found');
            }
            
            if ($model->delete($id)) {
                $this->logAction('deleted', 'BUYER', "Buyer deleted: " . ($buyer['name'] ?? 'Unknown'));
                return $this->respondDeleted(['id' => $id, 'message' => 'Buyer deleted']);
            }
            
            return $this->fail('Delete failed');
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER DELETE ERROR: ' . $e->getMessage());
        }
    }

    private function mapToDb($data)
    {
        return [
            'name' => $data['name'] ?? null,
            'vat_id' => $data['vatId'] ?? null,
            'legal_organization_id' => $data['legalOrganizationId'] ?? null,
            'address_json' => isset($data['address']) ? json_encode($data['address']) : null,
            'contact_json' => isset($data['contact']) ? json_encode($data['contact']) : null,
        ];
    }

    private function transformBuyer($buyer)
    {
        $contact = isset($buyer['contact_json']) ? json_decode($buyer['contact_json'], true) : [];
        return [
            'id' => $buyer['id'],
            'name' => $buyer['name'],
            'vatId' => $buyer['vat_id'],
            'legalOrganizationId' => $buyer['legal_organization_id'] ?? null,
            'address' => isset($buyer['address_json']) ? json_decode($buyer['address_json'], true) : null,
            'contactEmail' => $contact['email'] ?? null,
            'contactPhone' => $contact['phone'] ?? null,
            'createdAt' => $buyer['created_at'],
            'updatedAt' => $buyer['updated_at'],
        ];
    }
}
