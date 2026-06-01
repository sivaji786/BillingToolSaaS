<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubMaterialEntriesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'task_id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'completion_record_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'material_name'        => ['type' => 'VARCHAR', 'constraint' => 255],
            'quantity'             => ['type' => 'DECIMAL', 'constraint' => '10,3', 'default' => 1.000],
            'unit'                 => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'pcs'],
            'unit_price'           => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0.00],
            'total_price'          => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0.00],
            'catalogue_ref'        => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'created_at'           => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['tenant_id', 'task_id']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('task_id', 'workhub_tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('completion_record_id', 'workhub_completion_records', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('workhub_material_entries', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_material_entries', true);
    }
}
