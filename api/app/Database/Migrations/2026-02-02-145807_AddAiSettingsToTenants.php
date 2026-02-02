<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddAiSettingsToTenants extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tenants', [
            'ai_provider' => [
                'type' => 'ENUM',
                'constraint' => ['gemini', 'openai'],
                'default' => 'gemini',
                'after' => 'status'
            ],
            'gemini_api_key' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'ai_provider'
            ],
            'openai_api_key' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'gemini_api_key'
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tenants', ['ai_provider', 'gemini_api_key', 'openai_api_key']);
    }
}
