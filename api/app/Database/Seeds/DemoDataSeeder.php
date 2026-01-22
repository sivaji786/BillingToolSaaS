<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        
        echo "Seeding Demo Data for TechFlow...\n";

        // Get Tenant ID for techflow
        $tenant = $db->table('tenants')->where('subdomain', 'techflow')->get()->getRow();
        if (!$tenant) {
            echo "Tenant 'techflow' not found. Run SaaSDataSeeder first.\n";
            return;
        }
        $tenantId = $tenant->id;
        echo "Found Tenant ID: $tenantId\n";

        // Users to add
        $newUsers = [
            [
                'email' => 'editor@techflow.com',
                'name' => 'Eddie Editor',
                'role' => 'editor'
            ],
            [
                'email' => 'billing@techflow.com',
                'name' => 'Bill Finance',
                'role' => 'accountant'
            ],
            [
                'email' => 'viewer@techflow.com',
                'name' => 'Vince Viewer',
                'role' => 'viewer'
            ]
        ];

        foreach ($newUsers as $u) {
            $existing = $db->table('users')->where('email', $u['email'])->countAllResults();
            if ($existing == 0) {
                $db->table('users')->insert([
                    'tenant_id' => $tenantId,
                    'email' => $u['email'],
                    'name' => $u['name'],
                    'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
                    'role' => $u['role'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
                echo "Created user {$u['email']}\n";
            } else {
                echo "User {$u['email']} already exists.\n";
            }
        }
        
        // Ensure Company Profile has a Type
        // diagnosis showed company_type_id IS NULL. This might break settings if it expects a value.
        // Let's set it to valid ID.
        $companyType = $db->table('company_types')->limit(1)->get()->getRow();
        if ($companyType) {
            $db->table('company_profiles')->where('tenant_id', $tenantId)->update(['company_type_id' => $companyType->id]);
            echo "Updated Company Profile type to {$companyType->id}\n";
        }
    }
}
