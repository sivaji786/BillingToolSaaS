<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCountriesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'code' => [
                'type'       => 'VARCHAR',
                'constraint' => '2',
                'unique'     => true,
            ],
            'name_en' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
            ],
            'name_de' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
            ],
            'name_ar' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('countries');

        // Seed some common countries
        $data = [
            [
                'code' => 'IN',
                'name_en' => 'India',
                'name_de' => 'Indien',
                'name_ar' => 'الهند',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'US',
                'name_en' => 'USA',
                'name_de' => 'USA',
                'name_ar' => 'الولايات المتحدة',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'GB',
                'name_en' => 'UK',
                'name_de' => 'Großbritannien',
                'name_ar' => 'المملكة المتحدة',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'DE',
                'name_en' => 'Germany',
                'name_de' => 'Deutschland',
                'name_ar' => 'ألمانيا',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'FR',
                'name_en' => 'France',
                'name_de' => 'Frankreich',
                'name_ar' => 'فرنسا',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'CA',
                'name_en' => 'Canada',
                'name_de' => 'Kanada',
                'name_ar' => 'كندا',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
            [
                'code' => 'AE',
                'name_en' => 'UAE',
                'name_de' => 'VAE',
                'name_ar' => 'الإمارات العربية المتحدة',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
        ];

        $this->db->table('countries')->insertBatch($data);
    }

    public function down()
    {
        $this->forge->dropTable('countries');
    }
}
