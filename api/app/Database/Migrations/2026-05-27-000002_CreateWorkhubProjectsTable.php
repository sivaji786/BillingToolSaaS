<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubProjectsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'customer_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'name'           => ['type' => 'VARCHAR', 'constraint' => 255],
            'description'    => ['type' => 'TEXT', 'null' => true],
            'status'         => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'active'],
            'colour_accent'  => ['type' => 'VARCHAR', 'constraint' => 7, 'default' => '#3B82F6'],
            'started_at'     => ['type' => 'DATE', 'null' => true],
            'due_at'         => ['type' => 'DATE', 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['tenant_id', 'status']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('customer_id', 'workhub_customers', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('workhub_projects', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_projects', true);
    }
}
