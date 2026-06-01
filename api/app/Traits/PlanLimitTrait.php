<?php

namespace App\Traits;

/**
 * Provides a single helper to check plan limits before allowing resource creation.
 *
 * Plan limits are stored in plans.limits as JSON:
 *   {"invoices": 50, "letters": 100, "buyers": 500, "users": 1,
 *    "storage": 2000000000, "bandwidth": 10000000000, "api_calls": 1000}
 *
 * For monthly-counted resources (invoices, letters) we count rows created
 * this calendar month. For totals (buyers) we count all rows for the tenant.
 */
trait PlanLimitTrait
{
    /**
     * Check whether the tenant has capacity for one more of $resource.
     *
     * Returns true  → within limit (or no limit configured).
     * Returns false → limit exceeded; caller should return 429.
     *
     * @param string $resource  'invoices' | 'letters' | 'buyers'
     */
    protected function withinPlanLimit(string $resource): bool
    {
        try {
            $tenantId = property_exists($this, 'tenantId') ? $this->tenantId : null;
            if (!$tenantId) return true; // No tenant context — allow (auth filter handles this)

            $db = \Config\Database::connect();

            // 1. Fetch tenant's plan limits
            $tenant = $db->table('tenants')->select('plan_id')->where('id', $tenantId)->get()->getRowArray();
            if (!$tenant) return true;

            $plan = $db->table('plans')->select('limits')->where('id', $tenant['plan_id'])->get()->getRowArray();
            if (!$plan || empty($plan['limits'])) return true;

            $limits = json_decode($plan['limits'], true);
            if (!isset($limits[$resource])) return true; // Resource not limited by this plan

            $limit = (int) $limits[$resource];
            if ($limit <= 0) return true; // 0 = unlimited

            // 2. Count current usage
            $used = $this->countResource($resource, $tenantId, $db);

            return $used < $limit;

        } catch (\Throwable $e) {
            log_message('warning', '[PlanLimit] Check failed for ' . $resource . ': ' . $e->getMessage());
            return true; // Fail open rather than block users on infrastructure errors
        }
    }

    private function countResource(string $resource, int $tenantId, $db): int
    {
        // Monthly resources: count rows created in the current calendar month
        $monthStart = date('Y-m-01 00:00:00');

        switch ($resource) {
            case 'invoices':
                return (int) $db->table('invoices')
                    ->where('tenant_id', $tenantId)
                    ->whereIn('template_type', ['invoice', null])
                    ->where('created_at >=', $monthStart)
                    ->countAllResults();

            case 'letters':
                return (int) $db->table('invoices')
                    ->where('tenant_id', $tenantId)
                    ->where('template_type', 'business_letter')
                    ->where('created_at >=', $monthStart)
                    ->countAllResults();

            case 'buyers':
                return (int) $db->table('buyers')
                    ->where('tenant_id', $tenantId)
                    ->countAllResults();

            default:
                return 0;
        }
    }

    // -------------------------------------------------------------------------
    // WorkHub quota helpers (WH-011)
    // -------------------------------------------------------------------------

    /**
     * Whether WorkHub module is enabled for this tenant's plan.
     */
    protected function isWorkhubEnabled(): bool
    {
        return $this->checkWorkhubBoolLimit('workhub_enabled');
    }

    /**
     * Whether adding one more worker is within the plan's workhub_workers limit.
     */
    protected function withinWorkhubWorkerLimit(): bool
    {
        return $this->checkWorkhubIntLimit('workhub_workers', function (int $tenantId, $db): int {
            return (int) $db->table('workhub_workers')
                ->where('tenant_id', $tenantId)
                ->where('active', 1)
                ->countAllResults();
        });
    }

    /**
     * Whether creating one more task this month is within the plan's workhub_tasks_per_month limit.
     */
    protected function withinWorkhubTaskMonthlyLimit(): bool
    {
        return $this->checkWorkhubIntLimit('workhub_tasks_per_month', function (int $tenantId, $db): int {
            return (int) $db->table('workhub_tasks')
                ->where('tenant_id', $tenantId)
                ->where('created_at >=', date('Y-m-01 00:00:00'))
                ->where('deleted_at IS NULL', null, false)
                ->countAllResults();
        });
    }

    /**
     * Whether uploading $bytesToAdd bytes is within the plan's workhub_storage_mb limit.
     *
     * @param int $bytesToAdd  Size of the file being uploaded.
     */
    protected function withinWorkhubStorageLimit(int $bytesToAdd = 0): bool
    {
        try {
            $tenantId = property_exists($this, 'tenantId') ? $this->tenantId : null;
            if (!$tenantId) return true;

            $db     = \Config\Database::connect();
            $limits = $this->fetchWorkhubLimits($tenantId, $db);
            if ($limits === null || !isset($limits['workhub_storage_mb'])) return true;

            $limitMb = (int) $limits['workhub_storage_mb'];
            if ($limitMb <= 0) return true;

            $usedBytes = (int) ($db->table('workhub_task_photos')
                ->selectSum('size_bytes')
                ->where('tenant_id', $tenantId)
                ->get()->getRow()->size_bytes ?? 0);

            return ($usedBytes + $bytesToAdd) < ($limitMb * 1024 * 1024);

        } catch (\Throwable $e) {
            log_message('warning', '[PlanLimit] workhub_storage check failed: ' . $e->getMessage());
            return true;
        }
    }

    /**
     * Whether one more AI call is within the plan's workhub_ai_calls_per_month limit.
     * Counts rows in aiquery_history with source='workhub' this month.
     * Requires `source` column on aiquery_history (added in Sprint 2).
     */
    protected function withinWorkhubAiCallLimit(): bool
    {
        return $this->checkWorkhubIntLimit('workhub_ai_calls_per_month', function (int $tenantId, $db): int {
            try {
                return (int) $db->table('aiquery_history')
                    ->where('tenant_id', $tenantId)
                    ->where('source', 'workhub')
                    ->where('created_at >=', date('Y-m-01 00:00:00'))
                    ->countAllResults();
            } catch (\Throwable $e) {
                // source column not yet present — fail open until Sprint 2 migration
                return 0;
            }
        });
    }

    /**
     * Whether generating one more PDF this month is within the plan's workhub_pdf_exports limit.
     * -1 = unlimited.
     */
    protected function withinWorkhubPdfLimit(): bool
    {
        return $this->checkWorkhubIntLimit('workhub_pdf_exports', function (int $tenantId, $db): int {
            try {
                return (int) $db->table('audit_logs')
                    ->where('tenant_id', $tenantId)
                    ->where('action', 'workhub.pdf.generated')
                    ->where('timestamp >=', date('Y-m-01 00:00:00'))
                    ->countAllResults();
            } catch (\Throwable $e) {
                return 0;
            }
        });
    }

    // -------------------------------------------------------------------------
    // WH-068 — Enforcement helpers: return error array or null.
    // Usage in controllers: if ($err = $this->checkWorkhubWorkerLimit()) return $this->response->setStatusCode(402)->setJSON($err);
    // -------------------------------------------------------------------------

    protected function checkWorkhubWorkerLimit(): ?array
    {
        if (!$this->withinWorkhubWorkerLimit()) {
            return $this->planLimitError('workhub_workers', 'Worker limit reached for your WorkHub plan');
        }
        return null;
    }

    protected function checkWorkhubTaskLimit(): ?array
    {
        if (!$this->withinWorkhubTaskMonthlyLimit()) {
            return $this->planLimitError('workhub_tasks_per_month', 'Monthly task limit reached for your WorkHub plan');
        }
        return null;
    }

    protected function checkWorkhubStorageLimit(int $bytes = 0): ?array
    {
        if (!$this->withinWorkhubStorageLimit($bytes)) {
            return $this->planLimitError('workhub_storage_mb', 'Storage limit reached for your WorkHub plan');
        }
        return null;
    }

    protected function checkWorkhubAiCallLimit(): ?array
    {
        if (!$this->withinWorkhubAiCallLimit()) {
            return $this->planLimitError('workhub_ai_calls_per_month', 'AI call limit reached for your WorkHub plan');
        }
        return null;
    }

    protected function checkWorkhubPdfLimit(): ?array
    {
        if (!$this->withinWorkhubPdfLimit()) {
            return $this->planLimitError('workhub_pdf_exports', 'PDF export limit reached for your WorkHub plan');
        }
        return null;
    }

    private function planLimitError(string $limitType, string $message): array
    {
        return [
            'error'       => 'plan_limit_hit',
            'limit_type'  => $limitType,
            'message'     => $message,
            'upgrade_url' => '/billing',
        ];
    }

    /**
     * SSO-009: Check whether the tenant's plan includes the given SSO provider.
     * Returns null if allowed, or an error array (caller should return 402).
     *
     * Plans store flags like: {"sso_google": true, "sso_microsoft": true, ...}
     */
    protected function checkSsoLimit(string $provider): ?array
    {
        try {
            $tenantId = property_exists($this, 'tenantId') ? $this->tenantId : null;
            if (!$tenantId) return null;

            $db     = \Config\Database::connect();
            $limits = $this->fetchWorkhubLimits($tenantId, $db);

            $key = 'sso_' . strtolower($provider);
            if ($limits !== null && isset($limits[$key]) && !$limits[$key]) {
                return $this->planLimitError($key, 'SSO with ' . $provider . ' requires a higher plan. Please upgrade to access this feature.');
            }
            return null;

        } catch (\Throwable $e) {
            log_message('warning', '[PlanLimit] SSO check failed: ' . $e->getMessage());
            return null;
        }
    }

    // ---- private helpers ----

    private function checkWorkhubBoolLimit(string $key): bool
    {
        try {
            $tenantId = property_exists($this, 'tenantId') ? $this->tenantId : null;
            if (!$tenantId) return true;

            $db     = \Config\Database::connect();
            $limits = $this->fetchWorkhubLimits($tenantId, $db);
            if ($limits === null || !isset($limits[$key])) return false;

            return (bool) $limits[$key];

        } catch (\Throwable $e) {
            log_message('warning', '[PlanLimit] ' . $key . ' check failed: ' . $e->getMessage());
            return true;
        }
    }

    private function checkWorkhubIntLimit(string $key, callable $counter): bool
    {
        try {
            $tenantId = property_exists($this, 'tenantId') ? $this->tenantId : null;
            if (!$tenantId) return true;

            $db     = \Config\Database::connect();
            $limits = $this->fetchWorkhubLimits($tenantId, $db);
            if ($limits === null || !isset($limits[$key])) return true;

            $limit = (int) $limits[$key];
            if ($limit <= 0) return true; // 0 or -1 = unlimited

            $used = $counter($tenantId, $db);
            return $used < $limit;

        } catch (\Throwable $e) {
            log_message('warning', '[PlanLimit] ' . $key . ' check failed: ' . $e->getMessage());
            return true;
        }
    }

    private function fetchWorkhubLimits(int $tenantId, $db): ?array
    {
        $tenant = $db->table('tenants')->select('plan_id')->where('id', $tenantId)->get()->getRowArray();
        if (!$tenant) return null;

        $plan = $db->table('plans')->select('limits')->where('id', $tenant['plan_id'])->get()->getRowArray();
        if (!$plan || empty($plan['limits'])) return null;

        return json_decode($plan['limits'], true) ?: null;
    }
}
