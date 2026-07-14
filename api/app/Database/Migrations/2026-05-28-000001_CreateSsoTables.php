<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSsoTables extends Migration
{
    public function up()
    {
        // Table storing per-user SSO identity links (one user can have multiple)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'constraint' => 20, 'unsigned' => true, 'auto_increment' => true],
            'user_id' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true],
            'provider' => ['type' => 'VARCHAR', 'constraint' => 30],
            'provider_uid' => ['type' => 'VARCHAR', 'constraint' => 255],
            'email' => ['type' => 'VARCHAR', 'constraint' => 255],
            'name' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'avatar_url' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'access_token' => ['type' => 'TEXT', 'null' => true],
            'id_token' => ['type' => 'TEXT', 'null' => true],
            'last_login_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME'],
            'updated_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['provider', 'provider_uid'], 'uq_provider_uid');
        $this->forge->addKey('user_id', false, false, 'idx_sso_user_id');
        $this->forge->addKey('tenant_id', false, false, 'idx_sso_tenant_id');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('user_sso_identities', true);

        // Per-tenant SAML/OIDC configuration
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true],
            'provider' => ['type' => 'VARCHAR', 'constraint' => 30],
            'enabled' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'sso_only' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'config_json' => ['type' => 'JSON'],
            'created_at' => ['type' => 'DATETIME'],
            'updated_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('tenant_id', 'uq_tenant_sso');
        $this->forge->addKey('tenant_id', false, false, 'idx_tenant_sso');
        $this->forge->createTable('tenant_sso_configs', true);

        $db   = $this->db->database;
        $rows = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '{$db}' AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('sso_only','avatar_url')")->getResultArray();
        $existing = array_column($rows, 'COLUMN_NAME');
        if (!in_array('sso_only', $existing)) {
            $this->db->query("ALTER TABLE users ADD COLUMN sso_only TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = password login blocked'");
        }
        if (!in_array('avatar_url', $existing)) {
            $this->db->query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL DEFAULT NULL");
        }
    }

    public function down()
    {
        $this->forge->dropTable('user_sso_identities', true);
        $this->forge->dropTable('tenant_sso_configs', true);
        $db   = $this->db->database;
        $rows = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '{$db}' AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('sso_only','avatar_url')")->getResultArray();
        $existing = array_column($rows, 'COLUMN_NAME');
        if (in_array('sso_only', $existing)) {
            $this->db->query('ALTER TABLE users DROP COLUMN sso_only');
        }
        if (in_array('avatar_url', $existing)) {
            $this->db->query('ALTER TABLE users DROP COLUMN avatar_url');
        }
    }
}
