<?php

namespace App\Models\WorkHub;

use CodeIgniter\Model;

/**
 * WH-069 — Monthly usage counters per tenant.
 *
 * Table: workhub_usage_monthly
 * One row per (tenant_id, year_month). Incremented by UsageEnforcement trait.
 */
class WorkHubUsageModel extends Model
{
    protected $table            = 'workhub_usage_monthly';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'tenant_id',
        'year_month',
        'tasks_created',
        'ai_calls_used',
        'pdf_exports',
        'storage_bytes_used',
    ];

    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Get (or create) the current month row for a tenant.
     */
    public function currentMonth(int $tenantId): array
    {
        $yearMonth = date('Ym');

        $row = $this->where('tenant_id', $tenantId)
            ->where('year_month', $yearMonth)
            ->first();

        if (!$row) {
            $id = $this->insert([
                'tenant_id'          => $tenantId,
                'year_month'         => $yearMonth,
                'tasks_created'      => 0,
                'ai_calls_used'      => 0,
                'pdf_exports'        => 0,
                'storage_bytes_used' => 0,
            ]);
            return $this->find($id);
        }

        return $row;
    }

    public function incrementField(int $tenantId, string $field, int $by = 1): void
    {
        $yearMonth = date('Ym');
        $db = \Config\Database::connect();

        $exists = $db->table($this->table)
            ->where('tenant_id', $tenantId)
            ->where('year_month', $yearMonth)
            ->countAllResults();

        if (!$exists) {
            $this->insert([
                'tenant_id'          => $tenantId,
                'year_month'         => $yearMonth,
                'tasks_created'      => 0,
                'ai_calls_used'      => 0,
                'pdf_exports'        => 0,
                'storage_bytes_used' => 0,
            ]);
        }

        $db->table($this->table)
            ->where('tenant_id', $tenantId)
            ->where('year_month', $yearMonth)
            ->set($field, "{$field} + {$by}", false)
            ->update();
    }
}
