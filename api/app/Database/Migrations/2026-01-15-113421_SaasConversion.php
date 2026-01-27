<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class SaasConversion extends Migration
{
    public function up()
    {
        // 1. Create Plans Table
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

        // 2. Create Tenants Table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'company_name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'subdomain' => ['type' => 'VARCHAR', 'constraint' => 100],
            'custom_domain' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'plan_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['active', 'suspended', 'cancelled'], 'default' => 'active'],
            'trial_ends_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('subdomain');
        $this->forge->addForeignKey('plan_id', 'plans', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->createTable('tenants', true);

        // 3. Create Subscriptions Table
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
        $this->forge->addUniqueKey('stripe_subscription_id');
        $this->forge->addForeignKey('tenant_id', 'tenants', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('plan_id', 'plans', 'id', 'RESTRICT', 'RESTRICT');
        $this->forge->createTable('subscriptions', true);

        // 4. Add tenant_id to existing tables
        $tables = [
            'users', 
            'invoices', 
            'invoice_templates', 
            'projects', 
            'audit_logs', 
            'tickets',
            'company_profiles',
            'roles',
            'rights'
        ];

        foreach ($tables as $table) {
            if ($this->db->tableExists($table)) {
                $fields = [
                    'tenant_id' => [
                        'type' => 'INT',
                        'constraint' => 11,
                        'unsigned' => true,
                        'null' => true,
                        'after' => 'id'
                    ]
                ];
                $this->forge->addColumn($table, $fields);
                
                // Add index manually
                $this->db->query("ALTER TABLE `$table` ADD INDEX `idx_{$table}_tenant` (`tenant_id`) ");
            }
        }
    }

    public function down()
    {
        $this->forge->dropTable('subscriptions', true);
        $this->forge->dropTable('tenants', true);
        $this->forge->dropTable('plans', true);

        $tables = [
            'users', 
            'invoices', 
            'invoice_templates', 
            'projects', 
            'audit_logs', 
            'tickets',
            'company_profiles',
            'roles',
            'rights'
        ];

        foreach ($tables as $table) {
             if ($this->db->tableExists($table)) {
                if ($this->db->fieldExists('tenant_id', $table)) {
                    $this->forge->dropColumn($table, 'tenant_id');
                }
             }
        }
    }
}
