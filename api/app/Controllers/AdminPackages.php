<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\PlanModel;

class AdminPackages extends ResourceController
{
    use ResponseTrait;

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
                'currency' => 'EUR',
                'duration' => $plan['billing_period'],
                'features' => json_decode($plan['features'], true) ?? [],
                'status' => $plan['is_active'] ? 'active' : 'inactive',
                'createdAt' => $plan['created_at'],
                'updatedAt' => $plan['updated_at'],
            ];
        }, $plans);

        return $this->respond([
            'data' => $packages,
            'pagination' => [
                'currentPage' => (int)$page,
                'totalPages' => 1,
                'totalItems' => count($packages),
                'itemsPerPage' => (int)$limit,
            ],
        ]);
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
            'currency' => 'EUR',
            'duration' => $plan['billing_period'],
            'features' => json_decode($plan['features'], true) ?? [],
            'status' => $plan['is_active'] ? 'active' : 'inactive',
            'createdAt' => $plan['created_at'],
            'updatedAt' => $plan['updated_at'],
        ];

        return $this->respond([
            'success' => true,
            'data' => $package,
        ]);
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
            'limits' => json_encode([]), // Can be calculated from features
            'is_active' => ($data['status'] ?? 'active') === 'active',
        ];

        $id = $this->planModel->insert($planData);

        if (!$id) {
            return $this->fail('Failed to create package');
        }

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
        }

        if (isset($data['status'])) {
            $updateData['is_active'] = $data['status'] === 'active';
        }

        $success = $this->planModel->update($id, $updateData);

        if (!$success) {
            return $this->fail('Failed to update package');
        }

        return $this->respond([
            'success' => true,
            'message' => 'Package updated successfully',
        ]);
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

        return $this->respond([
            'success' => true,
            'message' => 'Package deleted successfully',
        ]);
    }
}
