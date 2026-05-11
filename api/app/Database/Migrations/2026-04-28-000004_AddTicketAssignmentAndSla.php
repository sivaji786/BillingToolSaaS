<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTicketAssignmentAndSla extends Migration
{
    public function up()
    {
        $this->forge->addColumn('tickets', [
            'assigned_to' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'status',
            ],
            'first_response_at' => [
                'type'  => 'DATETIME',
                'null'  => true,
                'after' => 'assigned_to',
            ],
            'resolved_at' => [
                'type'  => 'DATETIME',
                'null'  => true,
                'after' => 'first_response_at',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('tickets', ['assigned_to', 'first_response_at', 'resolved_at']);
    }
}
