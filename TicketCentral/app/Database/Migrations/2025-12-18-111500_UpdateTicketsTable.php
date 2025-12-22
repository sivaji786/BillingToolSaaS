<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdateTicketsTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tickets', [
            'domain' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
                'after'      => 'screenshot',
            ],
            'page' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
                'after'      => 'domain',
            ],
            'client_ip' => [
                'type'       => 'VARCHAR',
                'constraint' => '45',
                'null'       => true,
                'after'      => 'page',
            ],
            'screenshot_path' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
                'after'      => 'client_ip',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tickets', ['domain', 'page', 'client_ip', 'screenshot_path']);
    }
}
