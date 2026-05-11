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
}
