<?php
namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use App\Models\InvoiceTemplateModel;
use App\Models\TenantModel;

class SampleTemplateSeeder extends Seeder
{
    public function run()
    {
        $templateModel = new InvoiceTemplateModel();
        $tenantModel = new TenantModel();

        $tenants = $tenantModel->findAll();

        if (empty($tenants)) {
            echo "No tenants found to seed templates for.\n";
            return;
        }

        $defaultLayout = [
            ['id' => 'logo', 'type' => 'logo', 'x' => 40, 'y' => 40, 'w' => 120, 'h' => 50, 'visible' => true, 'zIndex' => 10],
            ['id' => 'header', 'type' => 'header', 'x' => 180, 'y' => 40, 'w' => 375, 'h' => 50, 'visible' => true, 'zIndex' => 10],
            ['id' => 'title', 'type' => 'title', 'x' => 40, 'y' => 120, 'w' => 220, 'h' => 40, 'visible' => true, 'zIndex' => 10],
            ['id' => 'dates', 'type' => 'dates', 'x' => 340, 'y' => 120, 'w' => 215, 'h' => 60, 'visible' => true, 'zIndex' => 10],
            ['id' => 'seller', 'type' => 'seller', 'x' => 40, 'y' => 200, 'w' => 240, 'h' => 100, 'visible' => true, 'zIndex' => 10],
            ['id' => 'buyer', 'type' => 'buyer', 'x' => 315, 'y' => 200, 'w' => 240, 'h' => 100, 'visible' => true, 'zIndex' => 10],
            ['id' => 'items', 'type' => 'items', 'x' => 40, 'y' => 320, 'w' => 515, 'h' => 240, 'visible' => true, 'zIndex' => 10],
            ['id' => 'tax_summary', 'type' => 'tax_summary', 'x' => 40, 'y' => 575, 'w' => 260, 'h' => 90, 'visible' => true, 'zIndex' => 10],
            ['id' => 'totals', 'type' => 'totals', 'x' => 325, 'y' => 575, 'w' => 230, 'h' => 110, 'visible' => true, 'zIndex' => 10],
            ['id' => 'notes', 'type' => 'notes', 'x' => 40, 'y' => 700, 'w' => 310, 'h' => 70, 'visible' => true, 'zIndex' => 10],
            ['id' => 'signature', 'type' => 'signature', 'x' => 380, 'y' => 700, 'w' => 175, 'h' => 60, 'visible' => true, 'zIndex' => 10],
            ['id' => 'qr', 'type' => 'qr', 'x' => 510, 'y' => 775, 'w' => 45, 'h' => 45, 'visible' => true, 'zIndex' => 10],
            ['id' => 'footer', 'type' => 'footer', 'x' => 40, 'y' => 790, 'w' => 460, 'h' => 30, 'visible' => true, 'zIndex' => 10],
        ];

        foreach ($tenants as $tenant) {
            echo "Seeding sample templates for tenant: " . $tenant['company_name'] . "\n";

            $samples = [
                [
                    'tenant_id' => $tenant['id'],
                    'name' => 'Marketing Agency Layout',
                    'description' => 'A colorful, modern layout optimized for digital marketing invoices.',
                    'seller_json' => json_encode(['name' => $tenant['company_name'], 'address' => ['street' => 'Agency Blvd 1', 'city' => 'Berlin', 'postalCode' => '10115', 'country' => 'DE']]),
                    'default_currency' => 'EUR',
                    'default_tax_category' => 'S',
                    'default_tax_percent' => 19.00,
                    'default_payment_terms_json' => json_encode(['note' => 'Payment due within 7 days. 2% discount for immediate payment.']),
                    'header_text' => '<h1>Invoice from ' . $tenant['company_name'] . '</h1>',
                    'footer_text' => '<p>Thank you for choosing our creative services.</p>',
                    'layout_json' => json_encode($defaultLayout),
                ],
                [
                    'tenant_id' => $tenant['id'],
                    'name' => 'Corporate Minimal',
                    'description' => 'Strict, black and white minimalist design for corporate clients.',
                    'seller_json' => json_encode(['name' => $tenant['company_name'], 'address' => ['street' => 'Business Park 7', 'city' => 'Munich', 'postalCode' => '80331', 'country' => 'DE']]),
                    'default_currency' => 'EUR',
                    'default_tax_category' => 'S',
                    'default_tax_percent' => 19.00,
                    'default_payment_terms_json' => json_encode(['note' => 'Net 30. Standard corporate terms apply.']),
                    'header_text' => '',
                    'footer_text' => '',
                    'layout_json' => json_encode($defaultLayout),
                ]
            ];

            foreach ($samples as $sample) {
                $templateModel->insert($sample);
            }
        }

        echo "Sample templates seeded successfully.\n";
    }
}
