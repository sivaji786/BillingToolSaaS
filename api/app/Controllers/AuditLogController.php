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
        $logs = $model->orderBy('timestamp', 'DESC')->findAll();
        return $this->respond($logs);
    }
}
