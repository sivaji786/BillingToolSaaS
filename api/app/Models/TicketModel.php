<?php

namespace App\Models;

use App\Models\BaseModel;

class TicketModel extends BaseModel
{
    protected $table            = 'tickets';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['tenant_id', 'user_id', 'project_id', 'subject', 'description', 'priority', 'status', 'domain', 'page', 'client_ip', 'screenshot_path', 'created_at', 'updated_at'];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules      = [
        'subject'     => 'required|min_length[3]|max_length[255]',
        'description' => 'required',
        'priority'    => 'permit_empty|in_list[low,medium,high,critical]',
        'status'      => 'permit_empty|in_list[open,in_progress,resolved,closed]',
    ];
    protected $validationMessages   = [];
    protected $skipValidation       = false;
    protected $cleanValidationRules = true;
}
