<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateQuickAccessSessionsTable extends Migration
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
            'token_hash' => [
                'type'       => 'VARCHAR',
                'constraint' => 64,
                'comment'    => 'SHA-256 of the full session_token for fast lookup',
            ],
            'email' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
            ],
            'otp_hash' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'comment'    => 'bcrypt hash of the OTP',
            ],
            'invoice_draft' => [
                'type'    => 'LONGTEXT',
                'null'    => true,
                'comment' => 'JSON blob of the invoice being edited',
            ],
            'verified' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'comment'    => '1 = OTP confirmed',
            ],
            'expires_at' => [
                'type' => 'DATETIME',
            ],
            'created_at' => [
                'type'    => 'DATETIME',
                'null'    => true,
            ],
        ]);

        $this->forge->addKey('id', true);              // primary key
        $this->forge->addUniqueKey('token_hash');       // unique — separate from field definition
        $this->forge->addKey('email');
        $this->forge->addKey('expires_at');

        $this->forge->createTable('quick_access_sessions');
    }

    public function down()
    {
        $this->forge->dropTable('quick_access_sessions', true);
    }
}
