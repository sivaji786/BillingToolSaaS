<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTypeAndAttachmentsToTickets extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tickets', [
            'type' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true,
                'default'    => 'bug',
                'after'      => 'priority',
            ],
            'attachments' => [
                'type'  => 'TEXT',
                'null'  => true,
                'after' => 'screenshot_path',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tickets', ['type', 'attachments']);
    }
}
