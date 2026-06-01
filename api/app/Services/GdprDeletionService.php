<?php

namespace App\Services;

use Config\Database;

/**
 * WH-082: GDPR Art. 17 — Right to erasure (right to be forgotten).
 *
 * WorkHub-specific anonymisation logic:
 *
 * ANONYMISED (immediately on deletion request):
 *   - workhub_workers: name → 'REDACTED', user_id → null
 *   - workhub_completion_records: customer_name → 'REDACTED',
 *     customer_signature_data → null, worker_signature_data → null
 *   - workhub_inbox_messages: body → 'REDACTED'
 *
 * RETAINED (§257 HGB / §147 AO 10-year minimum for billable records):
 *   - workhub_completion_records with is_dual_signed = 1 → aggregate totals kept,
 *     personal data anonymised but record row preserved.
 *   - workhub_time_entries → kept for labour cost audit trail.
 *   - workhub_material_entries → kept for invoice audit trail.
 *
 * DELETED immediately (no legal retention obligation):
 *   - workhub_task_photos (identity photos only)
 *   - workhub_translation_cache rows for this user
 *   - workhub_inbox_messages
 */
class GdprDeletionService
{
    private \CodeIgniter\Database\ConnectionInterface $db;
    private WorkHubStorageService $storage;

    public function __construct()
    {
        $this->db      = Database::connect();
        $this->storage = new WorkHubStorageService();
    }

    /**
     * Process a GDPR deletion request for a user.
     *
     * Returns a summary of actions taken.
     *
     * @param  int   $tenantId
     * @param  int   $userId
     * @return array{anonymised: int, deleted: int, retained: int, details: string[]}
     */
    public function processForUser(int $tenantId, int $userId): array
    {
        $summary = ['anonymised' => 0, 'deleted' => 0, 'retained' => 0, 'details' => []];

        // ---- Resolve worker record ----
        $worker = $this->db->table('workhub_workers')
                           ->where('tenant_id', $tenantId)
                           ->where('user_id', $userId)
                           ->get()->getRowArray();

        if ($worker) {
            $workerId = (int) $worker['id'];

            // Anonymise worker profile
            $this->db->table('workhub_workers')->where('id', $workerId)->update([
                'name'       => 'REDACTED',
                'user_id'    => null,
                'skills'     => null,
            ]);
            $summary['anonymised']++;
            $summary['details'][] = 'Worker profile anonymised (id=' . $workerId . ')';

            // ---- Identity photos — delete immediately ----
            $idPhotos = $this->db->table('workhub_task_photos')
                                 ->where('tenant_id', $tenantId)
                                 ->where('photo_type', 'identity')
                                 ->whereIn('task_id', function ($q) use ($workerId, $tenantId) {
                                     $q->select('id')
                                       ->from('workhub_tasks')
                                       ->where('tenant_id', $tenantId)
                                       ->where('assigned_worker_id', $workerId);
                                 })
                                 ->get()->getResultArray();

            foreach ($idPhotos as $photo) {
                try {
                    $this->storage->delete($photo['file_path']);
                } catch (\Throwable $e) {
                    $summary['details'][] = 'Warning: could not delete S3 object ' . $photo['file_path'];
                }
                $this->db->table('workhub_task_photos')->where('id', $photo['id'])->delete();
                $summary['deleted']++;
            }
            if ($idPhotos) {
                $summary['details'][] = count($idPhotos) . ' identity photo(s) deleted from storage';
            }

            // ---- Completion records — anonymise PII, retain record for §257 HGB ----
            $taskIds = $this->db->table('workhub_tasks')
                                ->select('id')
                                ->where('tenant_id', $tenantId)
                                ->where('assigned_worker_id', $workerId)
                                ->get()->getResultArray();
            $taskIdList = array_column($taskIds, 'id');

            if (!empty($taskIdList)) {
                $completions = $this->db->table('workhub_completion_records')
                                        ->whereIn('task_id', $taskIdList)
                                        ->get()->getResultArray();

                foreach ($completions as $c) {
                    $isDualSigned = !empty($c['customer_signed_at']) && !empty($c['worker_signed_at']);

                    if ($isDualSigned) {
                        // Retain record — anonymise PII only
                        $this->db->table('workhub_completion_records')->where('id', $c['id'])->update([
                            'worker_signature_data'   => null,
                            'customer_signature_data' => null,
                            'customer_name'           => 'REDACTED',
                            'signed_ip'               => null,
                            'signed_user_agent'       => null,
                        ]);
                        $summary['retained']++;
                        $summary['details'][] = 'Completion record id=' . $c['id'] . ': PII anonymised, record retained for §257 HGB 10-year obligation';
                    } else {
                        // Not dual-signed — can delete
                        $this->db->table('workhub_completion_records')->where('id', $c['id'])->delete();
                        $summary['deleted']++;
                        $summary['details'][] = 'Completion record id=' . $c['id'] . ': deleted (not dual-signed, no retention obligation)';
                    }
                }
            }
        }

        // ---- Inbox messages — delete ----
        $deleted = $this->db->table('workhub_inbox_messages')
                            ->where('tenant_id', $tenantId)
                            ->where('recipient_user_id', $userId)
                            ->delete();
        if ($deleted) {
            $summary['deleted']++;
            $summary['details'][] = 'Inbox messages deleted';
        }

        // ---- Translation cache — delete ----
        $this->db->table('workhub_translation_cache')
                 ->where('tenant_id', $tenantId)
                 ->where('created_by_user_id', $userId)
                 ->delete();

        // ---- Audit log — redact user identifier (keep event types for compliance) ----
        $this->db->table('audit_logs')
                 ->where('tenant_id', $tenantId)
                 ->where('user', $this->resolveUserEmail($userId))
                 ->update(['user' => 'REDACTED_GDPR_' . date('Ymd')]);
        $summary['details'][] = 'Audit log user identifiers anonymised';

        // ---- Core user record ----
        $this->db->table('users')->where('id', $userId)->update([
            'name'          => 'REDACTED',
            'email'         => 'gdpr-deleted-' . $userId . '@redacted.invalid',
            'password_hash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT),
            'status'        => 'deleted',
        ]);
        $summary['anonymised']++;
        $summary['details'][] = 'Core user record anonymised (id=' . $userId . ')';

        return $summary;
    }

    private function resolveUserEmail(int $userId): string
    {
        $user = $this->db->table('users')->where('id', $userId)->get()->getRowArray();
        return $user['email'] ?? "user:{$userId}";
    }
}
