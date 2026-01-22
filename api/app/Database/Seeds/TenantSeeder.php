<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class TenantSeeder extends Seeder
{
    public function run()
    {
        // 1. Create Demo Tenant
        $tenantData = [
            'company_name' => 'Demo Company',
            'subdomain' => 'demo',
            'plan_id' => 4, // Enterprise
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        
        $this->db->table('tenants')->insert($tenantData);
        $tenantId = $this->db->insertID();
        
        // 2. Create Admin User for Demo Tenant
        // Standard user or check if exists?
        // Assuming we want a fresh user or link existing?
        // Let's create a specific SaaS admin
        /*
        $userData = [
            'tenant_id' => $tenantId,
            'email' => 'admin@demo.com',
            'password' => password_hash('password123', PASSWORD_BCRYPT),
            'first_name' => 'Demo',
            'last_name' => 'Admin',
            'role' => 'admin',
            'status' => 'active',
             // Add other required fields based on existing UserModel
        ];
        // $this->db->table('users')->insert($userData);
        */
        
        // 3. Create Subscription
        $subscriptionData = [
            'tenant_id' => $tenantId,
            'plan_id' => 4,
            'status' => 'active',
            'current_period_start' => date('Y-m-d H:i:s'),
            // 1 year from now
            'current_period_end' => date('Y-m-d H:i:s', strtotime('+1 year')),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        
        $this->db->table('subscriptions')->insert($subscriptionData);
    }
}
