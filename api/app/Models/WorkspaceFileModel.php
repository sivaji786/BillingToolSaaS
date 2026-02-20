<?php

namespace App\Models;

use App\Models\BaseModel;

class WorkspaceFileModel extends BaseModel
{
    protected $table            = 'workspace_files';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'tenant_id', 'user_id', 'name', 'original_name', 'path', 'is_dir', 
        'mime_type', 'size', 'extension', 'metadata', 'content'
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
