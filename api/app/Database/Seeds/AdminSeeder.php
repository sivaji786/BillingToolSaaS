<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run()
    {
        // Disable foreign key checks
        $this->db->query('SET FOREIGN_KEY_CHECKS=0');
        
        // Clear existing data
        $this->db->table('subscriptions')->truncate();
        $this->db->table('tenants')->truncate();
        $this->db->table('plans')->truncate();
        
        // Re-enable foreign key checks
        $this->db->query('SET FOREIGN_KEY_CHECKS=1');

        // 1. Seed Plans
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'price' => 9.99,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Storage', 'value' => '5GB', 'type' => 'storage'],
                    ['name' => 'Users', 'value' => '1 user', 'type' => 'users'],
                    ['name' => 'Bandwidth', 'value' => '50GB/month', 'type' => 'bandwidth'],
                    ['name' => 'API Calls', 'value' => '10,000/month', 'type' => 'api'],
                    ['name' => 'Support', 'value' => 'Email only', 'type' => 'support'],
                ]),
                'limits' => json_encode([
                    'storage_gb' => 5,
                    'users' => 1,
                    'bandwidth_gb' => 50,
                    'api_calls' => 10000,
                ]),
                'is_active' => true,
                'created_at' => '2024-01-10 08:00:00',
                'updated_at' => '2024-01-10 08:00:00',
            ],
            [
                'name' => 'Professional',
                'slug' => 'professional',
                'price' => 29.99,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Storage', 'value' => '50GB', 'type' => 'storage'],
                    ['name' => 'Users', 'value' => '5 users', 'type' => 'users'],
                    ['name' => 'Bandwidth', 'value' => '500GB/month', 'type' => 'bandwidth'],
                    ['name' => 'API Calls', 'value' => '100,000/month', 'type' => 'api'],
                    ['name' => 'Support', 'value' => 'Priority email & chat', 'type' => 'support'],
                    ['name' => 'Custom Domain', 'value' => 'Included', 'type' => 'feature'],
                ]),
                'limits' => json_encode([
                    'storage_gb' => 50,
                    'users' => 5,
                    'bandwidth_gb' => 500,
                    'api_calls' => 100000,
                ]),
                'is_active' => true,
                'created_at' => '2024-01-10 08:00:00',
                'updated_at' => '2024-01-15 10:30:00',
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'price' => 79.99,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Storage', 'value' => '200GB', 'type' => 'storage'],
                    ['name' => 'Users', 'value' => '20 users', 'type' => 'users'],
                    ['name' => 'Bandwidth', 'value' => '2TB/month', 'type' => 'bandwidth'],
                    ['name' => 'API Calls', 'value' => '500,000/month', 'type' => 'api'],
                    ['name' => 'Support', 'value' => '24/7 phone & chat', 'type' => 'support'],
                    ['name' => 'Custom Domain', 'value' => 'Included', 'type' => 'feature'],
                    ['name' => 'Advanced Analytics', 'value' => 'Included', 'type' => 'feature'],
                    ['name' => 'SSO', 'value' => 'Included', 'type' => 'feature'],
                ]),
                'limits' => json_encode([
                    'storage_gb' => 200,
                    'users' => 20,
                    'bandwidth_gb' => 2048,
                    'api_calls' => 500000,
                ]),
                'is_active' => true,
                'created_at' => '2024-01-10 08:00:00',
                'updated_at' => '2024-01-10 08:00:00',
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => 199.99,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Storage', 'value' => 'Unlimited', 'type' => 'storage'],
                    ['name' => 'Users', 'value' => 'Unlimited', 'type' => 'users'],
                    ['name' => 'Bandwidth', 'value' => 'Unlimited', 'type' => 'bandwidth'],
                    ['name' => 'API Calls', 'value' => 'Unlimited', 'type' => 'api'],
                    ['name' => 'Support', 'value' => 'Dedicated account manager', 'type' => 'support'],
                    ['name' => 'Custom Domain', 'value' => 'Included', 'type' => 'feature'],
                    ['name' => 'Advanced Analytics', 'value' => 'Included', 'type' => 'feature'],
                    ['name' => 'SSO', 'value' => 'Included', 'type' => 'feature'],
                    ['name' => 'SLA', 'value' => '99.99% uptime', 'type' => 'feature'],
                    ['name' => 'Custom Integrations', 'value' => 'Included', 'type' => 'feature'],
                ]),
                'limits' => json_encode([
                    'storage_gb' => 999999,
                    'users' => 999999,
                    'bandwidth_gb' => 999999,
                    'api_calls' => 999999,
                ]),
                'is_active' => true,
                'created_at' => '2024-01-10 08:00:00',
                'updated_at' => '2024-01-10 08:00:00',
            ],
            [
                'name' => 'Legacy Basic',
                'slug' => 'legacy-basic',
                'price' => 4.99,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    ['name' => 'Storage', 'value' => '1GB', 'type' => 'storage'],
                    ['name' => 'Users', 'value' => '1 user', 'type' => 'users'],
                    ['name' => 'Bandwidth', 'value' => '10GB/month', 'type' => 'bandwidth'],
                ]),
                'limits' => json_encode([
                    'storage_gb' => 1,
                    'users' => 1,
                    'bandwidth_gb' => 10,
                    'api_calls' => 5000,
                ]),
                'is_active' => false,
                'created_at' => '2023-06-01 08:00:00',
                'updated_at' => '2024-01-01 08:00:00',
            ],
        ];

        $this->db->table('plans')->insertBatch($plans);

        // 2. Seed Tenants
        $tenants = [
            [
                'company_name' => 'TechStartup Inc',
                'subdomain' => 'techstartup',
                'custom_domain' => null,
                'plan_id' => 3, // Business
                'status' => 'active',
                'trial_ends_at' => null,
                'created_at' => '2023-11-15 10:00:00',
                'updated_at' => '2023-11-15 10:00:00',
            ],
            [
                'company_name' => 'Freelance Design Studio',
                'subdomain' => 'freelancedesign',
                'custom_domain' => null,
                'plan_id' => 1, // Starter
                'status' => 'active',
                'trial_ends_at' => null,
                'created_at' => '2024-03-22 14:30:00',
                'updated_at' => '2024-03-22 14:30:00',
            ],
            [
                'company_name' => 'Marketing Pro Agency',
                'subdomain' => 'marketingpro',
                'custom_domain' => null,
                'plan_id' => 2, // Professional
                'status' => 'active',
                'trial_ends_at' => null,
                'created_at' => '2024-01-08 09:15:00',
                'updated_at' => '2024-01-08 09:15:00',
            ],
            [
                'company_name' => 'Global Corporation',
                'subdomain' => 'globalcorp',
                'custom_domain' => 'billing.globalcorp.com',
                'plan_id' => 4, // Enterprise
                'status' => 'active',
                'trial_ends_at' => null,
                'created_at' => '2023-08-10 13:00:00',
                'updated_at' => '2023-08-10 13:00:00',
            ],
            [
                'company_name' => 'Boutique Shop',
                'subdomain' => 'boutiqueshop',
                'custom_domain' => null,
                'plan_id' => 2, // Professional
                'status' => 'active',
                'trial_ends_at' => null,
                'created_at' => '2024-02-14 11:00:00',
                'updated_at' => '2024-02-14 11:00:00',
            ],
            [
                'company_name' => 'Consulting Firm LLC',
                'subdomain' => 'consultingfirm',
                'custom_domain' => null,
                'plan_id' => 3, // Business
                'status' => 'suspended',
                'trial_ends_at' => null,
                'created_at' => '2023-12-05 10:30:00',
                'updated_at' => '2024-05-28 09:45:00',
            ],
            [
                'company_name' => 'Creative Studio Co',
                'subdomain' => 'creativestudio',
                'custom_domain' => null,
                'plan_id' => 1, // Starter
                'status' => 'active',
                'trial_ends_at' => null,
                'created_at' => '2024-04-18 15:20:00',
                'updated_at' => '2024-04-18 15:20:00',
            ],
            [
                'company_name' => 'Legacy App Services',
                'subdomain' => 'legacyapp',
                'custom_domain' => null,
                'plan_id' => 5, // Legacy Basic
                'status' => 'active',
                'trial_ends_at' => null,
                'created_at' => '2023-05-20 08:00:00',
                'updated_at' => '2023-05-20 08:00:00',
            ],
        ];

        $this->db->table('tenants')->insertBatch($tenants);

        // 3. Seed Subscriptions
        $subscriptions = [
            [
                'tenant_id' => 1,
                'plan_id' => 3,
                'stripe_subscription_id' => 'sub_techstartup_001',
                'status' => 'active',
                'current_period_start' => '2024-06-01 00:00:00',
                'current_period_end' => '2024-07-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2023-11-15 10:00:00',
                'updated_at' => '2024-06-01 00:00:00',
            ],
            [
                'tenant_id' => 2,
                'plan_id' => 1,
                'stripe_subscription_id' => 'sub_freelance_002',
                'status' => 'active',
                'current_period_start' => '2024-06-01 00:00:00',
                'current_period_end' => '2024-07-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2024-03-22 14:30:00',
                'updated_at' => '2024-06-01 00:00:00',
            ],
            [
                'tenant_id' => 3,
                'plan_id' => 2,
                'stripe_subscription_id' => 'sub_marketing_003',
                'status' => 'active',
                'current_period_start' => '2024-06-01 00:00:00',
                'current_period_end' => '2024-07-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2024-01-08 09:15:00',
                'updated_at' => '2024-06-01 00:00:00',
            ],
            [
                'tenant_id' => 4,
                'plan_id' => 4,
                'stripe_subscription_id' => 'sub_global_004',
                'status' => 'active',
                'current_period_start' => '2024-06-01 00:00:00',
                'current_period_end' => '2024-07-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2023-08-10 13:00:00',
                'updated_at' => '2024-06-01 00:00:00',
            ],
            [
                'tenant_id' => 5,
                'plan_id' => 2,
                'stripe_subscription_id' => 'sub_boutique_005',
                'status' => 'active',
                'current_period_start' => '2024-06-01 00:00:00',
                'current_period_end' => '2024-07-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2024-02-14 11:00:00',
                'updated_at' => '2024-06-01 00:00:00',
            ],
            [
                'tenant_id' => 6,
                'plan_id' => 3,
                'stripe_subscription_id' => 'sub_consulting_006',
                'status' => 'past_due',
                'current_period_start' => '2024-05-01 00:00:00',
                'current_period_end' => '2024-06-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2023-12-05 10:30:00',
                'updated_at' => '2024-05-28 09:45:00',
            ],
            [
                'tenant_id' => 7,
                'plan_id' => 1,
                'stripe_subscription_id' => 'sub_creative_007',
                'status' => 'active',
                'current_period_start' => '2024-06-01 00:00:00',
                'current_period_end' => '2024-07-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2024-04-18 15:20:00',
                'updated_at' => '2024-06-01 00:00:00',
            ],
            [
                'tenant_id' => 8,
                'plan_id' => 5,
                'stripe_subscription_id' => 'sub_legacy_008',
                'status' => 'active',
                'current_period_start' => '2024-06-01 00:00:00',
                'current_period_end' => '2024-07-01 00:00:00',
                'cancel_at_period_end' => false,
                'created_at' => '2023-05-20 08:00:00',
                'updated_at' => '2024-06-01 00:00:00',
            ],
        ];

        $this->db->table('subscriptions')->insertBatch($subscriptions);

        echo "Admin seeder completed successfully!\n";
        echo "- 5 plans created\n";
        echo "- 8 tenants created\n";
        echo "- 8 subscriptions created\n";
    }
}
