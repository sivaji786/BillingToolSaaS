<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubSettingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'           => ['type' => 'INT', 'unsigned' => true, 'null' => false],
            'default_hourly_rate' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => '0.00'],
            'currency'            => ['type' => 'VARCHAR', 'constraint' => 3, 'default' => 'EUR'],
            'tax_percent'         => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => '19.00'],
            'pdf_language'        => ['type' => 'VARCHAR', 'constraint' => 5, 'default' => 'en'],
            'created_at'          => ['type' => 'DATETIME', 'null' => true],
            'updated_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('tenant_id');
        $this->forge->createTable('workhub_settings', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_settings', true);
    }
}
