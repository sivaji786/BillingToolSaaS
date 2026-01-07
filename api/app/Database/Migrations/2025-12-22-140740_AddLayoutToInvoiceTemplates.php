<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddLayoutToInvoiceTemplates extends Migration
{
    public function up()
    {
        $this->forge->addColumn('invoice_templates', [
            'layout_json' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'footer_text'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('invoice_templates', 'layout_json');
    }
}
