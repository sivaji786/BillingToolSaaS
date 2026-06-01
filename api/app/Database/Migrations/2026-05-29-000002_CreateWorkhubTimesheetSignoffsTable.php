<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Timesheet sign-off records — EuGH C-55/18 requires workers to formally
 * confirm their weekly time record is complete and accurate.
 */
class CreateWorkhubTimesheetSignoffsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'tenant_id' => [
                'type'     => 'INT',
                'unsigned' => true,
            ],
            'worker_id' => [
                'type'     => 'INT',
                'unsigned' => true,
                'comment'  => 'FK to workhub_workers.id',
            ],
            'week' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
                'comment'    => 'ISO week: 2026-W22',
            ],
            'total_net_hours' => [
                'type'    => 'DECIMAL',
                'constraint' => '6,2',
                'null'    => true,
                'comment' => 'Snapshot of total hours for the week at sign-off time',
            ],
            'signed_at' => [
                'type' => 'DATETIME',
            ],
            'signed_ip' => [
                'type'       => 'VARCHAR',
                'constraint' => 45,
                'null'       => true,
            ],
            'signed_user_agent' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['tenant_id', 'worker_id', 'week']);
        $this->forge->addKey('tenant_id');
        $this->forge->addKey('worker_id');

        $this->forge->createTable('workhub_timesheet_signoffs', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('workhub_timesheet_signoffs', true);
    }
}
