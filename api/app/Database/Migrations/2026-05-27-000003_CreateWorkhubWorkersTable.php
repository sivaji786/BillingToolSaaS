<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubWorkersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'user_id'                 => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'skills_json'             => ['type' => 'JSON', 'null' => true],
            'capacity_hours_per_week' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 40.00],
            'hourly_rate'             => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
            'language_pref'           => ['type' => 'VARCHAR', 'constraint' => 5, 'default' => 'en'],
            'active'                  => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at'              => ['type' => 'DATETIME', 'null' => true],
            'updated_at'              => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['tenant_id', 'user_id']);
        $this->forge->addKey(['tenant_id', 'active']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('workhub_workers', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_workers', true);
    }
}
