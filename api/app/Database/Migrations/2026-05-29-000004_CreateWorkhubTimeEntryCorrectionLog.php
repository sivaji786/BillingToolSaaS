<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Immutable audit log for planner/manager corrections to time entries.
 * Time entries themselves cannot be edited; this table records corrections
 * as deltas applied on top of the original entry (§16 ArbZG audit trail).
 */
class CreateWorkhubTimeEntryCorrectionLog extends Migration
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
            'time_entry_id' => [
                'type'     => 'INT',
                'unsigned' => true,
                'comment'  => 'FK to workhub_time_entries.id',
            ],
            'corrected_by_user_id' => [
                'type'     => 'INT',
                'unsigned' => true,
                'comment'  => 'Planner/manager who made the correction',
            ],
            // Snapshot of old values
            'old_started_at' => ['type' => 'DATETIME', 'null' => true],
            'old_ended_at'   => ['type' => 'DATETIME', 'null' => true],
            'old_break_min'  => ['type' => 'SMALLINT', 'unsigned' => true, 'default' => 0],
            'old_notes'      => ['type' => 'TEXT', 'null' => true],
            // New values after correction
            'new_started_at' => ['type' => 'DATETIME', 'null' => true],
            'new_ended_at'   => ['type' => 'DATETIME', 'null' => true],
            'new_break_min'  => ['type' => 'SMALLINT', 'unsigned' => true, 'default' => 0],
            'new_notes'      => ['type' => 'TEXT', 'null' => true],
            // Reason is mandatory for compliance
            'correction_reason' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
            ],
            'corrected_at' => ['type' => 'DATETIME'],
            'corrected_ip' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('tenant_id');
        $this->forge->addKey('time_entry_id');
        $this->forge->addKey('corrected_by_user_id');

        $this->forge->createTable('workhub_time_entry_corrections', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('workhub_time_entry_corrections', true);
    }
}
