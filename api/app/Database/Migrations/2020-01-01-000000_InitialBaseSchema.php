<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class InitialBaseSchema extends Migration
{
    public function up()
    {
        // 1. Create Users Table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'email' => ['type' => 'VARCHAR', 'constraint' => 255],
            'password_hash' => ['type' => 'VARCHAR', 'constraint' => 255],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'role' => ['type' => 'ENUM', 'constraint' => ['admin', 'user', 'owner'], 'default' => 'user'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->createTable('users', true);

        // 2. Create Invoices Table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'invoice_number' => ['type' => 'VARCHAR', 'constraint' => 50],
            'invoice_type_code' => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => '380'],
            'issue_date' => ['type' => 'DATE'],
            'due_date' => ['type' => 'DATE', 'null' => true],
            'currency' => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => 'EUR'],
            'status' => ['type' => 'ENUM', 'constraint' => ['draft', 'sent', 'paid', 'overdue', 'cancelled'], 'default' => 'draft'],
            'seller_name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'seller_vat_id' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'seller_address_json' => ['type' => 'JSON', 'null' => true],
            'seller_contact_json' => ['type' => 'JSON', 'null' => true],
            'buyer_name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'buyer_vat_id' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'buyer_address_json' => ['type' => 'JSON', 'null' => true],
            'buyer_contact_json' => ['type' => 'JSON', 'null' => true],
            'line_extension_amount' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
            'tax_exclusive_amount' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
            'tax_inclusive_amount' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
            'payable_amount' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
            'payment_terms_json' => ['type' => 'JSON', 'null' => true],
            'payment_means_json' => ['type' => 'JSON', 'null' => true],
            'note' => ['type' => 'TEXT', 'null' => true],
            'signed' => ['type' => 'BOOLEAN', 'default' => false],
            'signature_date' => ['type' => 'DATETIME', 'null' => true],
            'created_by' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('invoice_number');
        $this->forge->createTable('invoices', true);

        // 3. Create Invoice Templates Table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'is_default' => ['type' => 'BOOLEAN', 'default' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('invoice_templates', true);

        // 4. Create Company Profiles Table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'company_name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'address' => ['type' => 'TEXT', 'null' => true],
            'phone' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'email' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'vat_id' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'logo_url' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('company_profiles', true);

        // 5. Create Invoice Lines Table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'invoice_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'description' => ['type' => 'TEXT'],
            'quantity' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 1],
            'unit_code' => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => 'C62'],
            'unit_price' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
            'tax_category' => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => 'S'],
            'tax_percent' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 0],
            'line_extension_amount' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('invoice_id', 'invoices', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('invoice_lines', true);
    }

    public function down()
    {
        $this->forge->dropTable('invoice_lines', true);
        $this->forge->dropTable('company_profiles', true);
        $this->forge->dropTable('invoice_templates', true);
        $this->forge->dropTable('invoices', true);
        $this->forge->dropTable('users', true);
    }
}
