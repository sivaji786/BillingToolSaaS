<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddInvoiceNumberFormat extends Migration
{
    public function up()
    {
        $fields = [
            'invoice_number_format' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'null' => true,
                'default' => 'INV-{YYYY}-{NNNNN}',
            ],
        ];

        $this->forge->addColumn('company_profiles', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('company_profiles', 'invoice_number_format');
    }
}
