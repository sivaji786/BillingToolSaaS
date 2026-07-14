<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWorkhubUsageMonthlyTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                 => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'          => ['type' => 'INT', 'unsigned' => true],
            'year_month'         => ['type' => 'VARCHAR', 'constraint' => 7],
            'tasks_created'      => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'ai_calls_used'      => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'pdf_exports'        => ['type' => 'INT', 'unsigned' => true, 'default' => 0],
            'storage_bytes_used' => ['type' => 'BIGINT', 'unsigned' => true, 'default' => 0],
            'created_at'         => ['type' => 'DATETIME', 'null' => true],
            'updated_at'         => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['tenant_id', 'year_month'], 'uq_tenant_year_month');
        $this->forge->addKey('tenant_id', false, false, 'idx_whu_tenant');
        $this->forge->createTable('workhub_usage_monthly', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_usage_monthly', true);
    }
}
