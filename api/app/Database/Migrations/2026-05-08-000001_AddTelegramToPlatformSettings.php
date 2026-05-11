<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTelegramToPlatformSettings extends Migration
{
    public function up()
    {
        $this->forge->addColumn('platform_company_details', [
            'telegram_bot_token' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'default'    => null,
                'after'      => 'bank_account_name',
            ],
            'telegram_chat_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'default'    => null,
                'after'      => 'telegram_bot_token',
            ],
            'telegram_enabled' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 0,
                'after'      => 'telegram_chat_id',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('platform_company_details', [
            'telegram_bot_token',
            'telegram_chat_id',
            'telegram_enabled',
        ]);
    }
}
