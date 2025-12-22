<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddScreenshotToTicketsTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tickets', [
            'screenshot' => [
                'type' => 'LONGTEXT',
                'null' => true,
                'after' => 'description',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tickets', 'screenshot');
    }
}
