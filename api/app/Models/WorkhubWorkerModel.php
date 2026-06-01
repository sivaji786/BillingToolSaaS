<?php

namespace App\Models;

class WorkhubWorkerModel extends BaseModel
{
    protected $table      = 'workhub_workers';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'user_id', 'wh_role', 'skills_json', 'capacity_hours_per_week',
        'hourly_rate', 'language_pref', 'active',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'user_id'                 => 'required|integer',
        'capacity_hours_per_week' => 'permit_empty|decimal|greater_than[0]|less_than_equal_to[168]',
        'hourly_rate'             => 'permit_empty|decimal|greater_than_equal_to[0]',
        'language_pref'           => 'permit_empty|in_list[en,de,pl,fr,it]',
        'active'                  => 'permit_empty|in_list[0,1]',
    ];

    /**
     * Returns workers with computed capacity fields:
     * utilisation_pct, queue_depth, free_from_date.
     */
    public function getWithCapacity(int $tenantId): array
    {
        $db      = \Config\Database::connect();
        $weekStart = date('Y-m-d 00:00:00', strtotime('monday this week'));

        $workers = $this->where('tenant_id', $tenantId)->where('active', 1)->findAll();

        foreach ($workers as &$w) {
            // Hours logged this week for this worker
            // selectSum() rejects expressions — use select(..., false) for raw SQL
            $hoursRow = $db->table('workhub_time_entries')
                ->select('SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) / 3600) AS hours', false)
                ->where('worker_id', $w['user_id'])
                ->where('tenant_id', $tenantId)
                ->where('entry_type', 'work')
                ->where('started_at >=', $weekStart)
                ->get()->getRow();
            $loggedThisWeek = (float) ($hoursRow->hours ?? 0);

            $cap = (float) ($w['capacity_hours_per_week'] ?: 40);
            $w['utilisation_pct'] = $cap > 0 ? min(round(($loggedThisWeek / $cap) * 100), 999) : 0;
            $w['utilisation_colour'] = $w['utilisation_pct'] <= 70 ? 'green'
                : ($w['utilisation_pct'] <= 90 ? 'amber' : 'red');

            // Count open/in_progress tasks assigned to this worker
            $w['queue_depth'] = (int) $db->table('workhub_tasks')
                ->where('assigned_worker_id', $w['id'])
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['open', 'in_progress'])
                ->where('deleted_at IS NULL', null, false)
                ->countAllResults();

            // Estimate free_from based on remaining est_hours
            $remRow = $db->table('workhub_tasks')
                ->select('SUM(GREATEST(COALESCE(est_hours, 0) - COALESCE(logged_hours, 0), 0)) AS remaining', false)
                ->where('assigned_worker_id', $w['id'])
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['open', 'in_progress'])
                ->where('deleted_at IS NULL', null, false)
                ->get()->getRow();
            $remainingHours = (float) ($remRow->remaining ?? 0);

            $dailyHours   = $cap / 5;
            $daysNeeded   = $dailyHours > 0 ? ceil($remainingHours / $dailyHours) : 0;
            $w['free_from_date'] = date('Y-m-d', strtotime("+{$daysNeeded} weekdays"));
        }

        return $workers;
    }
}
