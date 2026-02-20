<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkspaceFilesTable extends Migration
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
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
            ],
            'user_id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'null'           => true,
            ],
            'name' => [
                'type'           => 'VARCHAR',
                'constraint'     => 255,
            ],
            'original_name' => [
                'type'           => 'VARCHAR',
                'constraint'     => 255,
            ],
            'path' => [
                'type'           => 'TEXT',
            ],
            'is_dir' => [
                'type'           => 'BOOLEAN',
                'default'        => false,
            ],
            'mime_type' => [
                'type'           => 'VARCHAR',
                'constraint'     => 100,
                'null'           => true,
            ],
            'size' => [
                'type'           => 'BIGINT',
                'unsigned'       => true,
                'default'        => 0,
            ],
            'extension' => [
                'type'           => 'VARCHAR',
                'constraint'     => 20,
                'null'           => true,
            ],
            'metadata' => [
                'type'           => 'JSON',
                'null'           => true,
            ],
            'content' => [
                'type'           => 'LONGTEXT',
                'null'           => true,
            ],
            'created_at' => [
                'type'           => 'DATETIME',
                'null'           => true,
            ],
            'updated_at' => [
                'type'           => 'DATETIME',
                'null'           => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('workspace_files', true);
    }

    public function down()
    {
        $this->forge->dropTable('workspace_files', true);
    }
}
