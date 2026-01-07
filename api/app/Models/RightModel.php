<?php

namespace App\Models;

use CodeIgniter\Model;

class RightModel extends Model
{
    protected $table            = 'rights';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = ['module', 'action', 'code', 'description'];
}
