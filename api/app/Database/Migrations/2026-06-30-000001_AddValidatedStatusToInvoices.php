<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddValidatedStatusToInvoices extends Migration
{
    public function up()
    {
        $this->db->query("ALTER TABLE invoices MODIFY status ENUM('draft','validated','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft'");
    }

    public function down()
    {
        $this->db->query("UPDATE invoices SET status = 'draft' WHERE status = 'validated'");
        $this->db->query("ALTER TABLE invoices MODIFY status ENUM('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft'");
    }
}
