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
            'audit_logs', 'projects', 'tickets', 'platform_company_details', 'api_keys'
        ];
        foreach ($tables as $table) {
            $db->table($table)->truncate();
        }

        // 1. Foundation: Plans
        $this->seedPlans($db);

        // 2. Foundation: Countries
        $this->call('CountrySeeder');

        // 3. Foundation: RBAC (Company Types, Roles, Rights)
        $this->seedRbac($db);

        // 4. Identity: Super Admin (Internal)
        $this->seedAdminUsers($db);

        // 5. Ecosystem: SaaS Demo Data (Tenants, Users, Invoices, Subs)
        $this->seedSaaSData($db);

        // 6. Project specific: Projects & Tickets
        $this->seedProjects($db);
        $this->seedTickets($db);
        $this->seedPlatformDetails($db);

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
                'features' => json_encode([
                    ['name' => 'Monthly Invoices', 'value' => '50', 'type' => 'usage'],
                    ['name' => 'Staff Accounts', 'value' => '1', 'type' => 'usage'],
                    ['name' => 'Storage Capacity', 'value' => '2 GB', 'type' => 'usage'],
                    ['name' => 'API Requests', 'value' => '1,000', 'type' => 'usage'],
                    ['name' => 'Monthly Bandwidth', 'value' => '10 GB', 'type' => 'usage'],
                    ['name' => 'AI-Powered Invoicing', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'Ticketing Support', 'value' => 'Email Only', 'type' => 'feature'],
                    ['name' => 'Custom Templates', 'value' => '3', 'type' => 'feature'],
                    ['name' => 'White Labeling', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'Advanced Designer Tool', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'Activity & Audit Logs', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Buyers Directory (CRM)', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Cloud Workspace Management', 'value' => 'Basic', 'type' => 'feature'],
                    ['name' => 'Role-Based Permissions (RBAC)', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'Monthly Business Letters', 'value' => '10', 'type' => 'usage'],
                    ['name' => 'Multi-Language Support', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'UBL / XML Export', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'AI Voice Input', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'Analytics & Reports', 'value' => 'Basic', 'type' => 'feature'],
                ]),
                'limits' => json_encode(['invoices' => 50, 'users' => 1, 'storage' => 2000000000, 'bandwidth' => 10000000000, 'api_calls' => 1000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Professional', 'slug' => 'professional', 'price' => 49.00, 'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Monthly Invoices', 'value' => '500', 'type' => 'usage'],
                    ['name' => 'Staff Accounts', 'value' => '3', 'type' => 'usage'],
                    ['name' => 'Storage Capacity', 'value' => '10 GB', 'type' => 'usage'],
                    ['name' => 'API Requests', 'value' => '10,000', 'type' => 'usage'],
                    ['name' => 'Monthly Bandwidth', 'value' => '50 GB', 'type' => 'usage'],
                    ['name' => 'AI-Powered Invoicing', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Ticketing Support', 'value' => 'Priority Email', 'type' => 'feature'],
                    ['name' => 'Custom Templates', 'value' => 'Unlimited', 'type' => 'feature'],
                    ['name' => 'White Labeling', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'Advanced Designer Tool', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Activity & Audit Logs', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Buyers Directory (CRM)', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Cloud Workspace Management', 'value' => 'Advanced', 'type' => 'feature'],
                    ['name' => 'Role-Based Permissions (RBAC)', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Monthly Business Letters', 'value' => '100', 'type' => 'usage'],
                    ['name' => 'Multi-Language Support', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'UBL / XML Export', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'AI Voice Input', 'value' => 'No', 'type' => 'feature'],
                    ['name' => 'Analytics & Reports', 'value' => 'Advanced', 'type' => 'feature'],
                ]),
                'limits' => json_encode(['invoices' => 500, 'users' => 3, 'storage' => 10000000000, 'bandwidth' => 50000000000, 'api_calls' => 10000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Business', 'slug' => 'business', 'price' => 99.00, 'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Monthly Invoices', 'value' => '2,000', 'type' => 'usage'],
                    ['name' => 'Staff Accounts', 'value' => '10', 'type' => 'usage'],
                    ['name' => 'Storage Capacity', 'value' => '50 GB', 'type' => 'usage'],
                    ['name' => 'API Requests', 'value' => '100,000', 'type' => 'usage'],
                    ['name' => 'Monthly Bandwidth', 'value' => '200 GB', 'type' => 'usage'],
                    ['name' => 'AI-Powered Invoicing', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Ticketing Support', 'value' => '24/7 Priority', 'type' => 'feature'],
                    ['name' => 'Custom Templates', 'value' => 'Unlimited', 'type' => 'feature'],
                    ['name' => 'White Labeling', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Advanced Designer Tool', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Activity & Audit Logs', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Buyers Directory (CRM)', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Cloud Workspace Management', 'value' => 'Advanced', 'type' => 'feature'],
                    ['name' => 'Role-Based Permissions (RBAC)', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Monthly Business Letters', 'value' => '500', 'type' => 'usage'],
                    ['name' => 'Multi-Language Support', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'UBL / XML Export', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'AI Voice Input', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Analytics & Reports', 'value' => 'Advanced', 'type' => 'feature'],
                ]),
                'limits' => json_encode(['invoices' => 2000, 'users' => 10, 'storage' => 50000000000, 'bandwidth' => 200000000000, 'api_calls' => 100000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Enterprise', 'slug' => 'enterprise', 'price' => 299.00, 'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Monthly Invoices', 'value' => 'Unlimited', 'type' => 'usage'],
                    ['name' => 'Staff Accounts', 'value' => 'Unlimited', 'type' => 'usage'],
                    ['name' => 'Storage Capacity', 'value' => '1 TB', 'type' => 'usage'],
                    ['name' => 'API Requests', 'value' => '1,000,000', 'type' => 'usage'],
                    ['name' => 'Monthly Bandwidth', 'value' => '10 TB', 'type' => 'usage'],
                    ['name' => 'AI-Powered Invoicing', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Ticketing Support', 'value' => 'Dedicated Manager', 'type' => 'feature'],
                    ['name' => 'Custom Templates', 'value' => 'Unlimited', 'type' => 'feature'],
                    ['name' => 'White Labeling', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Advanced Designer Tool', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Activity & Audit Logs', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Buyers Directory (CRM)', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Cloud Workspace Management', 'value' => 'Enterprise', 'type' => 'feature'],
                    ['name' => 'Role-Based Permissions (RBAC)', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Monthly Business Letters', 'value' => 'Unlimited', 'type' => 'usage'],
                    ['name' => 'Multi-Language Support', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'UBL / XML Export', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'AI Voice Input', 'value' => 'Yes', 'type' => 'feature'],
                    ['name' => 'Analytics & Reports', 'value' => 'Full', 'type' => 'feature'],
                ]),
                'limits' => json_encode(['invoices' => -1, 'users' => -1, 'storage' => 1000000000000, 'bandwidth' => 10000000000000, 'api_calls' => 1000000]),
                'is_active' => 1, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')
            ]
        ];
        $db->table('plans')->insertBatch($data);
    }

    // Unified Country Seeding moved to CountrySeeder.php

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
            ['module' => 'buyers', 'action' => 'read', 'code' => 'buyers.read', 'description' => 'View buyers directory'],
            ['module' => 'buyers', 'action' => 'create', 'code' => 'buyers.create', 'description' => 'Create buyers'],
            ['module' => 'buyers', 'action' => 'update', 'code' => 'buyers.update', 'description' => 'Update buyers'],
            ['module' => 'buyers', 'action' => 'delete', 'code' => 'buyers.delete', 'description' => 'Delete buyers'],
            ['module' => 'audit_logs', 'action' => 'read', 'code' => 'audit_logs.read', 'description' => 'View audit logs'],
            ['module' => 'users', 'action' => 'manage', 'code' => 'users.manage', 'description' => 'Manage users'],
            ['module' => 'roles', 'action' => 'manage', 'code' => 'roles.manage', 'description' => 'Manage roles and permissions'],
            ['module' => 'workspace', 'action' => 'read', 'code' => 'workspace.read', 'description' => 'View files and folders, download items'],
            ['module' => 'workspace', 'action' => 'create', 'code' => 'workspace.create', 'description' => 'Upload files, create folders, extract zip archives'],
            ['module' => 'workspace', 'action' => 'update', 'code' => 'workspace.update', 'description' => 'Rename files and folders'],
            ['module' => 'workspace', 'action' => 'delete', 'code' => 'workspace.delete', 'description' => 'Delete files and folders'],
            ['module' => 'workspace', 'action' => 'ai', 'code' => 'workspace.ai', 'description' => 'Perform AI-powered searches'],
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

            // ALWAYS add a default "Admin" role for signup fallback
            $this->insertRoleAndRights($db, $typeId, 'Admin', 'Management', $allRights);

            // Structure 1: Departments
            if (isset($comp['departments'])) {
                foreach ($comp['departments'] as $dept) {
                    $deptName = $dept['name'] ?? '';
                    foreach ($dept['roles'] as $roleName) {
                        // Skip if we just added it manually or if it's already "Admin"
                        if ($roleName === 'Admin') continue;
                        $this->insertRoleAndRights($db, $typeId, $roleName, $deptName, $allRights);
                    }
                }
            } 
            // Structure 2: Simple Roles
            elseif (isset($comp['roles'])) {
                foreach ($comp['roles'] as $roleItem) {
                    $roleName = is_array($roleItem) ? $roleItem['name'] : $roleItem;
                    if ($roleName === 'Admin') continue;
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
        echo "Seeding SaaS Demo Ecosystem (12 Diverse Tenants)...\n";
        
        $companies = [
            ['name' => 'Nexus Quantum AI', 'sub' => 'nexus_ai', 'domain' => 'nexus.ai', 'admin' => 'Alex Rivera'],
            ['name' => 'Blue Wave Logistics', 'sub' => 'bluewave', 'domain' => 'bluewave.logistics', 'admin' => 'Jordan Smith'],
            ['name' => 'Terraform Real Estate', 'sub' => 'terraform', 'domain' => 'terraform.estate', 'admin' => 'Elena Rodriguez'],
            ['name' => 'CloudScale Systems', 'sub' => 'cloudscale', 'domain' => 'cloudscale.io', 'admin' => 'Marcus Thorne'],
            ['name' => 'Zenith Financial', 'sub' => 'zenith', 'domain' => 'zenith-fin.com', 'admin' => 'Sarah Jenkins'],
            ['name' => 'Vanguard Cyber Security', 'sub' => 'vanguard', 'domain' => 'vanguard.security', 'admin' => 'Hiroshi Tanaka'],
            ['name' => 'BioGenie Labs', 'sub' => 'biogenie', 'domain' => 'biogenie.bio', 'admin' => 'Dr. Aris Varma'],
            ['name' => 'Stellar E-commerce', 'sub' => 'stellar', 'domain' => 'stellar-shop.net', 'admin' => 'Emily White'],
            ['name' => 'Apex Marketing Group', 'sub' => 'apex', 'domain' => 'apexgroup.agency', 'admin' => 'Liam O\'Connor'],
            ['name' => 'Infinity Software', 'sub' => 'infinity', 'domain' => 'infinity.dev', 'admin' => 'Sofia Rossi'],
            ['name' => 'GreenLeaf Sustainable', 'sub' => 'greenleaf', 'domain' => 'greenleaf.earth', 'admin' => 'Oliver Green'],
            ['name' => 'Titan Industrial', 'sub' => 'titan', 'domain' => 'titan-ind.com', 'admin' => 'Hans Schmidt']
        ];

        foreach ($companies as $comp) {
            $email = strtolower(str_replace(' ', '.', $comp['admin'])) . '@' . $comp['domain'];
            $this->createTenant($db, $comp['name'], $comp['sub'], $email, $comp['admin'], 'active');
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
        $commonFirst = ['James', 'David', 'Robert', 'Michael', 'William', 'Thomas', 'Daniel', 'Paul', 'Mark', 'George', 'Kevin', 'Steven'];
        $commonLast = ['Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris'];
        
        $domain = explode('@', $email)[1];

        for ($u = 0; $u < 3; $u++) {
            $isPrimary = ($u === 0);
            $userNameToUse = $isPrimary ? $userName : $commonFirst[array_rand($commonFirst)] . ' ' . $commonLast[array_rand($commonLast)];
            $userEmailToUse = $isPrimary ? $email : strtolower(str_replace(' ', '.', $userNameToUse)) . '@' . $domain;

            $db->table('users')->insert([
                'tenant_id' => $tid,
                'email' => $userEmailToUse,
                'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
                'name' => $userNameToUse,
                'role' => $isPrimary ? 'admin' : ($u === 1 ? 'manager' : 'user'),
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
        foreach ($tenants as $index => $t) {
            $db->table('projects')->insert([
                'tenant_id' => $t->id,
                'name' => 'Main Website API',
                'api_key' => ($index === 0) ? 'billtool_test_key' : bin2hex(random_bytes(16)),
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

    private function seedPlatformDetails($db)
    {
        echo "Seeding Platform Company Details...\n";
        $db->table('platform_company_details')->insert([
            'name' => 'BillingTool Platform',
            'vat_id' => 'BE0123456789',
            'street' => '123 Business Avenue',
            'city' => 'Antwerp',
            'postal_code' => '2000',
            'country' => 'BE',
            'email' => 'admin@billingtool.com',
            'phone' => '+32 3 123 45 67',
            'bank_iban' => 'BE12 3456 7890 1234',
            'bank_bic' => 'BBRUBEBB',
            'bank_account_name' => 'BillingTool Admin',
            'updated_at' => date('Y-m-d H:i:s')
        ]);
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
