<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\AuditLogModel;
use CodeIgniter\API\ResponseTrait;

class AuditLogController extends BaseController
{
    use ResponseTrait;

    /**
     * Applies the request's filters to a model instance via chainable Model-level
     * methods (never the raw ->builder()), and scopes explicitly to the caller's
     * tenant rather than relying solely on TenantScope::beforeFind() — that hook
     * fires for find()/findAll() but not countAllResults().
     */
    private function applyFilters(AuditLogModel $model): AuditLogModel
    {
        // Explicit tenant scoping — countAllResults() does not trigger the model's
        // beforeFind event (TenantScope), unlike find()/findAll(), so this can't rely
        // solely on the trait; matches the explicit-where convention used elsewhere
        // in this codebase (e.g. UserController::index()).
        $tenantId = $this->request->tenantId ?? null;
        if ($tenantId) {
            $model->where('audit_logs.tenant_id', $tenantId);
        }

        // WH-065 — filter by module prefix (e.g. ?module=workhub)
        $module = $this->request->getGet('module');
        if ($module) {
            $model->like('action', $module . '.', 'after');
        }

        // Exact action filter (e.g. ?action=validated)
        $action = $this->request->getGet('action');
        if ($action) {
            $model->where('action', $action);
        }

        // Free-text search across invoice number / user / details
        $search = trim((string) ($this->request->getGet('search') ?? ''));
        if ($search !== '') {
            $model->groupStart()
                ->like('invoice_number', $search)
                ->orLike('user', $search)
                ->orLike('details', $search)
                ->groupEnd();
        }

        // Optional tenant filter override (narrows further within the caller's own scope)
        $tenantIdOverride = (int) ($this->request->getGet('tenant_id') ?? 0);
        if ($tenantIdOverride) {
            $model->where('tenant_id', $tenantIdOverride);
        }

        return $model;
    }

    public function index()
    {
        // Total count under the current filters, before limit/offset — lets the frontend
        // show a true "X of Y" instead of silently truncating at the page size. A fresh
        // model instance per query, since countAllResults()/findAll() consume the builder.
        $total = $this->applyFilters(new AuditLogModel())->countAllResults();

        // Summary counters (signed / exported / validated) computed under the same filters
        // as $total, not just the current page — otherwise these would silently mean
        // something different ("on this page") from the headline total.
        $counts = [
            'signed'    => $this->applyFilters(new AuditLogModel())->where('signed', 1)->countAllResults(),
            'exported'  => $this->applyFilters(new AuditLogModel())->where('action', 'exported')->countAllResults(),
            'validated' => $this->applyFilters(new AuditLogModel())->where('action', 'validated')->countAllResults(),
        ];

        // Optional limit/offset for pagination
        $limit  = min((int) ($this->request->getGet('limit') ?? 100), 500);
        $offset = (int) ($this->request->getGet('offset') ?? 0);

        $logs = $this->applyFilters(new AuditLogModel())->orderBy('timestamp', 'DESC')->findAll($limit, $offset);

        return $this->respond([
            'data'   => $logs,
            'total'  => $total,
            'counts' => $counts,
            'limit'  => $limit,
            'offset' => $offset,
        ])->setStatusCode(200);
    }
}
