<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddShareTokenToInvoices extends Migration
{
    public function up()
    {
        $this->forge->addColumn('invoices', [
            'share_token' => [
                'type'    => 'VARCHAR',
                'constraint' => 64,
                'null'    => true,
                'default' => null,
                'after'   => 'signed',
            ],
        ]);

        $this->db->query('CREATE UNIQUE INDEX idx_invoices_share_token ON invoices (share_token)');
    }

    public function down()
    {
        $this->db->query('DROP INDEX idx_invoices_share_token ON invoices');
        $this->forge->dropColumn('invoices', 'share_token');
    }
}
