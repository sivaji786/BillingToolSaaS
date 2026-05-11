<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMissingPackageFeatures extends Migration
{
    // New package_services rows to insert
    private array $newServices = [
        [
            'name'        => 'Monthly Business Letters',
            'type'        => 'usage',
            'description' => 'Limit on generated business letters per billing period',
            'is_active'   => 1,
        ],
        [
            'name'        => 'Multi-Language Support',
            'type'        => 'feature',
            'description' => 'Interface and documents available in EN, DE, AR, PL (incl. RTL)',
            'is_active'   => 1,
        ],
        [
            'name'        => 'UBL / XML Export',
            'type'        => 'feature',
            'description' => 'Export invoices in Universal Business Language (UBL) XML format',
            'is_active'   => 1,
        ],
        [
            'name'        => 'AI Voice Input',
            'type'        => 'feature',
            'description' => 'Voice-to-text dictation for invoices and business letters',
            'is_active'   => 1,
        ],
        [
            'name'        => 'Analytics & Reports',
            'type'        => 'feature',
            'description' => 'Revenue charts, invoice analytics, and usage reports',
            'is_active'   => 1,
        ],
    ];

    // Feature values to append per plan slug
    private array $planFeatures = [
        'starter' => [
            ['name' => 'Monthly Business Letters', 'value' => '10',      'type' => 'usage'],
            ['name' => 'Multi-Language Support',   'value' => 'Yes',     'type' => 'feature'],
            ['name' => 'UBL / XML Export',         'value' => 'No',      'type' => 'feature'],
            ['name' => 'AI Voice Input',            'value' => 'No',      'type' => 'feature'],
            ['name' => 'Analytics & Reports',       'value' => 'Basic',   'type' => 'feature'],
        ],
        'professional' => [
            ['name' => 'Monthly Business Letters', 'value' => '100',     'type' => 'usage'],
            ['name' => 'Multi-Language Support',   'value' => 'Yes',     'type' => 'feature'],
            ['name' => 'UBL / XML Export',         'value' => 'Yes',     'type' => 'feature'],
            ['name' => 'AI Voice Input',            'value' => 'No',      'type' => 'feature'],
            ['name' => 'Analytics & Reports',       'value' => 'Advanced','type' => 'feature'],
        ],
        'business' => [
            ['name' => 'Monthly Business Letters', 'value' => '500',     'type' => 'usage'],
            ['name' => 'Multi-Language Support',   'value' => 'Yes',     'type' => 'feature'],
            ['name' => 'UBL / XML Export',         'value' => 'Yes',     'type' => 'feature'],
            ['name' => 'AI Voice Input',            'value' => 'Yes',     'type' => 'feature'],
            ['name' => 'Analytics & Reports',       'value' => 'Advanced','type' => 'feature'],
        ],
        'enterprise' => [
            ['name' => 'Monthly Business Letters', 'value' => 'Unlimited','type' => 'usage'],
            ['name' => 'Multi-Language Support',   'value' => 'Yes',      'type' => 'feature'],
            ['name' => 'UBL / XML Export',         'value' => 'Yes',      'type' => 'feature'],
            ['name' => 'AI Voice Input',            'value' => 'Yes',      'type' => 'feature'],
            ['name' => 'Analytics & Reports',       'value' => 'Full',     'type' => 'feature'],
        ],
    ];

    public function up()
    {
        $now = date('Y-m-d H:i:s');

        // 1. Insert new package_services rows (skip if already present)
        foreach ($this->newServices as $svc) {
            $exists = $this->db->table('package_services')
                ->where('name', $svc['name'])
                ->countAllResults();

            if (!$exists) {
                $this->db->table('package_services')->insert(array_merge($svc, [
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }

        // 2. Append new feature entries to each plan's features JSON
        foreach ($this->planFeatures as $slug => $newFeatures) {
            $plan = $this->db->table('plans')->where('slug', $slug)->get()->getRowArray();
            if (!$plan) {
                continue;
            }

            $features = json_decode($plan['features'] ?? '[]', true) ?: [];
            $existingNames = array_column($features, 'name');

            foreach ($newFeatures as $f) {
                if (!in_array($f['name'], $existingNames, true)) {
                    $features[] = $f;
                }
            }

            $this->db->table('plans')
                ->where('slug', $slug)
                ->update([
                    'features'   => json_encode($features),
                    'updated_at' => $now,
                ]);
        }
    }

    public function down()
    {
        // Remove the 5 new service rows
        foreach ($this->newServices as $svc) {
            $this->db->table('package_services')->where('name', $svc['name'])->delete();
        }

        // Strip the new features from each plan's features JSON
        $featureNames = array_column($this->newServices, 'name');

        foreach (array_keys($this->planFeatures) as $slug) {
            $plan = $this->db->table('plans')->where('slug', $slug)->get()->getRowArray();
            if (!$plan) {
                continue;
            }

            $features = json_decode($plan['features'] ?? '[]', true) ?: [];
            $features = array_values(array_filter($features, fn($f) => !in_array($f['name'], $featureNames, true)));

            $this->db->table('plans')
                ->where('slug', $slug)
                ->update([
                    'features'   => json_encode($features),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
        }
    }
}
