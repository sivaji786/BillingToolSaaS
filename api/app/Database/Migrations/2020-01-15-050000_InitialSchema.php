<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class InitialSchema extends Migration
{
    public function up()
    {
        // --- 1. SETTINGS & FOUNDATION ---

        // Company Types
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('company_types', true);

        // Plans
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'slug' => ['type' => 'VARCHAR', 'constraint' => 50],
            'price' => ['type' => 'DECIMAL', 'constraint' => '10,2'],
            'billing_period' => ['type' => 'ENUM', 'constraint' => ['monthly', 'yearly'], 'default' => 'monthly'],
            'features' => ['type' => 'JSON', 'null' => true],
            'limits' => ['type' => 'JSON', 'null' => true],
            'is_active' => ['type' => 'BOOLEAN', 'default' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('slug');
        $this->forge->createTable('plans', true);

        // --- 2. MULTI-TENANCY ---

        // Tenants
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'uuid' => ['type' => 'VARCHAR', 'constraint' => 36],
            'stripe_customer_id' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'company_name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'website' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'subdomain' => ['type' => 'VARCHAR', 'constraint' => 100],
            'custom_domain' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'plan_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['active', 'suspended', 'cancelled'], 'default' => 'active'],
            'trial_ends_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('uuid');
        $this->forge->addUniqueKey('subdomain');
        $this->forge->addForeignKey('plan_id', 'plans', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->createTable('tenants', true);

        // Subscriptions
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'plan_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'stripe_subscription_id' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['active', 'past_due', 'cancelled', 'trialing'], 'default' => 'trialing'],
            'current_period_start' => ['type' => 'DATETIME', 'null' => true],
            'current_period_end' => ['type' => 'DATETIME', 'null' => true],
            'cancel_at_period_end' => ['type' => 'BOOLEAN', 'default' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('plan_id', 'plans', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->createTable('subscriptions', true);

        // --- 3. IDENTITY & ACCESS ---

        // Users
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'email' => ['type' => 'VARCHAR', 'constraint' => 255],
            'password_hash' => ['type' => 'VARCHAR', 'constraint' => 255],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'role' => ['type' => 'ENUM', 'constraint' => ['admin', 'user', 'owner'], 'default' => 'user'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('users', true);

        // Admin Users (Backend)
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'email' => ['type' => 'VARCHAR', 'constraint' => 100],
            'password' => ['type' => 'VARCHAR', 'constraint' => 255],
            'role' => ['type' => 'ENUM', 'constraint' => ['super_admin', 'support'], 'default' => 'super_admin'],
            'last_login' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->createTable('admin_users', true);

        // --- 4. RBAC ---

        // Roles
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'company_type_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'department' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'description' => ['type' => 'TEXT', 'null' => true],
            'is_super_admin' => ['type' => 'BOOLEAN', 'default' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('company_type_id', 'company_types', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('roles', true);

        // Rights
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'module' => ['type' => 'VARCHAR', 'constraint' => 50],
            'action' => ['type' => 'VARCHAR', 'constraint' => 50],
            'code' => ['type' => 'VARCHAR', 'constraint' => 100, 'unique' => true],
            'description' => ['type' => 'TEXT', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('rights', true);

        // Pivot: Role Rights
        $this->forge->addField([
            'role_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'right_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
        ]);
        $this->forge->addForeignKey('role_id', 'roles', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('right_id', 'rights', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('role_rights', true);

        // Pivot: User Roles
        $this->forge->addField([
            'user_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'role_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
        ]);
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('role_id', 'roles', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('user_roles', true);

        // --- 5. BUSINESS DATA ---

        // Company Profiles
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'street' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'city' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'postal_code' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'country' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'legal_organization_id' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'bank_iban' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'bank_bic' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'bank_account_name' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'vat_id' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'email' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'phone' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'website' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'logo_url' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'header_text' => ['type' => 'TEXT', 'null' => true],
            'footer_text' => ['type' => 'TEXT', 'null' => true],
            'company_type_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('company_type_id', 'company_types', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('company_profiles', true);

        // Invoices
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
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
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('invoices', true);

        // Invoice Lines
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

        // Invoice Templates
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'description' => ['type' => 'TEXT', 'null' => true],
            'seller_json' => ['type' => 'JSON', 'null' => true],
            'default_currency' => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true],
            'default_tax_category' => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true],
            'default_tax_percent' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => true],
            'default_payment_terms_json' => ['type' => 'JSON', 'null' => true],
            'logo_url' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'header_text' => ['type' => 'TEXT', 'null' => true],
            'footer_text' => ['type' => 'TEXT', 'null' => true],
            'layout_json' => ['type' => 'TEXT', 'null' => true],
            'is_default' => ['type' => 'BOOLEAN', 'default' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('invoice_templates', true);

        // --- 6. UTILITIES ---

        // Countries
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'code' => ['type' => 'VARCHAR', 'constraint' => '2', 'unique' => true],
            'name_en' => ['type' => 'VARCHAR', 'constraint' => '100'],
            'name_de' => ['type' => 'VARCHAR', 'constraint' => '100'],
            'name_ar' => ['type' => 'VARCHAR', 'constraint' => '100'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('countries', true);

        // Audit Logs
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'timestamp' => ['type' => 'DATETIME', 'null' => true],
            'action' => ['type' => 'VARCHAR', 'constraint' => 255],
            'invoice_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'user' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'details' => ['type' => 'TEXT', 'null' => true],
            'signed' => ['type' => 'BOOLEAN', 'default' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('audit_logs', true);

        // Projects
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => '255'],
            'api_key' => ['type' => 'VARCHAR', 'constraint' => '64', 'unique' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('projects', true);

        // Tickets
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tenant_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'user_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'subject' => ['type' => 'VARCHAR', 'constraint' => '255'],
            'description' => ['type' => 'TEXT'],
            'priority' => ['type' => 'ENUM', 'constraint' => ['low', 'medium', 'high', 'critical'], 'default' => 'low'],
            'status' => ['type' => 'ENUM', 'constraint' => ['open', 'in_progress', 'resolved', 'closed'], 'default' => 'open'],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('tickets', true);

        // CodeIgniter Sessions Table
        $this->forge->addField([
            'id' => ['type' => 'VARCHAR', 'constraint' => 128],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45],
            'timestamp' => ['type' => 'INT', 'constraint' => 10, 'unsigned' => true, 'default' => 0],
            'data' => ['type' => 'BLOB'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('timestamp');
        $this->forge->createTable('ci_sessions', true);
    }

    public function down()
    {
        // Drop in reverse order of creation
        $this->forge->dropTable('ci_sessions', true);
        $this->forge->dropTable('tickets', true);
        $this->forge->dropTable('projects', true);
        $this->forge->dropTable('audit_logs', true);
        $this->forge->dropTable('countries', true);
        $this->forge->dropTable('invoice_templates', true);
        $this->forge->dropTable('invoice_lines', true);
        $this->forge->dropTable('invoices', true);
        $this->forge->dropTable('company_profiles', true);
        $this->forge->dropTable('user_roles', true);
        $this->forge->dropTable('role_rights', true);
        $this->forge->dropTable('rights', true);
        $this->forge->dropTable('roles', true);
        $this->forge->dropTable('admin_users', true);
        $this->forge->dropTable('users', true);
        $this->forge->dropTable('subscriptions', true);
        $this->forge->dropTable('tenants', true);
        $this->forge->dropTable('plans', true);
        $this->forge->dropTable('company_types', true);
    }
}
