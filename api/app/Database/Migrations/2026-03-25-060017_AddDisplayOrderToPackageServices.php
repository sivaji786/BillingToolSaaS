<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDisplayOrderToPackageServices extends Migration
{
    public function up()
    {
        $fields = [
            'display_order' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
                'after'      => 'type',
            ],
        ];

        $this->forge->addColumn('package_services', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('package_services', 'display_order');
    }
}
