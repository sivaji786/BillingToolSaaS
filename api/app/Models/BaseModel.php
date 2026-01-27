<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Traits\TenantScope;

use App\Traits\UsageEnforcement;

class BaseModel extends Model
{
    use TenantScope;
    use UsageEnforcement;

    protected $beforeFind   = ['beforeFind'];
    protected $beforeInsert = ['beforeInsert', 'checkLimits'];
    protected $beforeUpdate = ['beforeUpdate'];
    protected $beforeDelete = ['beforeDelete'];
}
