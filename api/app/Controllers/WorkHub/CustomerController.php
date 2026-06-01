<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubCustomerModel;

/**
 * WH-033: Customer CRUD (WorkHub field-service recipients).
 *
 * GET    /workhub/customers          — list with optional ?search=
 * GET    /workhub/customers/{id}     — detail
 * POST   /workhub/customers          — create
 * PUT    /workhub/customers/{id}     — update
 * DELETE /workhub/customers/{id}     — soft delete
 *
 * Customers are WorkHub-specific field-service recipients. They are NOT
 * merged with the main `clients` table. An optional `client_id` FK links
 * to the existing billing clients table for reference.
 */
class CustomerController extends BaseController
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

    // GET /workhub/customers
    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model  = new WorkhubCustomerModel();
        $search = $this->request->getGet('search');

        $model->where('tenant_id', $this->tenantId);

        if ($search) {
            $model->groupStart()
                  ->like('name', $search)
                  ->orLike('email', $search)
                  ->orLike('company', $search)
                  ->groupEnd();
        }

        $customers = $model->orderBy('name', 'ASC')->findAll();

        // Annotate with project count for each customer
        $db = \Config\Database::connect();
        foreach ($customers as &$c) {
            $c['project_count'] = (int) $db->table('workhub_projects')
                ->where('tenant_id', $this->tenantId)
                ->where('customer_id', $c['id'])
                ->where('deleted_at IS NULL', null, false)
                ->countAllResults();
        }
        unset($c);

        return $this->respond(['data' => $customers]);
    }

    // GET /workhub/customers/{id}
    public function show(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model    = new WorkhubCustomerModel();
        $customer = $model->where('tenant_id', $this->tenantId)->find($id);

        if (!$customer) {
            return $this->failNotFound('Customer not found.');
        }

        // Attach projects for this customer
        $db = \Config\Database::connect();
        $customer['projects'] = $db->table('workhub_projects')
                                   ->select('id, name, status, colour_accent, progress_pct')
                                   ->where('tenant_id', $this->tenantId)
                                   ->where('customer_id', $id)
                                   ->where('deleted_at IS NULL', null, false)
                                   ->orderBy('name', 'ASC')
                                   ->get()->getResultArray();

        // Link to billing client if client_id is set
        if (!empty($customer['client_id'])) {
            $client = $db->table('clients')
                         ->select('id, name, email, company_name')
                         ->where('id', $customer['client_id'])
                         ->where('tenant_id', $this->tenantId)
                         ->get()->getRowArray();
            $customer['linked_client'] = $client ?: null;
        }

        return $this->respond(['data' => $customer]);
    }

    // POST /workhub/customers
    public function create(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $data = $this->request->getJSON(true) ?? [];

        $insert = [
            'tenant_id'     => $this->tenantId,
            'name'          => trim($data['name'] ?? ''),
            'email'         => trim($data['email'] ?? '') ?: null,
            'phone'         => trim($data['phone'] ?? '') ?: null,
            'address'       => $data['address'] ?? null,
            'company'       => trim($data['company'] ?? '') ?: null,
            'language_pref' => $data['language_pref'] ?? 'en',
        ];

        // Optional FK to billing clients table
        if (!empty($data['client_id'])) {
            $insert['client_id'] = (int) $data['client_id'];
        }

        if (strlen($insert['name']) < 2) {
            return $this->fail('Customer name must be at least 2 characters.', 422);
        }

        if ($insert['email'] && !filter_var($insert['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->fail('Invalid email address.', 422);
        }

        $model = new WorkhubCustomerModel();
        $id    = $model->insert($insert, true);

        if (!$id) {
            $errs = $model->errors();
            return $this->fail($errs ?: 'Failed to create customer.', 422);
        }

        $this->logWorkhubEvent('workhub.customer.created', 0, [], $insert, "Customer: {$insert['name']}");

        return $this->respondCreated(['data' => $model->find($id)]);
    }

    // PUT /workhub/customers/{id}
    public function update(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model    = new WorkhubCustomerModel();
        $customer = $model->where('tenant_id', $this->tenantId)->find($id);
        if (!$customer) return $this->failNotFound('Customer not found.');

        $data    = $this->request->getJSON(true) ?? [];
        $allowed = ['name', 'email', 'phone', 'address', 'company', 'language_pref', 'client_id'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (isset($update['name']) && strlen(trim($update['name'])) < 2) {
            return $this->fail('Customer name must be at least 2 characters.', 422);
        }

        if (isset($update['email']) && $update['email'] && !filter_var($update['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->fail('Invalid email address.', 422);
        }

        $model->update($id, $update);

        $this->logWorkhubEvent('workhub.customer.updated', 0, $customer, $update, "Customer: {$customer['name']}");

        return $this->respond(['data' => $model->find($id)]);
    }

    // DELETE /workhub/customers/{id}
    public function delete(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model    = new WorkhubCustomerModel();
        $customer = $model->where('tenant_id', $this->tenantId)->find($id);
        if (!$customer) return $this->failNotFound('Customer not found.');

        // Block if customer has active projects
        $db          = \Config\Database::connect();
        $activeProjects = $db->table('workhub_projects')
                             ->where('tenant_id', $this->tenantId)
                             ->where('customer_id', $id)
                             ->where('status', 'active')
                             ->where('deleted_at IS NULL', null, false)
                             ->countAllResults();

        if ($activeProjects > 0) {
            return $this->fail(
                "Cannot delete customer with {$activeProjects} active project(s). Close or reassign them first.",
                409
            );
        }

        $model->delete($id);

        $this->logWorkhubEvent('workhub.customer.deleted', 0, $customer, [], "Customer: {$customer['name']}");

        return $this->respond(['message' => 'Customer deleted.']);
    }
}
