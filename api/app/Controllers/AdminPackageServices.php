<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\PackageServiceModel;

class AdminPackageServices extends ResourceController
{
    use ResponseTrait, \App\Traits\AuditTrait;

    protected $format = 'json';
    protected $serviceModel;

    public function __construct()
    {
        $this->serviceModel = new PackageServiceModel();
    }

    /**
     * Get all services
     * GET /api/admin/package-services
     */
    public function index()
    {
        $onlyActive = $this->request->getGet('active');
        
        if ($onlyActive === 'true' || $onlyActive === '1') {
            $services = $this->serviceModel->where('is_active', 1)->orderBy('display_order', 'ASC')->orderBy('id', 'ASC')->findAll();
        } else {
            $services = $this->serviceModel->orderBy('display_order', 'ASC')->orderBy('id', 'ASC')->findAll();
        }

        // Transform slightly for frontend
        $mapped = array_map(function($service) {
            return [
                'id' => (string)$service['id'],
                'name' => $service['name'],
                'type' => $service['type'],
                'displayOrder' => (int)$service['display_order'],
                'description' => $service['description'],
                'isActive' => (bool)$service['is_active'],
                'createdAt' => $service['created_at'],
                'updatedAt' => $service['updated_at'],
            ];
        }, $services);

        return $this->response->setHeader('Cache-Control', 'public, max-age=3600')->setJSON([
            'success' => true,
            'data' => $mapped,
        ])->setStatusCode(200);
    }

    /**
     * Create a new service
     * POST /api/admin/package-services
     */
    public function create()
    {
        $data = $this->request->getJSON(true);

        if (!isset($data['name']) || !isset($data['type'])) {
            return $this->fail('Name and type are required');
        }

        $serviceData = [
            'name' => $data['name'],
            'type' => $data['type'],
            'display_order' => isset($data['displayOrder']) ? (int)$data['displayOrder'] : 0,
            'description' => $data['description'] ?? null,
            'is_active' => isset($data['isActive']) ? (bool)$data['isActive'] : true,
        ];

        $id = $this->serviceModel->insert($serviceData);

        if (!$id) {
            return $this->fail('Failed to create package service: ' . json_encode($this->serviceModel->errors()));
        }

        $this->logAction('created', "PACK-SRV-{$id}", "Package service created: {$serviceData['name']}");

        return $this->respondCreated([
            'success' => true,
            'message' => 'Package service created successfully',
            'data' => ['id' => $id],
        ]);
    }

    /**
     * Update an existing service
     * PUT /api/admin/package-services/:id
     */
    public function update($id = null)
    {
        $service = $this->serviceModel->find($id);

        if (!$service) {
            return $this->failNotFound('Package service not found');
        }

        $data = $this->request->getJSON(true);
        $updateData = [];

        if (isset($data['name'])) {
            $updateData['name'] = $data['name'];
        }
        if (isset($data['type'])) {
            $updateData['type'] = $data['type'];
        }
        if (isset($data['displayOrder'])) {
            $updateData['display_order'] = (int)$data['displayOrder'];
        }
        if (isset($data['description'])) {
            $updateData['description'] = $data['description'];
        }
        if (isset($data['isActive'])) {
            $updateData['is_active'] = (bool)$data['isActive'];
        }

        if (empty($updateData)) {
            return $this->fail('No data to update');
        }

        if (!$this->serviceModel->update($id, $updateData)) {
            return $this->fail('Failed to update package service');
        }

        $this->logAction('updated', "PACK-SRV-{$id}", "Package service updated: " . ($updateData['name'] ?? $service['name']));

        return $this->respond([
            'success' => true,
            'message' => 'Package service updated successfully',
        ]);
    }

    /**
     * Delete a service
     * DELETE /api/admin/package-services/:id
     */
    public function delete($id = null)
    {
        $service = $this->serviceModel->find($id);

        if (!$service) {
            return $this->failNotFound('Package service not found');
        }

        if (!$this->serviceModel->delete($id)) {
            return $this->fail('Failed to delete package service');
        }

        $this->logAction('deleted', "PACK-SRV-{$id}", "Package service deleted: {$service['name']}");

        return $this->respondDeleted([
            'success' => true,
            'message' => 'Package service deleted successfully',
        ]);
    }
}
