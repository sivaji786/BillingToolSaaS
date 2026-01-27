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
            $tenantId = $this->request->getHeaderLine('X-Tenant-ID') ?: (property_exists($this, 'tenantId') ? $this->tenantId : null);
        }
        
        // Try to get user from session or auth
        $user = 'System';
        if (session()->has('user')) {
            $sessionUser = session()->get('user');
            $user = $sessionUser['name'] ?? $sessionUser['email'] ?? 'User';
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
