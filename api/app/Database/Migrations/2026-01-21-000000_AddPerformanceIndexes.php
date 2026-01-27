<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPerformanceIndexes extends Migration
{
    public function up()
    {
        // 1. Audit Logs Performance
        $indexes = $this->db->getIndexData('audit_logs');
        $indexNames = array_column($indexes, 'name');

        if (!in_array('idx_audit_logs_timestamp', $indexNames)) {
            $this->db->query("ALTER TABLE `audit_logs` ADD INDEX `idx_audit_logs_timestamp` (`timestamp`)");
        }
        if (!in_array('idx_audit_logs_invoice', $indexNames)) {
            $this->db->query("ALTER TABLE `audit_logs` ADD INDEX `idx_audit_logs_invoice` (`invoice_number`)");
        }

        // 2. Users Performance
        $indexes = $this->db->getIndexData('users');
        $indexNames = array_column($indexes, 'name');

        if (!in_array('idx_users_email', $indexNames)) {
            $this->db->query("ALTER TABLE `users` ADD INDEX `idx_users_email` (`email`)");
        }
    }

    public function down()
    {
        $this->db->query("ALTER TABLE `audit_logs` DROP INDEX `idx_audit_logs_timestamp`");
        $this->db->query("ALTER TABLE `audit_logs` DROP INDEX `idx_audit_logs_invoice`");
        
        if ($this->db->indexExists('users', 'idx_users_email')) {
            $this->db->query("ALTER TABLE `users` DROP INDEX `idx_users_email`");
        }
    }
}
