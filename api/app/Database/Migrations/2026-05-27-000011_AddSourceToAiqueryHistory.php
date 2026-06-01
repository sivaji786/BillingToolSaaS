<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSourceToAiqueryHistory extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('aiquery_history', [
            'source' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true,
                'default'    => null,
                'after'      => 'tenant_id',
            ],
        ]);

        $this->db->query('CREATE INDEX idx_aiquery_source_tenant ON aiquery_history (tenant_id, source, created_at)');
    }

    public function down(): void
    {
        $this->forge->dropColumn('aiquery_history', 'source');
    }
}
