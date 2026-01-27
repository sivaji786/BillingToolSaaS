<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSignedColumnToAuditLogs extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('signed', 'audit_logs')) {
            $this->forge->addColumn('audit_logs', [
                'signed' => [
                    'type'       => 'TINYINT',
                    'constraint' => 1,
                    'default'    => 0,
                    'after'      => 'details' 
                ],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('signed', 'audit_logs')) {
            $this->forge->dropColumn('audit_logs', 'signed');
        }
    }
}
