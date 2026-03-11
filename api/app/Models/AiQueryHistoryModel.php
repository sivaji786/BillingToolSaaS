<?php

namespace App\Models;

use App\Models\BaseModel;

class AiQueryHistoryModel extends BaseModel
{
    protected $table            = 'aiquery_history';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'tenant_id', 'user_id', 'prompt', 'sql_query', 'folder_path', 'created_at'
    ];

    protected $useTimestamps = false; // Manually handled by created_at
}
