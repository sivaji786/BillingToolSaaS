<?php

namespace App\Traits;

use App\Models\AuditLogModel;

trait AuditTrait
{
    /**
     * Log an action to the audit_logs table
     */
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
