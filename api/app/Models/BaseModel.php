<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Traits\TenantScope;

class BaseModel extends Model
{
    use TenantScope;

    protected $beforeFind   = ['beforeFind'];
    protected $beforeInsert = ['beforeInsert'];
    protected $beforeUpdate = ['beforeUpdate'];
    protected $beforeDelete = ['beforeDelete'];
}
