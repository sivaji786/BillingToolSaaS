<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPerformanceIndexes extends Migration
{
    public function up()
    {
        // 1. Audit Logs: Index timestamp for faster activity feed
        $this->db->query('CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp)');
        $this->db->query('CREATE INDEX idx_audit_logs_invoice ON audit_logs(invoice_number)');

        // 2. Invoices: Index issue_date for sorting and filtering
        $this->db->query('CREATE INDEX idx_invoices_issue_date ON invoices(issue_date)');
        $this->db->query('CREATE INDEX idx_invoices_status ON invoices(status)');

        // 3. User Roles: Explicit index for faster RBAC joins (though FK usually indexes)
        $this->db->query('CREATE INDEX idx_user_roles_user ON user_roles(user_id)');
        $this->db->query('CREATE INDEX idx_user_roles_role ON user_roles(role_id)');
    }

    public function down()
    {
        $this->db->query('DROP INDEX idx_audit_logs_timestamp ON audit_logs');
        $this->db->query('DROP INDEX idx_audit_logs_invoice ON audit_logs');
        $this->db->query('DROP INDEX idx_invoices_issue_date ON invoices');
        $this->db->query('DROP INDEX idx_invoices_status ON invoices');
        $this->db->query('DROP INDEX idx_user_roles_user ON user_roles');
        $this->db->query('DROP INDEX idx_user_roles_role ON user_roles');
    }
}
