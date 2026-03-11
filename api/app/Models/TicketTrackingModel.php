<?php

namespace App\Models;

use CodeIgniter\Model;

class TicketTrackingModel extends Model
{
    protected $table            = 'ticket_tracking';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'ticket_id',
        'user_id',
        'action',
        'old_value',
        'new_value',
        'comment',
        'created_at'
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = ''; // No updated_at for tracking
}
