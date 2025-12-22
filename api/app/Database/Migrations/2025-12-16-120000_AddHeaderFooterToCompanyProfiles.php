<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddHeaderFooterToCompanyProfiles extends Migration
{
    public function up()
    {
        $fields = [
            'header_text' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'footer_text' => [
                'type' => 'TEXT',
                'null' => true,
            ],
        ];

        $this->forge->addColumn('company_profiles', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('company_profiles', 'header_text');
        $this->forge->dropColumn('company_profiles', 'footer_text');
    }
}
