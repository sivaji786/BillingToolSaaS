<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdatePlatformDetails extends Migration
{
    public function up()
    {
        // API Keys table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'key' => ['type' => 'VARCHAR', 'constraint' => 255],
            'status' => ['type' => 'ENUM', 'constraint' => ['active', 'revoked'], 'default' => 'active'],
            'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
            'last_used' => ['type' => 'TIMESTAMP', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('api_keys', true);

        // Platform Company Details table
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 255],
            'vat_id' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'street' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'city' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'postal_code' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'country' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'email' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'phone' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'bank_iban' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'bank_bic' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'bank_account_name' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'updated_at' => ['type' => 'TIMESTAMP', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('platform_company_details', true);
    }

    public function down()
    {
        $this->forge->dropTable('platform_company_details', true);
        $this->forge->dropTable('api_keys', true);
    }
}
