<?php

namespace App\Models;

use App\Models\BaseModel;

class AuditLogModel extends BaseModel
{
    protected $table            = 'audit_logs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'tenant_id',
        'timestamp',
        'action',
        'invoice_number',
        'user',
        'details',
        'signed'
    ];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = false;
}
