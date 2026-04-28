<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTemplateTypeToInvoiceTemplates extends Migration
{
    public function up()
    {
        $this->forge->addColumn('invoice_templates', [
            'template_type' => [
                'type'       => 'ENUM',
                'constraint' => ['invoice', 'business_letter'],
                'default'    => 'invoice',
                'null'       => false,
                'after'      => 'name',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('invoice_templates', 'template_type');
    }
}
