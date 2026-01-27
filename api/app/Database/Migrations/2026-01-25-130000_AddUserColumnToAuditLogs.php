<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddUserColumnToAuditLogs extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('user', 'audit_logs')) {
            $this->forge->addColumn('audit_logs', [
                'user' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => true,
                    'after'      => 'user_id' // Assuming user_id exists based on inspection
                ],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('user', 'audit_logs')) {
            $this->forge->dropColumn('audit_logs', 'user');
        }
    }
}
