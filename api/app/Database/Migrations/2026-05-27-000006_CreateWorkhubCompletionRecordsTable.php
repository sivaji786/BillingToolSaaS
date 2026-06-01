<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

// eIDAS 910/2014 Simple Electronic Signature + §257 HGB 10-year retention
class CreateWorkhubCompletionRecordsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'                   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'task_id'                     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'completion_note'             => ['type' => 'TEXT', 'null' => true],
            'completion_note_original'    => ['type' => 'TEXT', 'null' => true],
            'materials_json'              => ['type' => 'JSON', 'null' => true],
            'worker_signature_data'       => ['type' => 'LONGTEXT', 'null' => true],
            'worker_signed_at'            => ['type' => 'DATETIME', 'null' => true],
            'customer_signature_data'     => ['type' => 'LONGTEXT', 'null' => true],
            'customer_name'               => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'customer_signed_at'          => ['type' => 'DATETIME', 'null' => true],
            // eIDAS metadata
            'signed_ip'                   => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'signed_user_agent'           => ['type' => 'TEXT', 'null' => true],
            'consent_text_version'        => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
            // GDPR
            'gdpr_consent_given'          => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'gdpr_consent_at'             => ['type' => 'DATETIME', 'null' => true],
            'created_at'                  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'                  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('task_id');
        $this->forge->addKey('tenant_id');
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('task_id', 'workhub_tasks', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('workhub_completion_records', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_completion_records', true);
    }
}
