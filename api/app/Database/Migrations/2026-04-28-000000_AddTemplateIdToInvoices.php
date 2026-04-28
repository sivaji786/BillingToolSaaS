<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTemplateIdToInvoices extends Migration
{
    public function up()
    {
        $this->forge->addColumn('invoices', [
            'template_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'default'    => null,
                'after'      => 'template_type',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('invoices', 'template_id');
    }
}
