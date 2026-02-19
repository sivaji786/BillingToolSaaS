<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class BuyerSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        
        $buyers = [
            [
                'tenant_id' => 1,
                'name' => 'Acme Corporation',
                'vat_id' => 'DE123456789',
                'legal_organization_id' => 'HRB 12345',
                'address_json' => json_encode([
                    'street' => 'Hauptstrasse 1',
                    'city' => 'Berlin',
                    'postalCode' => '10115',
                    'country' => 'DE'
                ]),
                'contact_json' => json_encode([
                    'email' => 'billing@acme.com',
                    'phone' => '+49 30 1234567'
                ]),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'tenant_id' => 1,
                'name' => 'Globex Corporation',
                'vat_id' => 'US987654321',
                'legal_organization_id' => 'Corp-54321',
                'address_json' => json_encode([
                    'street' => '742 Evergreen Terrace',
                    'city' => 'Springfield',
                    'postalCode' => '62704',
                    'country' => 'US'
                ]),
                'contact_json' => json_encode([
                    'email' => 'hank@globex.com',
                    'phone' => '+1 555 0123'
                ]),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'tenant_id' => 1,
                'name' => 'Cyberdyne Systems',
                'vat_id' => 'JP445566778',
                'legal_organization_id' => 'JP-8899',
                'address_json' => json_encode([
                    'street' => '1-1-1 Marunouchi',
                    'city' => 'Tokyo',
                    'postalCode' => '100-0005',
                    'country' => 'JP'
                ]),
                'contact_json' => json_encode([
                    'email' => 'support@cyberdyne.jp',
                    'phone' => '+81 3 5555 6666'
                ]),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'tenant_id' => 1,
                'name' => 'Initech LLC',
                'vat_id' => 'US112233445',
                'legal_organization_id' => 'LLC-1122',
                'address_json' => json_encode([
                    'street' => '4120 Freidrich Lane',
                    'city' => 'Austin',
                    'postalCode' => '78744',
                    'country' => 'US'
                ]),
                'contact_json' => json_encode([
                    'email' => 'lumbergh@initech.com',
                    'phone' => '+1 512 555 0199'
                ]),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]
        ];

        $db->table('buyers')->insertBatch($buyers);
    }
}
