<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubInboxMessagesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'recipient_user_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'task_id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            // planner | client | system
            'sender_type'         => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'system'],
            'sender_id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'subject'             => ['type' => 'VARCHAR', 'constraint' => 255],
            'body'                => ['type' => 'TEXT'],
            'read_at'             => ['type' => 'DATETIME', 'null' => true],
            'created_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['tenant_id', 'recipient_user_id', 'read_at']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('recipient_user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('task_id', 'workhub_tasks', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('workhub_inbox_messages', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_inbox_messages', true);
    }
}
