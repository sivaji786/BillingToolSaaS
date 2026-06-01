<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddWhRoleToWorkhubWorkers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('workhub_workers', [
            'wh_role' => [
                'type'       => 'ENUM',
                'constraint' => ['worker', 'planner', 'manager', 'finance', 'client'],
                'null'       => true,
                'default'    => null,
                'after'      => 'user_id',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('workhub_workers', 'wh_role');
    }
}
