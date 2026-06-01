<?php

namespace App\Traits;

use App\Models\AuditLogModel;

trait AuditTrait
{
    /**
     * Log an action to the audit_logs table
     */
    /**
     * Log a WorkHub-specific audit event.
     * Stores structured WorkHub data in the details field as JSON.
     * Compatible with the existing audit_logs table schema.
     *
     * @param string $eventType  e.g. 'workhub.task.created'
     * @param int    $taskId     0 when not applicable
     * @param array  $oldValues  snapshot before change
     * @param array  $newValues  snapshot after change
     * @param string $entityRef  human-readable reference (task title, completion ID, etc.)
     */
    protected function logWorkhubEvent(
        string $eventType,
        int    $taskId    = 0,
        array  $oldValues = [],
        array  $newValues = [],
        string $entityRef = ''
    ): void {
        $auditModel = new AuditLogModel();

        $appConfig = config('App');
        $tenantId  = isset($appConfig->currentTenant) ? $appConfig->currentTenant->id : null;
        if (!$tenantId) {
            $tenantId = property_exists($this, 'tenantId') ? $this->tenantId : null;
        }

        $user = 'System';
        if (session()->has('user')) {
            $sessionUser = session()->get('user');
            $user = $sessionUser['name'] ?? $sessionUser['email'] ?? 'User';
        } else {
            $request = \Config\Services::request();
            $header  = $request->getHeaderLine('Authorization') ?: $request->getHeaderLine('X-Authorization');
            if ($header && preg_match('/Bearer\s(\S+)/', $header, $m)) {
                try {
                    $secret  = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';
                    $decoded = \Firebase\JWT\JWT::decode($m[1], new \Firebase\JWT\Key($secret, 'HS256'));
                    $user    = $decoded->name ?? $decoded->email ?? ('user#' . ($decoded->uid ?? '?'));
                } catch (\Throwable $e) { /* leave as System */ }
            }
        }

        $request   = \Config\Services::request();
        $ipAddress = $request->getIPAddress();

        $details = json_encode([
            'task_id'    => $taskId ?: null,
            'old_values' => $oldValues ?: null,
            'new_values' => $newValues ?: null,
            'ip_address' => $ipAddress,
        ]);

        $auditModel->insert([
            'tenant_id'      => $tenantId,
            'action'         => $eventType,
            'invoice_number' => $entityRef,
            'user'           => $user,
            'details'        => $details,
            'signed'         => 0,
            'timestamp'      => date('Y-m-d H:i:s'),
        ]);
    }

    protected function logAction(string $action, string $invoiceNumber, string $details = '', bool $signed = false)
    {
        $auditModel = new AuditLogModel();
        
        // Try to get tenant_id from config, request header, or property
        $appConfig = config('App');
        $tenantId = isset($appConfig->currentTenant) ? $appConfig->currentTenant->id : null;
        
        if (!$tenantId) {
            $tenantId = property_exists($this, 'tenantId') ? $this->tenantId : null;
        }
        
        // Resolve actor: session first, then JWT bearer token, then fallback
        $user = 'System';
        if (session()->has('user')) {
            $sessionUser = session()->get('user');
            $user = $sessionUser['name'] ?? $sessionUser['email'] ?? 'User';
        } else {
            $request = \Config\Services::request();
            $header  = $request->getHeaderLine('Authorization') ?: $request->getHeaderLine('X-Authorization');
            if ($header && preg_match('/Bearer\s(\S+)/', $header, $m)) {
                try {
                    $secret  = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';
                    $decoded = \Firebase\JWT\JWT::decode($m[1], new \Firebase\JWT\Key($secret, 'HS256'));
                    $user    = $decoded->name ?? $decoded->email ?? ('user#' . ($decoded->uid ?? '?'));
                } catch (\Throwable $e) { /* leave as System */ }
            }
        }

        $auditModel->insert([
            'tenant_id'      => $tenantId,
            'action'         => $action,
            'invoice_number' => $invoiceNumber,
            'user'           => $user,
            'details'        => $details,
            'signed'         => $signed ? 1 : 0,
            'timestamp'      => date('Y-m-d H:i:s'),
        ]);
    }
}
