<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class PackageServiceSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        
        echo "Cleaning existing package services...\n";
        $db->table('package_services')->truncate();

        $services = [
            // 1. Usage Metrics (Numeric Limits)
            [
                'name' => 'Monthly Invoices',
                'type' => 'usage',
                'description' => 'Limit on generated invoices per billing period',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Staff Accounts',
                'type' => 'usage',
                'description' => 'Number of user seats allowed in the tenant',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Storage Capacity',
                'type' => 'usage',
                'description' => 'Total disk space for attachments and workspace files',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'API Requests',
                'type' => 'usage',
                'description' => 'Limit on external API calls and hooks',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Monthly Bandwidth',
                'type' => 'usage',
                'description' => 'Data transfer limit per month',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            
            // 2. Feature Access (Boolean Toggle)
            [
                'name' => 'AI-Powered Invoicing',
                'type' => 'feature',
                'description' => 'Access to AI parsing and global assistant',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Ticketing Support',
                'type' => 'feature',
                'description' => 'Integration with the internal support system',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Custom Templates',
                'type' => 'feature',
                'description' => 'Ability to create and save reusable invoice templates',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'White Labeling',
                'type' => 'feature',
                'description' => 'Removal of platform branding from portals and PDFs',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Advanced Designer Tool',
                'type' => 'feature',
                'description' => 'Access to the drag-and-drop invoice designer',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Activity & Audit Logs',
                'type' => 'feature',
                'description' => 'Detailed tracking of all user actions',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Buyers Directory (CRM)',
                'type' => 'feature',
                'description' => 'Management of client database and history',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Cloud Workspace Management',
                'type' => 'feature',
                'description' => 'Full file management and AI-powered search capabilities',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Role-Based Permissions (RBAC)',
                'type' => 'feature',
                'description' => 'Advanced user roles and rights management',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],

            // 3. Recently added features
            [
                'name' => 'Monthly Business Letters',
                'type' => 'usage',
                'description' => 'Limit on generated business letters per billing period',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Multi-Language Support',
                'type' => 'feature',
                'description' => 'Interface and documents available in EN, DE, AR, PL (incl. RTL)',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'UBL / XML Export',
                'type' => 'feature',
                'description' => 'Export invoices in Universal Business Language (UBL) XML format',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'AI Voice Input',
                'type' => 'feature',
                'description' => 'Voice-to-text dictation for invoices and business letters',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => 'Analytics & Reports',
                'type' => 'feature',
                'description' => 'Revenue charts, invoice analytics, and usage reports',
                'is_active' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
        ];

        foreach ($services as $service) {
            $db->table('package_services')->insert($service);
        }
        
        echo "Successfully seeded " . count($services) . " package services.\n";
    }
}
