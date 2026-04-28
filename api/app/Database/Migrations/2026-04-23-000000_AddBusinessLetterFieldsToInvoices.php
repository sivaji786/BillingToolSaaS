<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddBusinessLetterFieldsToInvoices extends Migration
{
    public function up()
    {
        $fields = [
            'template_type' => [
                'type'       => 'ENUM',
                'constraint' => ['invoice', 'business_letter'],
                'default'    => 'invoice',
                'null'       => false,
                'after'      => 'tenant_id',
            ],
            'body' => [
                'type' => 'LONGTEXT',
                'null' => true,
                'after' => 'note',
            ],
            'salutation' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'after'      => 'body',
            ],
            'closing' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'after'      => 'salutation',
            ],
        ];

        $this->forge->addColumn('invoices', $fields);

        $this->db->query('CREATE INDEX idx_invoices_template_type ON invoices (template_type)');
    }

    public function down()
    {
        $this->db->query('DROP INDEX idx_invoices_template_type ON invoices');
        $this->forge->dropColumn('invoices', ['template_type', 'body', 'salutation', 'closing']);
    }
}
