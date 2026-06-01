<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;

/**
 * WH-061 — WorkHub hourly rate and billing settings.
 * GET  /api/workhub/settings  — return current settings for tenant
 * PUT  /api/workhub/settings  — update settings
 */
class SettingsController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    private function isPrivilegedUser(): bool
    {
        $db = \Config\Database::connect();

        // Super-admins always have Settings access.
        $isSuperAdmin = (bool) $db->table('user_roles ur')
            ->join('roles r', 'r.id = ur.role_id')
            ->where('ur.user_id', $this->userId)
            ->where('r.is_super_admin', 1)
            ->countAllResults();

        if ($isSuperAdmin) return true;

        // For everyone else, wh_role is the sole source of truth.
        // system users.role is NOT checked — billing roles must not leak into WorkHub access.
        $workerRow = $db->table('workhub_workers')
            ->select('wh_role')
            ->where('user_id', $this->userId)
            ->where('tenant_id', $this->tenantId)
            ->get()->getRowArray();

        return $workerRow && in_array($workerRow['wh_role'] ?? '', ['planner', 'manager', 'finance'], true);
    }

    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->isPrivilegedUser()) {
            return $this->failForbidden('Access denied.');
        }
        $db  = \Config\Database::connect();
        $row = $db->table('workhub_settings')
            ->where('tenant_id', $this->tenantId)
            ->get()->getRowArray();

        if (!$row) {
            $row = [
                'tenant_id'           => $this->tenantId,
                'default_hourly_rate' => 0.00,
                'currency'            => 'EUR',
                'tax_percent'         => 19.00,
                'pdf_language'        => 'en',
            ];
        }

        return $this->respond([
            'default_hourly_rate' => (float) $row['default_hourly_rate'],
            'currency'            => $row['currency'],
            'tax_percent'         => (float) $row['tax_percent'],
            'pdf_language'        => $row['pdf_language'],
        ]);
    }

    public function update(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        if (!$this->isPrivilegedUser()) {
            return $this->failForbidden('Access denied.');
        }

        $body = $this->request->getJSON(true) ?? [];

        $allowed = ['default_hourly_rate', 'currency', 'tax_percent', 'pdf_language'];
        $data    = array_intersect_key($body, array_flip($allowed));

        if (empty($data)) {
            return $this->failValidationErrors('No valid fields provided');
        }

        // Basic validation
        if (isset($data['default_hourly_rate']) && $data['default_hourly_rate'] < 0) {
            return $this->failValidationErrors('Hourly rate must be >= 0');
        }
        if (isset($data['currency']) && !\in_array(strtoupper($data['currency']), ['EUR', 'USD', 'GBP', 'CHF', 'PLN'], true)) {
            return $this->failValidationErrors('Unsupported currency');
        }

        $db  = \Config\Database::connect();
        $exists = $db->table('workhub_settings')->where('tenant_id', $this->tenantId)->countAllResults();

        if ($exists) {
            $db->table('workhub_settings')
                ->where('tenant_id', $this->tenantId)
                ->update(array_merge($data, ['updated_at' => date('Y-m-d H:i:s')]));
        } else {
            $db->table('workhub_settings')->insert(array_merge($data, [
                'tenant_id'  => $this->tenantId,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]));
        }

        $this->logWorkhubEvent('workhub.settings.updated', 0, [], $data, 'settings');

        return $this->respond(['message' => 'Settings updated']);
    }
}
