<?php

namespace App\Services;

use App\Models\InvoiceModel;
use App\Models\InvoiceItemModel;
use App\Models\TenantModel;
use App\Models\SubscriptionModel;
use App\Models\PlanModel;

class InvoiceService
{
    protected $invoiceModel;
    protected $invoiceItemModel;
    protected $tenantModel;
    protected $subscriptionModel;
    protected $planModel;

    public function __construct()
    {
        $this->invoiceModel = new InvoiceModel();
        $this->invoiceItemModel = new InvoiceItemModel();
        $this->tenantModel = new TenantModel();
        $this->subscriptionModel = new SubscriptionModel();
        $this->planModel = new PlanModel();
    }

    /**
     * Generate invoice number
     */
    public function generateInvoiceNumber()
    {
        $prefix = 'INV-';
        $year = date('Y');
        $month = date('m');
        
        // Get last invoice number for this month
        $lastInvoice = $this->invoiceModel
            ->like('invoice_number', "{$prefix}{$year}{$month}", 'after')
            ->orderBy('id', 'DESC')
            ->first();

        if ($lastInvoice) {
            // Extract sequence number and increment
            $lastNumber = (int) substr($lastInvoice['invoice_number'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $year . $month . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate invoice for a tenant's subscription
     */
    public function generateInvoiceForTenant($tenantId)
    {
        // Get tenant
        $tenant = $this->tenantModel->find($tenantId);
        if (!$tenant) {
            throw new \Exception('Tenant not found');
        }

        // Get active subscription
        $subscription = $this->subscriptionModel
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->first();

        if (!$subscription) {
            throw new \Exception('No active subscription found');
        }

        // Get plan
        $plan = $this->planModel->find($subscription['plan_id']);
        if (!$plan) {
            throw new \Exception('Plan not found');
        }

        // Create invoice
        $invoiceData = [
            'tenant_id' => $tenantId,
            'invoice_number' => $this->generateInvoiceNumber(),
            'issue_date' => date('Y-m-d'),
            'due_date' => date('Y-m-d', strtotime('+30 days')),
            'subtotal' => $plan['price'],
            'tax' => 0,
            'total' => $plan['price'],
            'currency' => 'EUR',
            'status' => 'pending',
            'notes' => 'Monthly subscription invoice',
        ];

        $invoiceId = $this->invoiceModel->insert($invoiceData);

        // Create invoice item
        $itemData = [
            'invoice_id' => $invoiceId,
            'description' => $plan['name'] . ' - Monthly Subscription',
            'quantity' => 1,
            'unit_price' => $plan['price'],
            'total' => $plan['price'],
        ];

        $this->invoiceItemModel->insert($itemData);

        return $invoiceId;
    }

    /**
     * Generate monthly invoices for all active subscriptions
     */
    public function generateMonthlyInvoices()
    {
        $subscriptions = $this->subscriptionModel
            ->where('status', 'active')
            ->findAll();

        $generated = 0;
        $errors = [];

        foreach ($subscriptions as $subscription) {
            try {
                $this->generateInvoiceForTenant($subscription['tenant_id']);
                $generated++;
            } catch (\Exception $e) {
                $errors[] = [
                    'tenant_id' => $subscription['tenant_id'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'generated' => $generated,
            'errors' => $errors,
        ];
    }

    /**
     * Calculate invoice total
     */
    public function calculateInvoiceTotal($invoiceId)
    {
        $items = $this->invoiceItemModel
            ->where('invoice_id', $invoiceId)
            ->findAll();

        $subtotal = 0;
        foreach ($items as $item) {
            $subtotal += $item['total'];
        }

        $tax = $subtotal * 0; // No tax for now
        $total = $subtotal + $tax;

        // Update invoice
        $this->invoiceModel->update($invoiceId, [
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total' => $total,
        ]);

        return $total;
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid($invoiceId, $paymentMethod = 'stripe', $transactionId = null)
    {
        return $this->invoiceModel->update($invoiceId, [
            'status' => 'paid',
            'paid_date' => date('Y-m-d H:i:s'),
            'payment_method' => $paymentMethod,
            'transaction_id' => $transactionId,
        ]);
    }

    /**
     * Get invoices by tenant
     */
    public function getInvoicesByTenant($tenantId, $limit = 10, $offset = 0)
    {
        return $this->invoiceModel
            ->where('tenant_id', $tenantId)
            ->orderBy('created_at', 'DESC')
            ->findAll($limit, $offset);
    }
}
