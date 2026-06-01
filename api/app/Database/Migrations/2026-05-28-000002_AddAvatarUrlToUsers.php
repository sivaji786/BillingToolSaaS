<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddAvatarUrlToUsers extends Migration
{
    public function up()
    {
        $db   = $this->db->database;
        $rows = $this->db->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '{$db}' AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('avatar_url','sso_only')")->getResultArray();
        $existing = array_column($rows, 'COLUMN_NAME');
        if (!in_array('avatar_url', $existing)) {
            $this->db->query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL DEFAULT NULL");
        }
        if (!in_array('sso_only', $existing)) {
            $this->db->query("ALTER TABLE users ADD COLUMN sso_only TINYINT(1) NOT NULL DEFAULT 0");
        }
    }

    public function down()
    {
        $this->db->query("ALTER TABLE users DROP COLUMN IF EXISTS avatar_url");
        $this->db->query("ALTER TABLE users DROP COLUMN IF EXISTS sso_only");
    }
}
