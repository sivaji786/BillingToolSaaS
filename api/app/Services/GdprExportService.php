<?php

namespace App\Services;

use Config\Database;
use ZipArchive;

/**
 * WH-082: GDPR Art. 15 — Data subject access / portability export.
 *
 * Extends the existing tenant data export to include all WorkHub records
 * for a given user_id: tasks, time entries, completion records, materials,
 * signatures (base64 SVG blobs), and photos (as download URLs).
 *
 * Output: ZIP archive containing JSON manifests per table.
 */
class GdprExportService
{
    private \CodeIgniter\Database\ConnectionInterface $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /**
     * Generate a GDPR data export for a user and return the ZIP file path.
     *
     * @param  int    $tenantId  Tenant scope
     * @param  int    $userId    Subject whose data to export
     * @return string            Absolute path to the generated ZIP file
     */
    public function exportForUser(int $tenantId, int $userId): string
    {
        $tmpDir  = WRITEPATH . 'gdpr_exports/';
        $zipPath = $tmpDir . "gdpr_export_{$tenantId}_{$userId}_" . time() . '.zip';

        if (!is_dir($tmpDir)) mkdir($tmpDir, 0750, true);

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Failed to create GDPR export archive.');
        }

        // ---- Core user record ----
        $user = $this->db->table('users')
                         ->where('id', $userId)
                         ->where('tenant_id', $tenantId)
                         ->get()->getRowArray();
        if ($user) {
            unset($user['password_hash']); // Never export password hash
            $zip->addFromString('user_profile.json', json_encode($user, JSON_PRETTY_PRINT));
        }

        // ---- WorkHub worker profile ----
        $worker = $this->db->table('workhub_workers')
                           ->where('user_id', $userId)
                           ->where('tenant_id', $tenantId)
                           ->get()->getRowArray();
        if ($worker) {
            $zip->addFromString('workhub/worker_profile.json', json_encode($worker, JSON_PRETTY_PRINT));
        }

        // ---- Tasks assigned to this worker ----
        if ($worker) {
            $workerId = (int) $worker['id'];

            $tasks = $this->db->table('workhub_tasks')
                              ->where('tenant_id', $tenantId)
                              ->where('assigned_worker_id', $workerId)
                              ->get()->getResultArray();
            $zip->addFromString('workhub/tasks.json', json_encode($tasks, JSON_PRETTY_PRINT));

            // ---- Time entries ----
            $timeEntries = $this->db->table('workhub_time_entries')
                                    ->where('tenant_id', $tenantId)
                                    ->where('worker_id', $workerId)
                                    ->get()->getResultArray();
            $zip->addFromString('workhub/time_entries.json', json_encode($timeEntries, JSON_PRETTY_PRINT));

            // ---- Completion records (worker-signed) ----
            $taskIds = array_column($tasks, 'id');
            if (!empty($taskIds)) {
                $completions = $this->db->table('workhub_completion_records')
                                        ->where('tenant_id', $tenantId)
                                        ->whereIn('task_id', $taskIds)
                                        ->get()->getResultArray();

                // Redact signature SVG blobs — replace with placeholder for export
                foreach ($completions as &$c) {
                    if (!empty($c['worker_signature_data'])) {
                        $c['worker_signature_data'] = '[SIGNATURE SVG REDACTED FOR EXPORT — available on request]';
                    }
                    if (!empty($c['customer_signature_data'])) {
                        $c['customer_signature_data'] = '[SIGNATURE SVG REDACTED FOR EXPORT — available on request]';
                    }
                }
                unset($c);

                $zip->addFromString('workhub/completion_records.json', json_encode($completions, JSON_PRETTY_PRINT));

                // ---- Material entries ----
                $completionIds = array_column($completions, 'id');
                if (!empty($completionIds)) {
                    $materials = $this->db->table('workhub_material_entries')
                                          ->where('tenant_id', $tenantId)
                                          ->whereIn('task_id', $taskIds)
                                          ->get()->getResultArray();
                    $zip->addFromString('workhub/material_entries.json', json_encode($materials, JSON_PRETTY_PRINT));
                }

                // ---- Photos (URLs only — no binary blobs in ZIP) ----
                $photos = $this->db->table('workhub_task_photos')
                                   ->where('tenant_id', $tenantId)
                                   ->whereIn('task_id', $taskIds)
                                   ->get()->getResultArray();
                // Strip raw file paths — only export signed URL note
                foreach ($photos as &$p) {
                    $p['file_path'] = '[INTERNAL PATH REDACTED]';
                }
                unset($p);
                $zip->addFromString('workhub/photos_index.json', json_encode($photos, JSON_PRETTY_PRINT));
            }
        }

        // ---- Inbox messages ----
        $messages = $this->db->table('workhub_inbox_messages')
                             ->where('tenant_id', $tenantId)
                             ->where('recipient_user_id', $userId)
                             ->get()->getResultArray();
        $zip->addFromString('workhub/inbox_messages.json', json_encode($messages, JSON_PRETTY_PRINT));

        // ---- Audit log entries for this user ----
        $auditRows = $this->db->table('audit_logs')
                              ->where('tenant_id', $tenantId)
                              ->like('action', 'workhub.')
                              ->where('user', $this->resolveUserIdentifier($userId))
                              ->orderBy('timestamp', 'ASC')
                              ->get()->getResultArray();
        $zip->addFromString('workhub/audit_log.json', json_encode($auditRows, JSON_PRETTY_PRINT));

        // ---- Manifest ----
        $manifest = [
            'generated_at'  => date('c'),
            'tenant_id'     => $tenantId,
            'user_id'       => $userId,
            'regulation'    => 'GDPR Art. 15 (right of access) + Art. 20 (data portability)',
            'retention_note' => 'Dual-signed completion records are retained for 10 years under §257 HGB / §147 AO. Deletion requests for these records will be processed after the statutory period.',
        ];
        $zip->addFromString('MANIFEST.json', json_encode($manifest, JSON_PRETTY_PRINT));

        $zip->close();

        return $zipPath;
    }

    private function resolveUserIdentifier(int $userId): string
    {
        $user = $this->db->table('users')->where('id', $userId)->get()->getRowArray();
        return $user['email'] ?? "user:{$userId}";
    }
}
