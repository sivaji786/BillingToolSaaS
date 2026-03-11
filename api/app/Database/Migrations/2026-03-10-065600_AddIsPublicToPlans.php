<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddIsPublicToPlans extends Migration
{
    public function up()
    {
        $fields = [
            'is_public' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 1,
                'after'      => 'is_trailing'
            ],
        ];
        $this->forge->addColumn('plans', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('plans', 'is_public');
    }
}
