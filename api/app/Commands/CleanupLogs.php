<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class CleanupLogs extends BaseCommand
{
    protected $group       = 'Maintenance';
    protected $name        = 'cleanup:logs';
    protected $description = 'Archives old audit_logs (>12 months) and trims aiquery_history (>100 rows per user).';

    public function run(array $params)
    {
        $db = \Config\Database::connect();

        // --- audit_logs: delete rows older than 12 months ---
        $cutoff = date('Y-m-d H:i:s', strtotime('-12 months'));

        if ($db->tableExists('audit_logs')) {
            $deleted = $db->table('audit_logs')
                ->where('timestamp <', $cutoff)
                ->delete();
            CLI::write("audit_logs: removed records older than 12 months (cutoff: {$cutoff}).", 'green');
        } else {
            CLI::write("audit_logs table not found, skipping.", 'yellow');
        }

        // --- aiquery_history: keep only the latest 100 rows per (tenant_id, user_id) ---
        if ($db->tableExists('aiquery_history')) {
            // Fetch all distinct user/tenant combinations
            $users = $db->query(
                'SELECT DISTINCT tenant_id, user_id FROM aiquery_history'
            )->getResultArray();

            $trimmed = 0;
            foreach ($users as $row) {
                $tenantId = $row['tenant_id'];
                $userId   = $row['user_id'];

                // Find the 100th newest id for this user
                $cutoffRow = $db->query(
                    'SELECT id FROM aiquery_history
                     WHERE tenant_id = ? AND user_id = ?
                     ORDER BY created_at DESC
                     LIMIT 1 OFFSET 99',
                    [$tenantId, $userId]
                )->getRowArray();

                if ($cutoffRow) {
                    $db->query(
                        'DELETE FROM aiquery_history
                         WHERE tenant_id = ? AND user_id = ? AND id < ?',
                        [$tenantId, $userId, $cutoffRow['id']]
                    );
                    $trimmed++;
                }
            }
            CLI::write("aiquery_history: trimmed {$trimmed} user(s) to ≤100 rows each.", 'green');
        } else {
            CLI::write("aiquery_history table not found, skipping.", 'yellow');
        }

        CLI::write('Log cleanup complete.', 'green');
    }
}
