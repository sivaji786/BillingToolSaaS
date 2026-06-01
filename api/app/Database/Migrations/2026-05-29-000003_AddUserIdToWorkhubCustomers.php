<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Links a tenant user account to a WorkHub customer record.
 * When set, that user gains client-role read-only access to the customer's projects.
 * Used by TaskController to scope visible tasks for client-role users.
 */
class AddUserIdToWorkhubCustomers extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('workhub_customers', [
            'user_id' => [
                'type'     => 'INT',
                'unsigned' => true,
                'null'     => true,
                'default'  => null,
                'after'    => 'language_pref',
                'comment'  => 'FK to users.id — grants client portal access to this customer\'s projects',
            ],
        ]);

        // Index for fast client-access lookup
        $this->db->query(
            'ALTER TABLE workhub_customers ADD INDEX idx_user_id (user_id)'
        );
    }

    public function down(): void
    {
        $this->forge->dropColumn('workhub_customers', 'user_id');
    }
}
