<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class FixAuditLogs extends Migration
{
    public function up()
    {
        // Check if column exists first to avoid errors
        if (!$this->db->fieldExists('invoice_number', 'audit_logs')) {
            $this->forge->addColumn('audit_logs', [
                'invoice_number' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => true,
                    'after'      => 'action'
                ],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('invoice_number', 'audit_logs')) {
            $this->forge->dropColumn('audit_logs', 'invoice_number');
        }
    }
}
