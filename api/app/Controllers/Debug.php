<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\UserModel;

class Debug extends BaseController
{
    public function users()
    {
        $db = \Config\Database::connect();
        $users = $db->table('users')->select('id, name, email, tenant_id, role')->get()->getResultArray();
        $tenants = $db->table('tenants')->get()->getResultArray();
        $userRoles = $db->table('user_roles')->get()->getResultArray();
        $roles = $db->table('roles')->get()->getResultArray();
        
        return $this->response->setJSON([
            'user_count' => count($users),
            'users' => $users,
            'tenant_count' => count($tenants),
            'tenants' => $tenants,
            'diagnosis_admin_user' => $db->table('users')->where('email', 'admin@techflow.com')->get()->getRowArray(),
            'diagnosis_techflow_tenant' => $db->table('tenants')->where('subdomain', 'techflow')->get()->getRowArray(),
            'diagnosis_company_profile' => $db->table('company_profiles')->where('tenant_id', 4)->get()->getRowArray(),
            'diagnosis_roles_schema' => $db->getFieldNames('roles'),
            'current_tenant_config' => isset(config('App')->currentTenant) ? config('App')->currentTenant : 'NULL'
        ]);
    }

    public function roles() {
        $db = \Config\Database::connect();
        return $this->response->setJSON($db->table('roles')->get()->getResultArray());
    }

    public function schema() {
        $db = \Config\Database::connect();
         return $this->response->setJSON($db->listTables());
    }

    public function findRole() {
        $db = \Config\Database::connect();
        $admin = $db->table('roles')->where('name', 'Admin')->get()->getRow();
        $tenantAdmin = $db->table('roles')->where('name', 'Tenant Admin')->get()->getRow();
        return $this->response->setJSON(['Admin' => $admin, 'Tenant Admin' => $tenantAdmin]);
    }

    public function modelCheck()
    {
        // Force set tenant context to simulate Filter (TechFlow ID 4)
        // We need to fetch the actual object or mock it
        $db = \Config\Database::connect();
        $tenant = $db->table('tenants')->where('id', 4)->get()->getRow();
        config('App')->currentTenant = $tenant;
        
        $model = new UserModel();
        $users = $model->findAll();
        
         return $this->response->setJSON([
            'simulated_tenant_id' => $tenant->id,
            'user_count' => count($users),
            'users' => $users,
            'last_query' => $model->getLastQuery()->getQuery()
        ]);
    }
}
