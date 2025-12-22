<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RemoveScreenshotColumn extends Migration
{
    public function up()
    {
        $this->forge->dropColumn('tickets', 'screenshot');
    }

    public function down()
    {
        $this->forge->addColumn('tickets', [
            'screenshot' => [
                'type' => 'LONGTEXT',
                'null' => true,
                'after' => 'description',
            ],
        ]);
    }
}
