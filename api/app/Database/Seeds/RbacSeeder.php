<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use App\Models\CompanyTypeModel;
use App\Models\RoleModel;
use App\Models\RightModel;
use App\Models\RoleRightModel;
use App\Models\CompanyProfileModel;

class RbacSeeder extends Seeder
{
    public function run()
    {
        // 0. Truncate Tables to ensure clean slate
        $db = \Config\Database::connect();
        $db->disableForeignKeyChecks();
        $db->table('role_rights')->truncate();
        $db->table('user_roles')->truncate();
        $db->table('roles')->truncate();
        $db->table('company_types')->truncate();
        $db->enableForeignKeyChecks();

        $jsonPath = ROOTPATH . '../roles_json.txt';
        if (!file_exists($jsonPath)) {
            // Fallback content if file missing
            $jsonContent = '{"companies":[{"name":"Service Provider","roles":["Admin","Technician"]}]}';
        } else {
            $jsonContent = file_get_contents($jsonPath);
        }

        $data = json_decode($jsonContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            log_message('error', 'RBAC Seeder JSON Error: ' . json_last_error_msg());
            return;
        }
        
        // Handle root key variants
        if (isset($data['companies'])) {
            $data = $data['companies'];
        } elseif (isset($data['company_types'])) {
            $data = $data['company_types'];
        }

        $companyTypeModel = new CompanyTypeModel();
        $roleModel = new RoleModel();
        
        // 1. Seed Company Types and Roles
        foreach ($data as $typeData) {
            // Check formatted structure from user (Type, Departments)
            $typeName = $typeData['type'] ?? $typeData['name'] ?? 'Unknown';
            
            $existingType = $companyTypeModel->where('name', $typeName)->first();
            if (!$existingType) {
                $compTypeId = $companyTypeModel->insert(['name' => $typeName]);
            } else {
                $compTypeId = $existingType['id'];
            }
            
            // Roles
            // Structure 1: "departments": [...]
            if (isset($typeData['departments']) && is_array($typeData['departments'])) {
                foreach ($typeData['departments'] as $dept) {
                    $deptName = $dept['name'] ?? '';
                    if (isset($dept['roles']) && is_array($dept['roles'])) {
                        foreach ($dept['roles'] as $roleName) {
                            $this->upsertRole($roleModel, $compTypeId, $roleName, $deptName);
                        }
                    }
                }
            } 
            // Structure 2: "roles": [...] (Legacy/Simple)
            elseif (isset($typeData['roles']) && is_array($typeData['roles'])) {
                 foreach ($typeData['roles'] as $roleItem) {
                     $roleName = is_array($roleItem) ? ($roleItem['name'] ?? 'Unknown') : $roleItem;
                     $deptName = ''; // No dept
                     $this->upsertRole($roleModel, $compTypeId, $roleName, $deptName);
                 }
            }
        }
        
        // 2. Seed Rights (Derived from Routes/Structure)
        $rights = [
            // Invoices
            ['module' => 'invoices', 'action' => 'read', 'code' => 'invoices.read', 'description' => 'View invoices'],
            ['module' => 'invoices', 'action' => 'create', 'code' => 'invoices.create', 'description' => 'Create invoices'],
            ['module' => 'invoices', 'action' => 'update', 'code' => 'invoices.update', 'description' => 'Update invoices'],
            ['module' => 'invoices', 'action' => 'delete', 'code' => 'invoices.delete', 'description' => 'Delete invoices'],
            
            // Tickets
            ['module' => 'tickets', 'action' => 'read', 'code' => 'tickets.read', 'description' => 'View tickets'],
            ['module' => 'tickets', 'action' => 'create', 'code' => 'tickets.create', 'description' => 'Create tickets'],
            ['module' => 'tickets', 'action' => 'update', 'code' => 'tickets.update', 'description' => 'Update tickets'],
            
            // Company Profiles
            ['module' => 'company_profiles', 'action' => 'read', 'code' => 'company_profiles.read', 'description' => 'View company profile'],
            ['module' => 'company_profiles', 'action' => 'update', 'code' => 'company_profiles.update', 'description' => 'Update company profile'],
            
            // Audit Logs
            ['module' => 'audit_logs', 'action' => 'read', 'code' => 'audit_logs.read', 'description' => 'View audit logs'],
            
            // Users/Auth
            ['module' => 'users', 'action' => 'manage', 'code' => 'users.manage', 'description' => 'Manage users'],
            
            // Roles
            ['module' => 'roles', 'action' => 'manage', 'code' => 'roles.manage', 'description' => 'Manage roles and permissions'],
        ];
        
        $rightModel = new RightModel();
        foreach ($rights as $right) {
            if (!$rightModel->where('code', $right['code'])->first()) {
                $rightModel->insert($right);
            }
        }
        
        // 3. Link Roles to Rights (Basic heuristic mapping)
        // For simplicity: "Manager" or "Director" or "Head" gets all rights.
        // Others get read-only or limited.
        
        $roleRightModel = new RoleRightModel();
        $allRoles = $roleModel->findAll();
        $allRights = $rightModel->findAll();
        
        foreach ($allRoles as $role) {
            $rName = strtolower($role['name']);
            $rDept = strtolower($role['department'] ?? '');
            
            $assignedRights = [];
            
            if (strpos($rName, 'manager') !== false || strpos($rName, 'director') !== false || strpos($rName, 'head') !== false || strpos($rName, 'cfo') !== false || strpos($rName, 'ceo') !== false) {
                // Admin-like roles get all permissions? Or most.
                $assignedRights = $allRights;
            } elseif (strpos($rName, 'technician') !== false) {
                 // Tickets only
                 $assignedRights = array_filter($allRights, fn($r) => $r['module'] === 'tickets');
            } elseif (strpos($rName, 'sales') !== false) {
                 // Invoices + Company Profile
                 $assignedRights = array_filter($allRights, fn($r) => $r['module'] === 'invoices' || $r['module'] === 'company_profiles');
            } else {
                 // Default to Read Only for everything?
                 $assignedRights = array_filter($allRights, fn($r) => $r['action'] === 'read');
            }
            
            // Clear existing rights for role
            // Use builder properly for pivot table without PK
            $roleRightModel->builder()->where('role_id', $role['id'])->delete();
            
            foreach ($assignedRights as $right) {
                $roleRightModel->builder()->insert(['role_id' => $role['id'], 'right_id' => $right['id']]);
            }
        }
    }
    
    private function upsertRole($model, $compId, $name, $dept) {
        $existing = $model->where('company_type_id', $compId)
                          ->where('name', $name)
                          ->where('department', $dept) // strict check?
                          ->first();
                          
        if (!$existing) {
            // Check if name exists in company regardless of department?
            // "Roles (scoped by company_type)" implies Role Name unique per Company Type?
            // "Program Director" might be in different type. 
            // If same name in same company type but different department? The JSON implies they are distinct entries. 
            // I will insert distinct.
            $model->insert([
                'company_type_id' => $compId,
                'name'            => $name,
                'department'      => $dept,
                'description'     => "$name in $dept department",
                'is_super_admin'  => ($name === 'Admin' || $name === 'Executive Director')
            ]);
        }
    }
}
