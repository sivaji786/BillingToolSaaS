<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class MainSeeder extends Seeder
{
    public function run()
    {
        // 1. Users
        $users = [
            [
                'email' => 'admin@medianet-home.de',
                'password_hash' => password_hash('password', PASSWORD_DEFAULT),
                'name' => 'Admin User',
                'role' => 'admin',
                'created_at' => date('Y-m-d H:i:s'),
            ]
        ];
        // Check if user exists
        $userModel = new \App\Models\UserModel();
        if ($userModel->where('email', 'admin@medianet-home.de')->countAllResults() === 0) {
            $this->db->table('users')->insertBatch($users);
            $userId = $this->db->insertID();
        } else {
            $userId = $userModel->where('email', 'admin@medianet-home.de')->first()['id'];
        }

        // 2. Company Profile
        $profile = [
            'name' => '[mn]medianet Inh Bernhard Hnida',
            'vat_id' => 'DE123456789',
            'legal_organization_id' => 'HRB 12345',
            'street' => 'Musterstrasse 1',
            'city' => 'Berlin',
            'postal_code' => '10115',
            'country' => 'DE',
            'email' => 'billing@medianet-home.de',
            'phone' => '+49 30 12345678',
            'website' => 'https://medianet-home.de',
            'bank_iban' => 'DE89370400440532013000',
            'bank_bic' => 'COBADEBBXXX',
            'bank_account_name' => '[mn]medianet Inh Bernhard Hnida',
        ];
        // Check if profile exists
        if ($this->db->table('company_profiles')->countAllResults() === 0) {
            $this->db->table('company_profiles')->insert($profile);
        }

        // 3. Invoices
        if ($this->db->table('invoices')->countAllResults() === 0) {
            $invoices = [
                [
                    'invoice_number' => 'INV-2025-00123',
                    'issue_date' => '2025-10-30',
                    'due_date' => '2025-11-29',
                    'currency' => 'EUR',
                    'status' => 'validated',
                    'seller_name' => '[mn]medianet Inh Bernhard Hnida',
                    'seller_vat_id' => 'DE123456789',
                    'seller_address_json' => json_encode([
                        'street' => 'Musterstrasse 1',
                        'city' => 'Berlin',
                        'postalCode' => '10115',
                        'country' => 'DE',
                    ]),
                    'buyer_name' => 'Beta Ltd',
                    'buyer_vat_id' => 'FR987654321',
                    'buyer_address_json' => json_encode([
                        'street' => 'Rue Exemple 5',
                        'city' => 'Paris',
                        'postalCode' => '75001',
                        'country' => 'FR',
                    ]),
                    'line_extension_amount' => 1300.00,
                    'tax_exclusive_amount' => 1300.00,
                    'tax_inclusive_amount' => 1460.00,
                    'payable_amount' => 1460.00,
                    'created_by' => $userId,
                ],
                [
                    'invoice_number' => 'INV-2025-00122',
                    'issue_date' => '2025-10-28',
                    'due_date' => '2025-11-27',
                    'currency' => 'EUR',
                    'status' => 'sent',
                    'seller_name' => '[mn]medianet Inh Bernhard Hnida',
                    'seller_vat_id' => 'DE123456789',
                    'seller_address_json' => json_encode([
                        'street' => 'Musterstrasse 1',
                        'city' => 'Berlin',
                        'postalCode' => '10115',
                        'country' => 'DE',
                    ]),
                    'buyer_name' => 'Gamma AG',
                    'buyer_vat_id' => 'CH987654321',
                    'buyer_address_json' => json_encode([
                        'street' => 'Bahnhofstrasse 10',
                        'city' => 'Zürich',
                        'postalCode' => '8001',
                        'country' => 'CH',
                    ]),
                    'line_extension_amount' => 3800.00,
                    'tax_exclusive_amount' => 3800.00,
                    'tax_inclusive_amount' => 4522.00,
                    'payable_amount' => 4522.00,
                    'created_by' => $userId,
                ]
            ];
            $this->db->table('invoices')->insertBatch($invoices);
            // Actually better to fetch IDs
            $invoice1 = $this->db->table('invoices')->where('invoice_number', 'INV-2025-00123')->get()->getRow();
            $invoice2 = $this->db->table('invoices')->where('invoice_number', 'INV-2025-00122')->get()->getRow();

            // 4. Invoice Lines
            $lines = [
                [
                    'invoice_id' => $invoice1->id,
                    'description' => 'Consulting service – October',
                    'quantity' => 10,
                    'unit_code' => 'HUR',
                    'unit_price' => 80.00,
                    'tax_category' => 'S',
                    'tax_percent' => 20.00,
                    'line_extension_amount' => 800.00,
                ],
                [
                    'invoice_id' => $invoice1->id,
                    'description' => 'Software license',
                    'quantity' => 1,
                    'unit_code' => 'EA',
                    'unit_price' => 500.00,
                    'tax_category' => 'Z',
                    'tax_percent' => 0.00,
                    'line_extension_amount' => 500.00,
                ],
                [
                    'invoice_id' => $invoice2->id,
                    'description' => 'Web development services',
                    'quantity' => 40,
                    'unit_code' => 'HUR',
                    'unit_price' => 95.00,
                    'tax_category' => 'S',
                    'tax_percent' => 19.00,
                    'line_extension_amount' => 3800.00,
                ]
            ];
            $this->db->table('invoice_lines')->insertBatch($lines);
        }

        // 5. Templates
        if ($this->db->table('invoice_templates')->countAllResults() === 0) {
            $templates = [
                [
                    'name' => 'Standard Service Invoice',
                    'description' => 'For hourly consulting and professional services',
                    'default_currency' => 'EUR',
                    'default_tax_category' => 'S',
                    'default_tax_percent' => 19.00,
                    'seller_json' => json_encode([
                        'name' => '[mn]medianet Inh Bernhard Hnida',
                        'vatId' => 'DE123456789',
                        'address' => [
                            'street' => 'Musterstrasse 1',
                            'city' => 'Berlin',
                            'postalCode' => '10115',
                            'country' => 'DE',
                        ]
                    ]),
                    'header_text' => 'Professional IT Services & Consulting\nTax ID: DE123456789 | Registration: HRB 12345',
                    'footer_text' => 'Bank Details: IBAN DE89 3704 0044 0532 0130 00 | BIC COBADEFFXXX\n\nThank you for your business! For questions, contact billing@medianet-home.de\nTerms: Net 30 days. Late payments subject to 5% interest per annum.',
                ]
            ];
            $this->db->table('invoice_templates')->insertBatch($templates);
        }

        // 6. Audit Logs
        if ($this->db->table('audit_logs')->countAllResults() === 0) {
            $logs = [
                [
                    'timestamp' => '2025-10-30 10:30:00',
                    'action' => 'validated',
                    'invoice_number' => 'INV-2025-00123',
                    'user' => 'admin@medianet-home.de',
                    'details' => 'Invoice passed EN 16931 validation',
                    'signed' => 0,
                ],
                [
                    'timestamp' => '2025-10-30 10:00:00',
                    'action' => 'created',
                    'invoice_number' => 'INV-2025-00123',
                    'user' => 'admin@medianet-home.de',
                    'details' => null,
                    'signed' => 0,
                ],
                [
                    'timestamp' => '2025-10-28 14:30:00',
                    'action' => 'signed',
                    'invoice_number' => 'INV-2025-00122',
                    'user' => 'admin@medianet-home.de',
                    'details' => 'Digital signature applied',
                    'signed' => 1,
                ]
            ];
            $this->db->table('audit_logs')->insertBatch($logs);
        }
    }
}
