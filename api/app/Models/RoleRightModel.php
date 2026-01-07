<?php

namespace App\Models;

use CodeIgniter\Model;

class RoleRightModel extends Model
{
    protected $table            = 'role_rights';
    protected $returnType       = 'array';
    protected $allowedFields    = ['role_id', 'right_id'];
    
    // Manual handling for pivot table without single PK
    protected $primaryKey       = 'id'; // Dummy PK for builder 
    protected $useAutoIncrement = false;
}
