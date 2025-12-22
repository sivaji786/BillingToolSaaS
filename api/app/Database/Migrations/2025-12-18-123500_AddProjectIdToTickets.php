<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProjectIdToTickets extends Migration
{
    public function up()
    {
        $fields = [
            'project_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'user_id',
            ],
        ];
        $this->forge->addColumn('tickets', $fields);
        
        // Add foreign key
        $this->db->query('ALTER TABLE tickets ADD CONSTRAINT fk_tickets_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL');
    }

    public function down()
    {
        $this->forge->dropForeignKey('tickets', 'fk_tickets_project_id');
        $this->forge->dropColumn('tickets', 'project_id');
    }
}
