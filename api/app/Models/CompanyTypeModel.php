<?php

namespace App\Models;

use CodeIgniter\Model;

class CompanyTypeModel extends Model
{
    protected $table            = 'company_types';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = ['name'];
}
