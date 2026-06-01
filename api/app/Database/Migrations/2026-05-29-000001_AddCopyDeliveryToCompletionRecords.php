<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCopyDeliveryToCompletionRecords extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('workhub_completion_records', [
            'copy_channel' => [
                'type'       => 'ENUM',
                'constraint' => ['email', 'sms', 'whatsapp', 'telegram'],
                'null'       => true,
                'default'    => null,
                'after'      => 'gdpr_consent_at',
            ],
            'copy_recipient' => [
                // email address or phone number depending on channel
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'default'    => null,
                'after'      => 'copy_channel',
            ],
            'copy_status' => [
                'type'       => 'ENUM',
                'constraint' => ['pending', 'sent', 'failed'],
                'null'       => true,
                'default'    => null,
                'after'      => 'copy_recipient',
            ],
            'copy_sent_at' => [
                'type'  => 'DATETIME',
                'null'  => true,
                'default' => null,
                'after' => 'copy_status',
            ],
            'copy_error' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'default'    => null,
                'after'      => 'copy_sent_at',
            ],
        ]);
    }

    public function down(): void
    {
        $this->forge->dropColumn('workhub_completion_records', [
            'copy_channel',
            'copy_recipient',
            'copy_status',
            'copy_sent_at',
            'copy_error',
        ]);
    }
}
