<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class MainSeeder extends Seeder
{
    public function run()
    {
        echo "Starting Final Unified Seeding Process...\n";
        $db = \Config\Database::connect();
        $db->query('SET FOREIGN_KEY_CHECKS=0');

        // Clear all tables to be seeded
        echo "Cleaning existing data...\n";
        $tables = [
            'plans', 'countries', 'rights', 'roles', 'role_rights', 'user_roles', 
            'admin_users', 'tenants', 'users', 'company_profiles', 'invoices', 
            'invoice_lines', 'invoice_templates', 'subscriptions', 'company_types',
            'audit_logs', 'projects', 'tickets'
        ];
        foreach ($tables as $table) {
            $db->table($table)->truncate();
        }

        // 1. Foundation: Plans
        $this->seedPlans($db);

        // 2. Foundation: Countries
        $this->seedCountries($db);

        // 3. Foundation: RBAC (Company Types, Roles, Rights)
        $this->seedRbac($db);

        // 4. Identity: Super Admin (Internal)
        $this->seedAdminUsers($db);

        // 5. Ecosystem: SaaS Demo Data (Tenants, Users, Invoices, Subs)
        $this->seedSaaSData($db);

        // 6. Project specific: Projects & Tickets
        $this->seedProjects($db);
        $this->seedTickets($db);

        // 7. Legacy / Specific Test Cases
        $this->seedMainTestData($db);

        // 7. Integrity Sweep
        $this->runIntegritySweep($db);

        $db->query('SET FOREIGN_KEY_CHECKS=1');
        echo "Database Seeding Completed Successfully!\n";
    }

    private function seedPlans($db)
    {
        echo "Seeding Plans...\n";
        $data = [
            [
                'name' => 'Starter', 'slug' => 'starter', 'price' => 19.00, 'billing_period' => 'monthly',
                'features' => json_encode(['invoices_per_month' => 50, 'users' => 1, 'templates' => 3, 'support' => 'email']),
                'limits' => json_encode(['invoices' => 50, 'users' => 1, 'storage_gb' => 2, 'bandwidth_gb' => 10, 'api_calls' => 1000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Professional', 'slug' => 'professional', 'price' => 49.00, 'billing_period' => 'monthly',
                'features' => json_encode(['invoices_per_month' => 500, 'users' => 3, 'templates' => 'unlimited', 'support' => 'priority']),
                'limits' => json_encode(['invoices' => 500, 'users' => 3, 'storage_gb' => 10, 'bandwidth_gb' => 50, 'api_calls' => 10000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Business', 'slug' => 'business', 'price' => 99.00, 'billing_period' => 'monthly',
                'features' => json_encode(['invoices_per_month' => 2000, 'users' => 10, 'templates' => 'unlimited', 'support' => 'priority_phone']),
                'limits' => json_encode(['invoices' => 2000, 'users' => 10, 'storage_gb' => 50, 'bandwidth_gb' => 200, 'api_calls' => 100000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Enterprise', 'slug' => 'enterprise', 'price' => 299.00, 'billing_period' => 'monthly',
                'features' => json_encode(['invoices_per_month' => -1, 'users' => -1, 'templates' => 'unlimited', 'support' => 'dedicated']),
                'limits' => json_encode(['invoices' => -1, 'users' => -1, 'storage_gb' => 1000, 'bandwidth_gb' => 10000, 'api_calls' => 1000000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ]
        ];
        $db->table('plans')->insertBatch($data);
    }

    private function seedCountries($db)
    {
        echo "Seeding Countries...\n";
        $data = [
            ['code' => 'IN', 'name_en' => 'India', 'name_de' => 'Indien', 'name_ar' => 'الهند'],
            ['code' => 'DE', 'name_en' => 'Germany', 'name_de' => 'Deutschland', 'name_ar' => 'ألمانيا'],
            ['code' => 'US', 'name_en' => 'USA', 'name_de' => 'USA', 'name_ar' => 'الولايات المتحدة'],
            ['code' => 'GB', 'name_en' => 'UK', 'name_de' => 'Großbritannien', 'name_ar' => 'المملكة المتحدة'],
            ['code' => 'FR', 'name_en' => 'France', 'name_de' => 'Frankreich', 'name_ar' => 'فرنسا'],
            ['code' => 'AE', 'name_en' => 'UAE', 'name_de' => 'VAE', 'name_ar' => 'الإمارات العربية المتحدة']
        ];
        foreach ($data as &$d) { $d['created_at'] = date('Y-m-d H:i:s'); $d['updated_at'] = date('Y-m-d H:i:s'); }
        $db->table('countries')->insertBatch($data);
    }

    private function seedRbac($db)
    {
        echo "Seeding RBAC Foundation...\n";
        
        // 1. Rights
        $rights = [
            ['module' => 'invoices', 'action' => 'read', 'code' => 'invoices.read', 'description' => 'View invoices'],
            ['module' => 'invoices', 'action' => 'create', 'code' => 'invoices.create', 'description' => 'Create invoices'],
            ['module' => 'invoices', 'action' => 'update', 'code' => 'invoices.update', 'description' => 'Update invoices'],
            ['module' => 'invoices', 'action' => 'delete', 'code' => 'invoices.delete', 'description' => 'Delete invoices'],
            ['module' => 'tickets', 'action' => 'read', 'code' => 'tickets.read', 'description' => 'View tickets'],
            ['module' => 'tickets', 'action' => 'create', 'code' => 'tickets.create', 'description' => 'Create tickets'],
            ['module' => 'company_profiles', 'action' => 'read', 'code' => 'company_profiles.read', 'description' => 'View company profile'],
            ['module' => 'company_profiles', 'action' => 'update', 'code' => 'company_profiles.update', 'description' => 'Update company profile'],
            ['module' => 'audit_logs', 'action' => 'read', 'code' => 'audit_logs.read', 'description' => 'View audit logs'],
            ['module' => 'users', 'action' => 'manage', 'code' => 'users.manage', 'description' => 'Manage users'],
            ['module' => 'roles', 'action' => 'manage', 'code' => 'roles.manage', 'description' => 'Manage roles and permissions'],
        ];
        $db->table('rights')->insertBatch($rights);
        $allRights = $db->table('rights')->get()->getResult();

        // 2. Load Roles from JSON
        $jsonPath = ROOTPATH . '../roles_json.txt';
        $jsonContent = file_exists($jsonPath) ? file_get_contents($jsonPath) : '{"companies":[{"name":"Service Provider","roles":["Admin","Technician"]}]}';
        $data = json_decode($jsonContent, true);
        $companies = $data['companies'] ?? $data['company_types'] ?? [];

        foreach ($companies as $comp) {
            $typeName = $comp['type'] ?? $comp['name'] ?? 'General';
            $db->table('company_types')->insert(['name' => $typeName]);
            $typeId = $db->insertID();

            // Structure 1: Departments
            if (isset($comp['departments'])) {
                foreach ($comp['departments'] as $dept) {
                    $deptName = $dept['name'] ?? '';
                    foreach ($dept['roles'] as $roleName) {
                        $this->insertRoleAndRights($db, $typeId, $roleName, $deptName, $allRights);
                    }
                }
            } 
            // Structure 2: Simple Roles
            elseif (isset($comp['roles'])) {
                foreach ($comp['roles'] as $roleItem) {
                    $roleName = is_array($roleItem) ? $roleItem['name'] : $roleItem;
                    $this->insertRoleAndRights($db, $typeId, $roleName, '', $allRights);
                }
            }
        }
    }

    private function insertRoleAndRights($db, $typeId, $name, $dept, $allRights)
    {
        $roleData = [
            'company_type_id' => $typeId,
            'name' => $name,
            'department' => $dept,
            'description' => "$name in $dept department",
            'is_super_admin' => ($name === 'Admin' || $name === 'Executive Director' || $name === 'Managing Director / CEO')
        ];
        $db->table('roles')->insert($roleData);
        $roleId = $db->insertID();

        // Heuristic mapping
        $rName = strtolower($name);
        foreach ($allRights as $right) {
            $shouldAssign = false;
            if ($roleData['is_super_admin'] || strpos($rName, 'manager') !== false || strpos($rName, 'head') !== false) {
                $shouldAssign = true;
            } elseif ($right->action === 'read') {
                $shouldAssign = true;
            }

            if ($shouldAssign) {
                $db->table('role_rights')->insert(['role_id' => $roleId, 'right_id' => $right->id]);
            }
        }
    }

    private function seedAdminUsers($db)
    {
        echo "Seeding Platform Admins...\n";
        $db->table('admin_users')->insert([
            'name' => 'Super Admin',
            'email' => 'admin@humpl.org',
            'password' => password_hash('admin123', PASSWORD_BCRYPT),
            'role' => 'super_admin',
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    private function seedSaaSData($db)
    {
        echo "Seeding SaaS Demo Ecosystem (5 Tenants, 3 Users each)...\n";
        
        // Primary Tenant
        $this->createTenant($db, 'TechFlow Solutions', 'techflow', 'admin@techflow.com', 'Sarah Tech', 'active');

        // Demo company names
        $companies = [
            'Digital Innovations Inc',
            'Global Solutions Ltd',
            'Smart Systems Corp',
            'Future Tech Partners'
        ];
        
        $names = ['John Smith', 'Maria Garcia', 'Ahmed Hassan', 'Lisa Chen'];
        
        // Random Tenants (4 more to total 5)
        for ($i = 0; $i < 4; $i++) {
            $name = $companies[$i];
            $sub = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name)) . rand(10,99);
            $this->createTenant($db, $name, $sub, "admin@$sub.com", $names[$i], 'active');
        }
    }

    private function createTenant($db, $name, $sub, $email, $userName, $status)
    {
        $db->table('tenants')->insert([
            'uuid' => sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)),
            'company_name' => $name,
            'subdomain' => $sub,
            'plan_id' => rand(1, 4),
            'status' => $status,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        $tid = $db->insertID();

        // Add 3 Users for each tenant
        $userNames = ['Admin User', 'Manager User', 'Staff User'];
        for ($u = 0; $u < 3; $u++) {
            $isPrimary = ($u === 0);
            $db->table('users')->insert([
                'tenant_id' => $tid,
                'email' => $isPrimary ? $email : "user{$u}@{$sub}.com",
                'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
                'name' => $isPrimary ? $userName : $userNames[$u],
                'role' => $isPrimary ? 'admin' : 'user',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }

        // Subscription
        $db->table('subscriptions')->insert([
            'tenant_id' => $tid,
            'plan_id' => rand(1, 4),
            'status' => 'active',
            'stripe_subscription_id' => 'sub_' . uniqid(),
            'current_period_start' => date('Y-m-d H:i:s', strtotime('-1 month')),
            'current_period_end' => date('Y-m-d H:i:s', strtotime('+1 month')),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Profile
        $db->table('company_profiles')->insert([
            'tenant_id' => $tid,
            'name' => $name,
            'country' => 'DE',
            'company_type_id' => rand(1, 4),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Audit Log: Tenant Created
        $db->table('audit_logs')->insert([
            'tenant_id' => $tid,
            'timestamp' => date('Y-m-d H:i:s', strtotime('-1 hour')),
            'action' => 'Tenant Configuration Updated',
            'user' => 'System',
            'details' => 'Initial profile and settings established.',
            'signed' => 0
        ]);

        // Invoices
        for($j=0; $j<rand(2, 5); $j++) {
            $amount = rand(100, 1000);
            $invNum = 'INV-' . strtoupper(substr(md5(uniqid()), 0, 6));
            $db->table('invoices')->insert([
                'tenant_id' => $tid,
                'invoice_number' => $invNum,
                'issue_date' => date('Y-m-d', strtotime('-' . rand(0, 30) . ' days')),
                'status' => 'paid',
                'currency' => 'EUR',
                'line_extension_amount' => $amount,
                'tax_exclusive_amount' => $amount,
                'tax_inclusive_amount' => $amount * 1.19,
                'payable_amount' => $amount * 1.19,
                'seller_name' => $name,
                'buyer_name' => 'Demo Client ' . $j,
                'created_at' => date('Y-m-d H:i:s')
            ]);
            $invId = $db->insertID();

            // Audit Log: Invoice Created & Signed
            $db->table('audit_logs')->insert([
                'tenant_id' => $tid,
                'timestamp' => date('Y-m-d H:i:s'),
                'action' => 'Invoice Issued & Signed',
                'invoice_number' => $invNum,
                'user' => $userName,
                'details' => "Invoice $invNum generated and digitally signed.",
                'signed' => 1
            ]);

            // Add 1-3 Lines for each invoice
            $lineCount = rand(1, 3);
            for ($l = 0; $l < $lineCount; $l++) {
                $q = rand(1, 5);
                $up = round($amount / ($lineCount * $q), 2);
                $db->table('invoice_lines')->insert([
                    'invoice_id' => $invId,
                    'description' => 'Demo Service Item ' . ($l + 1),
                    'quantity' => $q,
                    'unit_price' => $up,
                    'line_extension_amount' => $q * $up,
                    'tax_percent' => 19.00,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }

    private function seedMainTestData($db)
    {
        echo "Seeding Legacy Test Case (medianet)...\n";
        // Ensure some specific data used in old tests exists
        $user = $db->table('users')->where('email', 'admin@techflow.com')->get()->getRow();
        if ($user) {
            $tid = $user->tenant_id;
            $db->table('invoice_templates')->insert([
                'tenant_id' => $tid,
                'name' => 'Standard Template',
                'is_default' => 1,
                'default_currency' => 'EUR',
                'header_text' => 'Default Header',
                'footer_text' => 'Default Footer'
            ]);
        }
    }

    private function seedProjects($db)
    {
        echo "Seeding Projects...\n";
        $tenants = $db->table('tenants')->limit(10)->get()->getResult();
        foreach ($tenants as $t) {
            $db->table('projects')->insert([
                'tenant_id' => $t->id,
                'name' => 'Main Website API',
                'api_key' => bin2hex(random_bytes(16)),
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    private function seedTickets($db)
    {
        echo "Seeding Tickets...\n";
        $users = $db->table('users')->limit(20)->get()->getResult();
        $subjects = ['Login Issue', 'Invoice Calculation Error', 'API Timeout', 'Feature Request: PDF Export', 'Billing Question'];
        
        foreach ($users as $u) {
            $db->table('tickets')->insert([
                'tenant_id' => $u->tenant_id,
                'user_id' => $u->id,
                'subject' => $subjects[array_rand($subjects)],
                'description' => 'Automatically generated demo ticket description.',
                'priority' => ['low', 'medium', 'high', 'critical'][array_rand(['low', 'medium', 'high', 'critical'])],
                'status' => ['open', 'in_progress', 'resolved'][array_rand(['open', 'in_progress', 'resolved'])],
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    private function runIntegritySweep($db)
    {
        echo "Running Final Integrity Sweep...\n";
        // Map all admins to Super Admin Role (heuristic)
        $superRole = $db->table('roles')->where('is_super_admin', 1)->get()->getRow();
        if ($superRole) {
            $users = $db->table('users')->get()->getResult();
            foreach ($users as $u) {
                $db->table('user_roles')->insert(['user_id' => $u->id, 'role_id' => $superRole->id]);
            }
        }
    }
}
