<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddUuidToTenants extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tenants', [
            'uuid' => [
                'type'       => 'VARCHAR',
                'constraint' => 36,
                'null'       => true,
                'after'      => 'id',
            ],
        ]);

        // Add index
        $this->db->query('ALTER TABLE tenants ADD UNIQUE KEY uuid (uuid)');

        // Populate existing tenants with UUIDs
        $db = \Config\Database::connect();
        $query = $db->query("SELECT id FROM tenants WHERE uuid IS NULL OR uuid = ''");
        $results = $query->getResultArray();

        foreach ($results as $row) {
            $uuid = $this->generateUuid();
            $db->query("UPDATE tenants SET uuid = '$uuid' WHERE id = " . $row['id']);
        }
        
        // Make it not null after population
        $this->forge->modifyColumn('tenants', [
            'uuid' => [
                'type'       => 'VARCHAR',
                'constraint' => 36,
                'null'       => false,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tenants', 'uuid');
    }
    
    private function generateUuid() {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
