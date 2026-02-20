<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAiQueryHistoryTable extends Migration
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
            'prompt' => [
                'type'           => 'TEXT',
            ],
            'sql_query' => [
                'type'           => 'TEXT',
            ],
            'created_at' => [
                'type'           => 'DATETIME',
                'null'           => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('aiquery_history', true);
    }

    public function down()
    {
        $this->forge->dropTable('aiquery_history', true);
    }
}
