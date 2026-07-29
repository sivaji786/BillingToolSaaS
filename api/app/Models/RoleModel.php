<?php

namespace App\Models;

use CodeIgniter\Model;

class RoleModel extends Model
{
    protected $table            = 'roles';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    // is_super_admin is deliberately NOT mass-assignable — it's a platform-seeded flag
    // that bypasses all RBAC checks (see UserModel::isEffectiveSuperAdmin()), and must
    // never be settable via the tenant-facing role API (RoleController).
    protected $allowedFields    = ['tenant_id', 'company_type_id', 'name', 'department', 'description'];
}
