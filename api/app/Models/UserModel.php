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
    protected $allowedFields    = ['tenant_id', 'email', 'password', 'password_hash', 'name', 'role', 'last_login', 'email_verified', 'avatar_url', 'sso_only'];

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
    protected $beforeInsert   = ['hashPassword'];
    protected $beforeUpdate   = ['hashPassword'];
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
     * Check if user has a specific right (permission).
     *
     * @param int|string $userId (ID or 'current' implicitly if we tracked it, but better explicit)
     * @param string $rightCode
     * @return bool
     */
    public function hasRight($userId, $rightCode)
    {
        $db = \Config\Database::connect();

        // 1. Check Super Admin Role via user_roles → roles (is_super_admin = 1)
        $builder = $db->table('user_roles');
        $builder->join('roles', 'roles.id = user_roles.role_id');
        $builder->where('user_roles.user_id', $userId);
        $builder->where('roles.is_super_admin', 1);
        if ($builder->countAllResults() > 0) {
            return true;
        }

        // Fallback: users.role = 'admin' bypasses all right checks
        $userRow = $db->table('users')->select('role')->where('id', (int) $userId)->get()->getRow();
        if ($userRow && $userRow->role === 'admin') {
            return true;
        }
        
        // 2. Check Specific Right
        // Link: users -> user_roles -> roles -> role_rights -> rights where code = $rightCode
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
        $db = \Config\Database::connect();

        // 1. Check Super Admin Role via user_roles table
        $builder = $db->table('user_roles');
        $builder->join('roles', 'roles.id = user_roles.role_id');
        $builder->where('user_roles.user_id', $userId);
        $builder->where('roles.is_super_admin', 1);
        if ($builder->countAllResults() > 0) {
            return ['*']; // Wildcard for super admin
        }

        // Fallback: users.role = 'admin' is treated as super admin
        $userRow = $db->table('users')->select('role')->where('id', (int) $userId)->get()->getRow();
        if ($userRow && $userRow->role === 'admin') {
            return ['*'];
        }

        // 2. Fetch all rights codes
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
