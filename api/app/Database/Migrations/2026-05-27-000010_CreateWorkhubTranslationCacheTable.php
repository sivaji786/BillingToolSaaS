<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

// Prevents redundant Anthropic API calls for repeated translation requests
class CreateWorkhubTranslationCacheTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            // SHA-256 of source text for O(1) cache lookup
            'source_hash'     => ['type' => 'VARCHAR', 'constraint' => 64],
            'source_lang'     => ['type' => 'VARCHAR', 'constraint' => 5],
            'target_lang'     => ['type' => 'VARCHAR', 'constraint' => 5],
            'translated_text' => ['type' => 'TEXT'],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'expires_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['source_hash', 'source_lang', 'target_lang']);
        $this->forge->addKey(['tenant_id', 'expires_at']);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('workhub_translation_cache', true);
    }

    public function down()
    {
        $this->forge->dropTable('workhub_translation_cache', true);
    }
}
