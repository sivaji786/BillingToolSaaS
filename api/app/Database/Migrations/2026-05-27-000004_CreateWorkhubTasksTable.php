<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubTasksTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                 => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'project_id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'assigned_worker_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_by'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'title'              => ['type' => 'VARCHAR', 'constraint' => 255],
            'description'        => ['type' => 'TEXT', 'null' => true],
            // open | in_progress | done | problem
            'status'             => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'open'],
            // low | medium | high | urgent
            'priority'           => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'medium'],
            'est_hours'          => ['type' => 'DECIMAL', 'constraint' => '8,2', 'null' => true],
            'logged_hours'       => ['type' => 'DECIMAL', 'constraint' => '8,2', 'default' => 0.00],
            'location_tag'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'due_date'           => ['type' => 'DATE', 'null' => true],
            'pfe_ref_type'       => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'pfe_ref_id'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'created_at'         => ['type' => 'DATETIME', 'null' => true],
            'updated_at'         => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'         => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['tenant_id', 'status']);
        $this->forge->addKey(['tenant_id', 'assigned_worker_id']);
        $this->forge->addKey(['tenant_id', 'project_id']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('project_id', 'workhub_projects', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('assigned_worker_id', 'workhub_workers', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('workhub_tasks', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_tasks', true);
    }
}
