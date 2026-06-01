<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\AuditLogModel;
use CodeIgniter\API\ResponseTrait;

class AuditLogController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $model = new AuditLogModel();

        $builder = $model->orderBy('timestamp', 'DESC');

        // WH-065 — filter by module prefix (e.g. ?module=workhub)
        $module = $this->request->getGet('module');
        if ($module) {
            $builder->like('action', $module . '.', 'after');
        }

        // Optional tenant filter (SA admin use)
        $tenantId = (int) ($this->request->getGet('tenant_id') ?? 0);
        if ($tenantId) {
            $builder->where('tenant_id', $tenantId);
        }

        // Optional limit/offset for pagination
        $limit  = min((int) ($this->request->getGet('limit') ?? 100), 500);
        $offset = (int) ($this->request->getGet('offset') ?? 0);

        $logs = $builder->findAll($limit, $offset);

        return $this->respond($logs)->setStatusCode(200);
    }
}
