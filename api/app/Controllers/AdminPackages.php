<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\PlanModel;

class AdminPackages extends ResourceController
{
    use ResponseTrait, \App\Traits\AuditTrait;

    protected $format = 'json';
    protected $planModel;

    public function __construct()
    {
        $this->planModel = new PlanModel();
    }

    /**
     * Get all packages
     * GET /api/admin/packages
     */
    public function index()
    {
        $page = $this->request->getGet('page') ?? 1;
        $limit = $this->request->getGet('limit') ?? 10;

        // Get all plans from database
        $plans = $this->planModel->findAll();

        // Transform data for frontend
        $packages = array_map(function($plan) {
            return [
                'id' => (string)$plan['id'],
                'name' => $plan['name'],
                'description' => $plan['slug'], // Using slug as description for now
                'price' => (float)$plan['price'],
                'currency' => $plan['currency'] ?? 'EUR',
                'duration' => $plan['billing_period'],
                'features' => json_decode($plan['features'], true) ?? [],
                'status' => $plan['is_active'] ? 'active' : 'inactive',
                'isTrailing' => (bool)$plan['is_trailing'],
                'isPublic' => (bool)$plan['is_public'],
                'createdAt' => $plan['created_at'],
                'updatedAt' => $plan['updated_at'],
            ];
        }, $plans);

        return $this->response->setJSON([
            'data' => $packages,
            'pagination' => [
                'currentPage' => (int)$page,
                'totalPages' => 1,
                'totalItems' => count($packages),
                'itemsPerPage' => (int)$limit,
            ],
        ])->setStatusCode(200);
    }

    /**
     * Get package by ID
     * GET /api/admin/packages/:id
     */
    public function show($id = null)
    {
        $plan = $this->planModel->find($id);

        if (!$plan) {
            return $this->failNotFound('Package not found');
        }

        // Transform data for frontend
        $package = [
            'id' => (string)$plan['id'],
            'name' => $plan['name'],
            'description' => $plan['slug'],
            'price' => (float)$plan['price'],
            'currency' => $plan['currency'] ?? 'EUR',
            'duration' => $plan['billing_period'],
            'features' => json_decode($plan['features'], true) ?? [],
            'status' => $plan['is_active'] ? 'active' : 'inactive',
            'isTrailing' => (bool)$plan['is_trailing'],
            'isPublic' => (bool)$plan['is_public'],
            'createdAt' => $plan['created_at'],
            'updatedAt' => $plan['updated_at'],
        ];

        return $this->response->setJSON([
            'success' => true,
            'data' => $package,
        ])->setStatusCode(200);
    }

    /**
     * Create new package
     * POST /api/admin/packages
     */
    public function create()
    {
        $data = $this->request->getJSON(true);

        // Validate required fields
        if (!isset($data['name']) || !isset($data['price'])) {
            return $this->fail('Name and price are required');
        }

        // Generate slug from name
        $slug = strtolower(str_replace(' ', '-', $data['name']));

        // Prepare data for database
        $planData = [
            'name' => $data['name'],
            'slug' => $slug,
            'price' => $data['price'],
            'billing_period' => $data['duration'] ?? 'monthly',
            'features' => json_encode($data['features'] ?? []),
            'limits' => json_encode($this->syncLimitsFromFeatures($data['features'] ?? [])),
            'is_active' => ($data['status'] ?? 'active') === 'active',
            'is_trailing' => (bool)($data['isTrailing'] ?? false),
            'is_public' => (bool)($data['isPublic'] ?? true),
        ];

        // If this plan is marked as trailing, unmark others
        if ($planData['is_trailing']) {
            $this->planModel->where('is_trailing', 1)->set(['is_trailing' => 0])->update();
        }

        $id = $this->planModel->insert($planData);

        if (!$id) {
            return $this->fail('Failed to create package');
        }

        $this->logAction('created', "PACK-{$id}", "Package created: {$planData['name']}");

        return $this->respondCreated([
            'success' => true,
            'message' => 'Package created successfully',
            'data' => ['id' => $id],
        ]);
    }

    /**
     * Update package
     * PUT /api/admin/packages/:id
     */
    public function update($id = null)
    {
        $plan = $this->planModel->find($id);

        if (!$plan) {
            return $this->failNotFound('Package not found');
        }

        $data = $this->request->getJSON(true);

        // Prepare update data
        $updateData = [];

        if (isset($data['name'])) {
            $updateData['name'] = $data['name'];
            $updateData['slug'] = strtolower(str_replace(' ', '-', $data['name']));
        }

        if (isset($data['price'])) {
            $updateData['price'] = $data['price'];
        }

        if (isset($data['duration'])) {
            $updateData['billing_period'] = $data['duration'];
        }

        if (isset($data['features'])) {
            $updateData['features'] = json_encode($data['features']);
            $updateData['limits'] = json_encode($this->syncLimitsFromFeatures($data['features']));
        }

        if (isset($data['status'])) {
            $updateData['is_active'] = $data['status'] === 'active';
        }

        if (isset($data['isTrailing'])) {
            $updateData['is_trailing'] = (bool)$data['isTrailing'];
            if ($updateData['is_trailing']) {
                $this->planModel->where('is_trailing', 1)->set(['is_trailing' => 0])->update();
            }
        }

        if (isset($data['isPublic'])) {
            $updateData['is_public'] = (bool)$data['isPublic'];
        }

        $success = $this->planModel->update($id, $updateData);

        if (!$success) {
            return $this->fail('Failed to update package');
        }

        $this->logAction('updated', "PACK-{$id}", "Package updated: " . ($updateData['name'] ?? $plan['name']));

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Package updated successfully',
        ])->setStatusCode(200);
    }

    /**
     * Delete package
     * DELETE /api/admin/packages/:id
     */
    public function delete($id = null)
    {
        $plan = $this->planModel->find($id);

        if (!$plan) {
            return $this->failNotFound('Package not found');
        }

        if ($plan['is_trailing']) {
            return $this->fail('Cannot delete the default trailing package.');
        }

        // Check if any tenants are using this plan
        $tenantModel = new \App\Models\TenantModel();
        $tenants = $tenantModel->where('plan_id', $id)->findAll();

        if (count($tenants) > 0) {
            return $this->fail('Cannot delete package with active subscriptions. Please deactivate it instead.');
        }

        $success = $this->planModel->delete($id);

        if (!$success) {
            return $this->fail('Failed to delete package');
        }

        $this->logAction('deleted', "PACK-{$id}", "Package deleted: {$plan['name']}");

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Package deleted successfully',
        ])->setStatusCode(200);
    }

    /**
     * Map features to technical limits for enforcement
     */
    private function syncLimitsFromFeatures(array $features): array
    {
        $limits = [
            'users' => -1,
            'invoices' => -1,
            'projects' => -1,
            'storage_gb' => -1,
            'api_calls' => -1
        ];

        foreach ($features as $feature) {
            $type = $feature['type'] ?? 'custom';
            $value = $feature['value'] ?? '';

            // Clean value (e.g., "50GB" -> 50, "Unlimited" -> -1)
            $numericValue = (int)$value;
            if (stripos((string)$value, 'unlimited') !== false) {
                $numericValue = -1;
            }

            switch ($type) {
                case 'storage':
                    $limits['storage_gb'] = $numericValue;
                    break;
                case 'users':
                    $limits['users'] = $numericValue;
                    break;
                case 'api':
                case 'api_calls':
                    $limits['api_calls'] = $numericValue;
                    break;
                case 'invoices':
                    $limits['invoices'] = $numericValue;
                    break;
                case 'projects':
                    $limits['projects'] = $numericValue;
                    break;
            }
        }

        return $limits;
    }
}
