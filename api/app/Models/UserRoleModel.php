<?php

namespace App\Models;

use CodeIgniter\Model;

class UserRoleModel extends Model
{
    protected $table            = 'user_roles';
    protected $returnType       = 'array';
    protected $allowedFields    = ['user_id', 'role_id'];
    
    protected $primaryKey       = 'id'; // Dummy PK for builder 
    protected $useAutoIncrement = false;
}
