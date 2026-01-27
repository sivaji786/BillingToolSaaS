<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddWebsiteToTenants extends Migration
{
    public function up()
    {
        $fields = [
            'website' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
                'after'      => 'company_name'
            ],
        ];
        $this->forge->addColumn('tenants', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('tenants', 'website');
    }
}
