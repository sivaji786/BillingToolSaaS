<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Sprint D: External module integration fields on workhub_tasks.
 *
 * correlation_id — opaque ID set by the originating module; enables end-to-end
 *                  traceability across PFE, PC-13, M-02, and PPT (cross-module audit).
 * source_module  — which system created this task ('pc13', 'pfe', 'm02', 'ppt', 'manual').
 * task_type      — semantic classification for reporting and billing filters
 *                  (fault_resolution, commissioning, configuration, investigation, maintenance).
 */
class AddExternalIntegrationFieldsToWorkhubTasks extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('workhub_tasks', [
            'correlation_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 64,
                'null'       => true,
                'default'    => null,
                'after'      => 'pfe_ref_id',
                'comment'    => 'Cross-module trace ID set by originating system',
            ],
            'source_module' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true,
                'default'    => null,
                'after'      => 'correlation_id',
                'comment'    => 'Originating module: manual | pc13 | pfe | m02 | ppt',
            ],
            'task_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => true,
                'default'    => null,
                'after'      => 'source_module',
                'comment'    => 'Semantic type: fault_resolution | commissioning | configuration | investigation | maintenance',
            ],
        ]);

        // Index for cross-module traceability queries
        $this->db->query(
            'ALTER TABLE workhub_tasks ADD INDEX idx_correlation_id (correlation_id)'
        );
        $this->db->query(
            'ALTER TABLE workhub_tasks ADD INDEX idx_source_module (source_module)'
        );
    }

    public function down(): void
    {
        $this->forge->dropColumn('workhub_tasks', 'correlation_id');
        $this->forge->dropColumn('workhub_tasks', 'source_module');
        $this->forge->dropColumn('workhub_tasks', 'task_type');
    }
}
