<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * WH-067 — Seed three WorkHub add-on package tiers.
 *
 * Run: php spark db:seed WorkHubPackagesSeeder
 *
 * Each tier is inserted as a new plan row (or skipped if already present by name).
 * The limits JSON is merged into the plan's existing limits (if any).
 */
class WorkHubPackagesSeeder extends Seeder
{
    public function run()
    {
        $tiers = [
            [
                'name'        => 'WorkHub Starter',
                'slug'        => 'workhub_starter',
                'description' => 'WorkHub field-service add-on — small teams up to 5 workers',
                'price'       => 29.00,
                'interval'    => 'month',
                'limits'      => [
                    'workhub_enabled'              => true,
                    'workhub_workers'              => 5,
                    'workhub_tasks_per_month'      => 100,
                    'workhub_storage_mb'           => 500,
                    'workhub_ai_calls_per_month'   => 0,
                    'workhub_pdf_exports'          => 50,
                ],
            ],
            [
                'name'        => 'WorkHub Pro',
                'slug'        => 'workhub_pro',
                'description' => 'WorkHub field-service add-on — growing teams up to 25 workers with AI',
                'price'       => 79.00,
                'interval'    => 'month',
                'limits'      => [
                    'workhub_enabled'              => true,
                    'workhub_workers'              => 25,
                    'workhub_tasks_per_month'      => 1000,
                    'workhub_storage_mb'           => 5000,
                    'workhub_ai_calls_per_month'   => 500,
                    'workhub_pdf_exports'          => -1,
                ],
            ],
            [
                'name'        => 'WorkHub Enterprise',
                'slug'        => 'workhub_enterprise',
                'description' => 'WorkHub field-service add-on — unlimited workers and tasks',
                'price'       => 199.00,
                'interval'    => 'month',
                'limits'      => [
                    'workhub_enabled'              => true,
                    'workhub_workers'              => -1,
                    'workhub_tasks_per_month'      => -1,
                    'workhub_storage_mb'           => 50000,
                    'workhub_ai_calls_per_month'   => 5000,
                    'workhub_pdf_exports'          => -1,
                ],
            ],
        ];

        $db = \Config\Database::connect();

        foreach ($tiers as $tier) {
            $existing = $db->table('plans')
                ->where('slug', $tier['slug'])
                ->get()->getRowArray();

            if ($existing) {
                // Merge WorkHub limits into existing limits JSON
                $current = json_decode($existing['limits'] ?? '{}', true) ?: [];
                $merged  = array_merge($current, $tier['limits']);
                $db->table('plans')
                    ->where('id', $existing['id'])
                    ->update([
                        'limits'     => json_encode($merged),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ]);
                echo "Updated plan: {$tier['name']}\n";
                continue;
            }

            $db->table('plans')->insert([
                'name'        => $tier['name'],
                'slug'        => $tier['slug'],
                'description' => $tier['description'],
                'price'       => $tier['price'],
                'interval'    => $tier['interval'],
                'limits'      => json_encode($tier['limits']),
                'features'    => json_encode([
                    'workhub' => true,
                    'pdf_export' => true,
                    'ai_correction' => $tier['limits']['workhub_ai_calls_per_month'] > 0,
                ]),
                'is_active'   => 1,
                'created_at'  => date('Y-m-d H:i:s'),
                'updated_at'  => date('Y-m-d H:i:s'),
            ]);
            echo "Inserted plan: {$tier['name']}\n";
        }
    }
}
