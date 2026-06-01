<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

// §16 ArbZG + EuGH C-55/18: objective, reliable, accessible time records
class CreateWorkhubTimeEntriesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'task_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'worker_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            // work | break
            'entry_type'    => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => 'work'],
            'started_at'    => ['type' => 'DATETIME'],
            'ended_at'      => ['type' => 'DATETIME', 'null' => true],
            'break_minutes' => ['type' => 'INT', 'default' => 0],
            'notes'         => ['type' => 'TEXT', 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['tenant_id', 'task_id']);
        $this->forge->addKey(['tenant_id', 'worker_id', 'started_at']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('task_id', 'workhub_tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('worker_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('workhub_time_entries', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_time_entries', true);
    }
}
