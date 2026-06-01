<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubTaskPhotosTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'task_id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'completion_record_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'uploaded_by'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            // jobsite | identity
            'photo_type'           => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'jobsite'],
            // tenant_id/task_id/uuid.jpg (never expose raw bucket path)
            'storage_path'         => ['type' => 'VARCHAR', 'constraint' => 500],
            'original_filename'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'mime_type'            => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'size_bytes'           => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'created_at'           => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey(['tenant_id', 'task_id']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('task_id', 'workhub_tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('completion_record_id', 'workhub_completion_records', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('uploaded_by', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('workhub_task_photos', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_task_photos', true);
    }
}
