<?php

namespace App\Models;

use App\Models\BaseModel;

class UserModel extends BaseModel
{
    use \App\Traits\TenantScope;

    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['tenant_id', 'email', 'password', 'password_hash', 'name', 'role', 'last_login', 'email_verified', 'must_set_password', 'avatar_url', 'sso_only'];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
    protected $deletedField  = 'deleted_at';

    // Validation
    protected $validationRules      = [];
    protected $validationMessages   = [];
    protected $skipValidation       = false;
    protected $cleanValidationRules = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['beforeInsert', 'checkLimits', 'hashPassword'];
    protected $beforeUpdate   = ['beforeUpdate', 'hashPassword'];
    protected $afterInsert    = [];
    protected $afterUpdate    = [];
    protected $afterFind      = [];
    protected $afterDelete    = [];

    /**
     * Hash password before insert/update
     */
    protected function hashPassword(array $data)
    {
        if (isset($data['data']['password'])) {
            $data['data']['password_hash'] = password_hash($data['data']['password'], PASSWORD_DEFAULT);
            unset($data['data']['password']);
        }
        return $data;
    }

    /**
     * Find user by email
     */
    public function findByEmail($email)
    {
        return $this->where('email', $email)->first();
    }

    /**
     * Verify password
     */
    public function verifyPassword($email, $password)
    {
        $user = $this->findByEmail($email);
        
        if (!$user) {
            return false;
        }

        return password_verify($password, $user['password_hash']);
    }

    /**
     * Authenticate user and return user data
     */
    public function authenticate($email, $password)
    {
        $user = $this->findByEmail($email);
        
        if (!$user) {
            return null;
        }

        if (!password_verify($password, $user['password_hash'])) {
            return null;
        }

        // Remove password hash from returned data
        unset($user['password_hash']);
        
        return $user;
    }

    /**
     * Canonical "does this user bypass all right checks" test — the single source of
     * truth for the super-admin bypass. Everything else that needs this decision
     * (hasRight(), getRights(), RbacFilter) calls this instead of re-deriving it.
     *
     * True if either:
     *  - the user is linked (via user_roles) to a role with roles.is_super_admin = 1, or
     *  - the legacy users.role column is 'admin' or 'owner' (covers accounts created
     *    before the RBAC tables existed, or whose user_roles link is missing/broken).
     */
    public function isEffectiveSuperAdmin($userId): bool
    {
        $db = \Config\Database::connect();

        $hasSuperAdminRole = $db->table('user_roles')
            ->join('roles', 'roles.id = user_roles.role_id')
            ->where('user_roles.user_id', $userId)
            ->where('roles.is_super_admin', 1)
            ->countAllResults() > 0;

        if ($hasSuperAdminRole) {
            return true;
        }

        $userRow = $db->table('users')->select('role')->where('id', (int) $userId)->get()->getRow();
        return $userRow && in_array($userRow->role, ['admin', 'owner'], true);
    }

    /**
     * Check if user has a specific right (permission).
     *
     * @param int|string $userId (ID or 'current' implicitly if we tracked it, but better explicit)
     * @param string $rightCode
     * @return bool
     */
    public function hasRight($userId, $rightCode)
    {
        if ($this->isEffectiveSuperAdmin($userId)) {
            return true;
        }

        // Check specific right: users -> user_roles -> roles -> role_rights -> rights where code = $rightCode
        $db = \Config\Database::connect();
        $builder = $db->table('user_roles');
        $builder->join('roles', 'roles.id = user_roles.role_id');
        $builder->join('role_rights', 'role_rights.role_id = roles.id');
        $builder->join('rights', 'rights.id = role_rights.right_id');
        $builder->where('user_roles.user_id', $userId);
        $builder->where('rights.code', $rightCode);

        return $builder->countAllResults() > 0;
    }

    public function getRights($userId)
    {
        if ($this->isEffectiveSuperAdmin($userId)) {
            return ['*']; // Wildcard for super admin
        }

        // Fetch all rights codes
        $db = \Config\Database::connect();
        $builder = $db->table('user_roles');
        $builder->select('rights.code');
        $builder->join('roles', 'roles.id = user_roles.role_id');
        $builder->join('role_rights', 'role_rights.role_id = roles.id');
        $builder->join('rights', 'rights.id = role_rights.right_id');
        $builder->where('user_roles.user_id', $userId);

        $query = $builder->get();
        $results = $query->getResultArray();

        return array_column($results, 'code');
    }
}
