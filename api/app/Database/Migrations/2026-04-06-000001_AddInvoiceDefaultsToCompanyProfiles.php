<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddInvoiceDefaultsToCompanyProfiles extends Migration
{
    public function up()
    {
        $fields = [
            'default_currency' => [
                'type' => 'VARCHAR',
                'constraint' => 10,
                'null' => true,
                'default' => 'EUR',
            ],
            'default_tax_rate' => [
                'type' => 'DECIMAL',
                'constraint' => '5,2',
                'null' => true,
                'default' => 19.00,
            ],
            'payment_terms_days' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => true,
                'default' => 30,
            ],
        ];

        $this->forge->addColumn('company_profiles', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('company_profiles', ['default_currency', 'default_tax_rate', 'payment_terms_days']);
    }
}
