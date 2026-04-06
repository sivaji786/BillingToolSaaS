<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateTenantUsageTable extends Migration
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
            'resource_key' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
            ],
            'used_amount' => [
                'type'       => 'BIGINT',
                'default'    => 0,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['tenant_id', 'resource_key']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('tenant_usage');
    }

    public function down()
    {
        $this->forge->dropTable('tenant_usage');
    }
}
