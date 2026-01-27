<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddHeaderFooterToCompanyProfiles extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('header_text', 'company_profiles')) {
            $this->forge->addColumn('company_profiles', [
                'header_text' => [
                    'type' => 'TEXT',
                    'null' => true,
                ]
            ]);
        }

        if (!$this->db->fieldExists('footer_text', 'company_profiles')) {
            $this->forge->addColumn('company_profiles', [
                'footer_text' => [
                    'type' => 'TEXT',
                    'null' => true,
                ]
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('company_profiles', 'header_text');
        $this->forge->dropColumn('company_profiles', 'footer_text');
    }
}
