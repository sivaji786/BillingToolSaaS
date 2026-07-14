<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;

/**
 * WH-066 — SA Admin WorkHub compliance report and tenant management endpoints.
 * GET /api/admin/workhub/compliance-report?tenant_id=X
 * PUT /api/admin/workhub/tenants/{id}/toggle      (WH-062)
 * PUT /api/admin/workhub/tenants/{id}/quota        (WH-063)
 */
class AdminWorkHub extends BaseController
{
    use ResponseTrait;

    private function requireSaAdmin(): ?\CodeIgniter\HTTP\ResponseInterface
    {
        $user = \App\Controllers\AdminAuth::getAuthenticatedUser($this->request);
        if (!$user) {
            return $this->response->setStatusCode(403)->setJSON(['message' => 'SA admin access required']);
        }
        return null;
    }

    public function complianceReport(): \CodeIgniter\HTTP\ResponseInterface
    {
        if ($deny = $this->requireSaAdmin()) return $deny;

        $tenantId = (int) ($this->request->getGet('tenant_id') ?? 0);
        if (!$tenantId) {
            return $this->failValidationError('tenant_id required');
        }

        $db = \Config\Database::connect();

        // Tasks with dual-signature (GDPR-complete)
        $dualSigned = (int) $db->table('workhub_completion_records')
            ->where('tenant_id', $tenantId)
            ->where('dual_signed', 1)
            ->countAllResults();

        // Tasks missing customer signature
        $missingCustomerSig = (int) $db->table('workhub_completion_records')
            ->where('tenant_id', $tenantId)
            ->where('worker_signature_data IS NOT NULL', null, false)
            ->where('customer_signature_data IS NULL', null, false)
            ->countAllResults();

        // Time entries without a break (§16 ArbZG) — work entries > 6h with no break entry on same day
        $arbzgFlags = (int) $db->query("
            SELECT COUNT(*) AS cnt
            FROM (
                SELECT DATE(started_at) AS work_date, task_id,
                       SUM(CASE WHEN entry_type = 'work' THEN duration_seconds ELSE 0 END) AS work_secs,
                       SUM(CASE WHEN entry_type = 'break' THEN 1 ELSE 0 END) AS break_count
                FROM workhub_time_entries
                WHERE tenant_id = {$tenantId}
                  AND ended_at IS NOT NULL
                GROUP BY DATE(started_at), task_id
                HAVING work_secs > 21600 AND break_count = 0
            ) t
        ")->getRow()->cnt ?? 0;

        // Document retention: count billable completion records older than 9 years (approaching 10-year limit)
        $approachingExpiry = (int) $db->table('workhub_completion_records')
            ->where('tenant_id', $tenantId)
            ->where('dual_signed', 1)
            ->where('created_at <', date('Y-m-d', strtotime('-9 years')))
            ->countAllResults();

        // Total completion records
        $totalCompletions = (int) $db->table('workhub_completion_records')
            ->where('tenant_id', $tenantId)
            ->countAllResults();

        return $this->respond([
            'tenant_id'              => $tenantId,
            'generated_at'           => date('c'),
            'dual_signed_tasks'      => $dualSigned,
            'missing_customer_sig'   => $missingCustomerSig,
            'total_completions'      => $totalCompletions,
            'arbzg_flags'            => (int) $arbzgFlags,
            'approaching_expiry_10y' => (int) $approachingExpiry,
            'compliance_score'       => $totalCompletions > 0
                ? round(($dualSigned / $totalCompletions) * 100, 1)
                : 100.0,
        ]);
    }

    /**
     * WH-062 — Toggle WorkHub module for a tenant.
     * PUT /api/admin/workhub/tenants/{id}/toggle
     */
    public function toggleTenant(int $tenantId): \CodeIgniter\HTTP\ResponseInterface
    {
        if ($deny = $this->requireSaAdmin()) return $deny;

        $db = \Config\Database::connect();

        $tenant = $db->table('tenants')
            ->select('id, plan_id')
            ->where('id', $tenantId)
            ->get()->getRowArray();

        if (!$tenant) {
            return $this->failNotFound('Tenant not found');
        }

        $plan = $db->table('plans')
            ->select('limits')
            ->where('id', $tenant['plan_id'])
            ->get()->getRowArray();

        $limits = json_decode($plan['limits'] ?? '{}', true) ?: [];
        $current = (bool) ($limits['workhub_enabled'] ?? false);
        $limits['workhub_enabled'] = !$current;

        $db->table('plans')
            ->where('id', $tenant['plan_id'])
            ->update(['limits' => json_encode($limits)]);

        return $this->respond([
            'tenant_id'       => $tenantId,
            'workhub_enabled' => !$current,
            'message'         => 'WorkHub ' . (!$current ? 'enabled' : 'disabled') . ' for tenant',
        ]);
    }

    /**
     * WH-063 — Override WorkHub quota for a specific tenant.
     * PUT /api/admin/workhub/tenants/{id}/quota
     * Body: { workhub_workers: 50, workhub_tasks_per_month: 2000, ... }
     */
    public function overrideQuota(int $tenantId): \CodeIgniter\HTTP\ResponseInterface
    {
        if ($deny = $this->requireSaAdmin()) return $deny;

        $db = \Config\Database::connect();

        $tenant = $db->table('tenants')
            ->select('id, plan_id')
            ->where('id', $tenantId)
            ->get()->getRowArray();

        if (!$tenant) {
            return $this->failNotFound('Tenant not found');
        }

        $body = $this->request->getJSON(true) ?? [];

        $allowed = [
            'workhub_workers', 'workhub_tasks_per_month', 'workhub_storage_mb',
            'workhub_ai_calls_per_month', 'workhub_pdf_exports',
        ];
        $overrides = array_intersect_key($body, array_flip($allowed));

        if (empty($overrides)) {
            return $this->failValidationError('No valid quota fields provided');
        }

        // Check if tenant has an override row, or update the plan limits
        $exists = $db->table('tenant_plan_overrides')
            ->where('tenant_id', $tenantId)
            ->countAllResults();

        $now = date('Y-m-d H:i:s');
        if ($exists) {
            $existing = $db->table('tenant_plan_overrides')
                ->where('tenant_id', $tenantId)
                ->get()->getRowArray();
            $current = json_decode($existing['overrides'] ?? '{}', true) ?: [];
            $merged  = array_merge($current, $overrides);
            $db->table('tenant_plan_overrides')
                ->where('tenant_id', $tenantId)
                ->update(['overrides' => json_encode($merged), 'updated_at' => $now]);
        } else {
            $db->table('tenant_plan_overrides')->insert([
                'tenant_id'  => $tenantId,
                'overrides'  => json_encode($overrides),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return $this->respond([
            'tenant_id' => $tenantId,
            'overrides' => $overrides,
            'message'   => 'Quota overrides saved',
        ]);
    }
}
