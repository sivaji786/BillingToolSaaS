<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUsageNotificationsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'tenant_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'resource_type' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
            ],
            'threshold' => [
                'type'       => 'INT',
                'constraint' => 5,
            ],
            'period_start' => [
                'type' => 'DATETIME',
                'null' => true
            ],
            'sent_at' => [
                'type' => 'DATETIME',
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('usage_notifications');
    }

    public function down()
    {
        $this->forge->dropTable('usage_notifications');
    }
}
