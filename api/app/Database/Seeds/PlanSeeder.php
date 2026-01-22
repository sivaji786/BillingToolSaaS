<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run()
    {
        $data = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'price' => 19.00,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    'invoices_per_month' => 50,
                    'users' => 1,
                    'templates' => 3,
                    'support' => 'email'
                ]),
                'limits' => json_encode([
                    'invoices' => 50,
                    'users' => 1
                ]),
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name' => 'Professional',
                'slug' => 'professional',
                'price' => 49.00,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    'invoices_per_month' => 500,
                    'users' => 3,
                    'templates' => 'unlimited',
                    'support' => 'priority'
                ]),
                'limits' => json_encode([
                    'invoices' => 500,
                    'users' => 3
                ]),
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'price' => 99.00,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    'invoices_per_month' => 2000,
                    'users' => 10,
                    'templates' => 'unlimited',
                    'support' => 'priority_phone'
                ]),
                'limits' => json_encode([
                    'invoices' => 2000,
                    'users' => 10
                ]),
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => 299.00,
                'billing_period' => 'monthly',
                'features' => json_encode([
                    'invoices_per_month' => -1, // Unlimited
                    'users' => -1, // Unlimited
                    'templates' => 'unlimited',
                    'support' => 'dedicated'
                ]),
                'limits' => json_encode([
                    'invoices' => -1,
                    'users' => -1
                ]),
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]
        ];

        // Using query builder
        $this->db->table('plans')->insertBatch($data);
    }
}
