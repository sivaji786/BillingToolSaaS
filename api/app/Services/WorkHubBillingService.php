<?php

namespace App\Services;

use App\Models\InvoiceModel;
use App\Models\InvoiceLineModel;

/**
 * WH-059 — Auto-generate a draft invoice from a dual-signed completion record.
 *
 * Called by CompletionController::customerSignature() immediately after the
 * customer signature is persisted (dual_signed flag set to 1).
 */
class WorkHubBillingService
{
    public function generateFromCompletion(int $completionId, int $tenantId): int
    {
        $db = \Config\Database::connect();

        // 1. Load completion record
        $completion = $db->table('workhub_completion_records')
            ->where('id', $completionId)
            ->where('tenant_id', $tenantId)
            ->get()->getRowArray();

        if (!$completion) {
            throw new \RuntimeException("Completion record {$completionId} not found for tenant {$tenantId}");
        }

        $taskId = (int) $completion['task_id'];

        // 2. Load task
        $task = $db->table('workhub_tasks')
            ->where('id', $taskId)
            ->where('tenant_id', $tenantId)
            ->get()->getRowArray();

        if (!$task) {
            throw new \RuntimeException("Task {$taskId} not found");
        }

        // 3. Load materials
        $materials = $db->table('workhub_material_entries')
            ->where('task_id', $taskId)
            ->where('tenant_id', $tenantId)
            ->get()->getResultArray();

        // 4. Load logged hours (sum of work-type entries only)
        $loggedRow = $db->table('workhub_time_entries')
            ->selectSum('duration_seconds')
            ->where('task_id', $taskId)
            ->where('tenant_id', $tenantId)
            ->where('entry_type', 'work')
            ->where('ended_at IS NOT NULL', null, false)
            ->get()->getRowArray();
        $loggedSeconds = (int) ($loggedRow['duration_seconds'] ?? 0);
        $loggedHours   = round($loggedSeconds / 3600, 2);

        // 5. Get hourly rate from workhub_settings
        $settings = $db->table('workhub_settings')
            ->where('tenant_id', $tenantId)
            ->get()->getRowArray();
        $hourlyRate = (float) ($settings['default_hourly_rate'] ?? 0);
        $currency   = $settings['currency'] ?? 'EUR';

        // 6. Get buyer info from workhub_customers if linked
        $buyerName = $completion['customer_name'] ?? ($task['customer_name'] ?? '');
        $customerId = $task['customer_id'] ?? null;
        if ($customerId) {
            $customer = $db->table('workhub_customers')
                ->where('id', $customerId)
                ->get()->getRowArray();
            if ($customer) {
                $buyerName = $customer['name'];
            }
        }

        // 7. Get tenant's seller info
        $tenant = $db->table('tenants')
            ->select('company_name')
            ->where('id', $tenantId)
            ->get()->getRowArray();
        $sellerName = $tenant['company_name'] ?? '';

        // 8. Calculate totals
        $materialSubtotal = 0.0;
        foreach ($materials as $m) {
            $materialSubtotal += (float) ($m['total_price'] ?? 0);
        }
        $laborSubtotal    = round($loggedHours * $hourlyRate, 2);
        $subtotal         = round($materialSubtotal + $laborSubtotal, 2);
        $taxPercent       = 19.0; // Standard German VAT; can be configurable later
        $taxAmount        = round($subtotal * $taxPercent / 100, 2);
        $totalAmount      = round($subtotal + $taxAmount, 2);

        // 9. Determine invoice number
        $yearMonth = date('Ym');
        $countRow  = $db->table('invoices')
            ->where('tenant_id', $tenantId)
            ->where("invoice_number LIKE 'WH-{$yearMonth}-%'", null, false)
            ->countAllResults();
        $invoiceNumber = sprintf('WH-%s-%04d', $yearMonth, $countRow + 1);

        // 10. Create invoice row
        $invoiceModel = new InvoiceModel();
        $invoiceId = $invoiceModel->insert([
            'tenant_id'               => $tenantId,
            'template_type'           => 'invoice',
            'invoice_number'          => $invoiceNumber,
            'issue_date'              => date('Y-m-d'),
            'due_date'                => date('Y-m-d', strtotime('+30 days')),
            'currency'                => $currency,
            'status'                  => 'draft',
            'seller_name'             => $sellerName,
            'buyer_name'              => $buyerName,
            'buyer_address_json'      => '{}',
            'seller_address_json'     => '{}',
            'line_extension_amount'   => $subtotal,
            'tax_exclusive_amount'    => $subtotal,
            'tax_inclusive_amount'    => $totalAmount,
            'payable_amount'          => $totalAmount,
            'source'                  => 'workhub',
            'source_ref_id'           => $completionId,
            'created_by'              => $task['assigned_worker_id'] ?? null,
        ]);

        if (!$invoiceId) {
            throw new \RuntimeException('Failed to insert WorkHub invoice');
        }

        // 11. Insert material line items
        $lineModel = new InvoiceLineModel();
        foreach ($materials as $m) {
            if (empty(trim($m['material_name'] ?? ''))) continue;
            $lineModel->insert([
                'invoice_id'              => $invoiceId,
                'description'             => $m['material_name'],
                'quantity'                => (float) $m['quantity'],
                'unit_code'               => $m['unit'] ?? 'EA',
                'unit_price'              => (float) $m['unit_price'],
                'tax_category'            => 'S',
                'tax_percent'             => $taxPercent,
                'line_extension_amount'   => (float) ($m['total_price'] ?? 0),
            ]);
        }

        // 12. Insert labor line item (only when hours > 0 and rate > 0)
        if ($loggedHours > 0 && $hourlyRate > 0) {
            $lineModel->insert([
                'invoice_id'              => $invoiceId,
                'description'             => sprintf('Labor — %s (%.2f h × %s %s/h)', $task['title'], $loggedHours, number_format($hourlyRate, 2), $currency),
                'quantity'                => $loggedHours,
                'unit_code'               => 'HUR',
                'unit_price'              => $hourlyRate,
                'tax_category'            => 'S',
                'tax_percent'             => $taxPercent,
                'line_extension_amount'   => $laborSubtotal,
            ]);
        }

        // 13. Audit log
        log_message('info', "[WorkHubBilling] Invoice {$invoiceNumber} (ID={$invoiceId}) created from completion {$completionId} for tenant {$tenantId}");

        return $invoiceId;
    }
}
