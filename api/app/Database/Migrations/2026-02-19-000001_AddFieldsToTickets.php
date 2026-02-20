<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddFieldsToTickets extends Migration
{
    public function up()
    {
        $fields = [
            'project_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'tenant_id'
            ],
            'client_ip' => [
                'type' => 'VARCHAR',
                'constraint' => '45',
                'null' => true,
                'after' => 'description'
            ],
            'screenshot_path' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
                'after' => 'client_ip'
            ],
            'domain' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
                'after' => 'screenshot_path'
            ],
            'page' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
                'after' => 'domain'
            ],
        ];
        $this->forge->addColumn('tickets', $fields);
        
        // Add foreign key for project_id
        $this->db->query('ALTER TABLE tickets ADD CONSTRAINT fk_tickets_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE');
    }

    public function down()
    {
        $this->forge->dropForeignKey('tickets', 'fk_tickets_project_id');
        $this->forge->dropColumn('tickets', ['project_id', 'client_ip', 'screenshot_path']);
    }
}
