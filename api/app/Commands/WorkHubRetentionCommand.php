<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class WorkHubRetentionCommand extends BaseCommand
{
    protected $group       = 'WorkHub';
    protected $name        = 'workhub:retention';
    protected $description = 'Checks WorkHub record retention compliance (§257 HGB / §147 AO — 10-year minimum).';

    public function run(array $params)
    {
        $db = \Config\Database::connect();

        CLI::write('WorkHub Retention Check — ' . date('Y-m-d H:i:s'), 'cyan');
        CLI::write(str_repeat('-', 60), 'dark_gray');

        if (!$db->tableExists('workhub_completion_records')) {
            CLI::write('workhub_completion_records table not found — skipping.', 'yellow');
            return;
        }

        $tenYearsAgo    = date('Y-m-d H:i:s', strtotime('-10 years'));
        $nineYearsAgo   = date('Y-m-d H:i:s', strtotime('-9 years'));
        $today          = date('Y-m-d H:i:s');

        // Records that have passed the 10-year retention period — can now be archived/deleted
        $expired = $db->query(
            'SELECT COUNT(*) AS cnt FROM workhub_completion_records WHERE created_at < ? AND is_dual_signed = 1',
            [$tenYearsAgo]
        )->getRowArray();

        // Records approaching expiry (between 9 and 10 years old) — warn operators
        $approaching = $db->query(
            'SELECT id, task_id, created_at FROM workhub_completion_records
             WHERE created_at BETWEEN ? AND ? AND is_dual_signed = 1
             ORDER BY created_at ASC',
            [$nineYearsAgo, $tenYearsAgo]
        )->getResultArray();

        // Records < 10 years old that someone attempted to hard-delete (detect via audit log)
        $prematureAttempts = 0;
        if ($db->tableExists('audit_logs')) {
            $result = $db->query(
                "SELECT COUNT(*) AS cnt FROM audit_logs
                 WHERE action LIKE 'workhub.%' AND details LIKE '%delete%'
                   AND timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)"
            )->getRowArray();
            $prematureAttempts = (int) ($result['cnt'] ?? 0);
        }

        // Summary output
        CLI::write(sprintf(
            'Eligible for archival (>10 yrs, dual-signed): %d record(s)',
            (int) ($expired['cnt'] ?? 0)
        ), (int) ($expired['cnt'] ?? 0) > 0 ? 'yellow' : 'green');

        CLI::write(sprintf(
            'Approaching 10-year mark (9–10 yrs): %d record(s)',
            count($approaching)
        ), count($approaching) > 0 ? 'yellow' : 'green');

        if (count($approaching) > 0) {
            CLI::write('  Records approaching expiry:', 'yellow');
            foreach ($approaching as $rec) {
                $expiryDate = date('Y-m-d', strtotime($rec['created_at'] . ' +10 years'));
                CLI::write(sprintf(
                    '    Completion ID %d (task %d) — created %s — expires %s',
                    $rec['id'],
                    $rec['task_id'],
                    substr($rec['created_at'], 0, 10),
                    $expiryDate
                ), 'light_yellow');
            }
        }

        CLI::write(sprintf(
            'Potential premature delete attempts (last 30d): %d',
            $prematureAttempts
        ), $prematureAttempts > 0 ? 'red' : 'green');

        // Guard: block if any completion record is being queried for deletion before 10 years
        if (in_array('--check-delete', $params)) {
            $recordId = (int) ($params[0] ?? 0);
            if ($recordId > 0) {
                $record = $db->query(
                    'SELECT id, created_at, is_dual_signed FROM workhub_completion_records WHERE id = ?',
                    [$recordId]
                )->getRowArray();

                if ($record) {
                    $ageSeconds = time() - strtotime($record['created_at']);
                    $tenYearsSeconds = 10 * 365.25 * 24 * 3600;
                    if ($ageSeconds < $tenYearsSeconds && $record['is_dual_signed']) {
                        CLI::write(
                            "BLOCKED: Completion record #{$recordId} is dual-signed and less than 10 years old. Cannot delete (§257 HGB / §147 AO).",
                            'red'
                        );
                        return;
                    }
                    CLI::write("Completion record #{$recordId} may be deleted (retention period satisfied).", 'green');
                } else {
                    CLI::write("Completion record #{$recordId} not found.", 'yellow');
                }
            }
        }

        CLI::write(str_repeat('-', 60), 'dark_gray');
        CLI::write('Retention check complete.', 'green');
    }
}
