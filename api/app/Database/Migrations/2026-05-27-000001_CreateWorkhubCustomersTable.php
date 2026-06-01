<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubCustomersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'name'          => ['type' => 'VARCHAR', 'constraint' => 255],
            'email'         => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'phone'         => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'address'       => ['type' => 'TEXT', 'null' => true],
            'company'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'language_pref' => ['type' => 'VARCHAR', 'constraint' => 5, 'default' => 'en'],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('tenant_id');
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('workhub_customers', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_customers', true);
    }
}
