<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class AdminBilling extends ResourceController
{
    use ResponseTrait;

    protected $format = 'json';

    /**
     * Get all invoices
     * GET /api/admin/invoices
     */
    public function index()
    {
        $page = $this->request->getGet('page') ?? 1;
        $limit = $this->request->getGet('limit') ?? 10;
        $search = $this->request->getGet('search');
        $status = $this->request->getGet('status');
        $sortBy = $this->request->getGet('sortBy') ?? 'created_at';
        $sortOrder = $this->request->getGet('sortOrder') ?? 'DESC';

        $db = \Config\Database::connect();
        $builder = $db->table('subscriptions s');
        $builder->select('s.*, t.company_name, t.subdomain, p.name as plan_name, p.price as plan_price');
        $builder->join('tenants t', 't.id = s.tenant_id', 'left');
        $builder->join('plans p', 'p.id = s.plan_id', 'left');

        // Apply filters
        if ($search) {
            $builder->groupStart()
                ->like('t.company_name', $search)
                ->orLike('t.subdomain', $search)
                ->groupEnd();
        }

        if ($status) {
            // Map frontend status to subscription status
            $statusMap = [
                'paid' => 'active',
                'unpaid' => 'past_due',
                'cancelled' => 'cancelled',
            ];
            $builder->where('s.status', $statusMap[$status] ?? $status);
        }

        // Get total count (before joining users to avoid inflated row counts)
        $totalItems = $builder->countAllResults(false);

        // Join users for admin email after count; group to collapse multiple users per tenant
        $builder->select('MIN(u.email) as admin_email', false);
        $builder->join('users u', 'u.tenant_id = s.tenant_id', 'left');
        $builder->groupBy('s.id');
        $builder->orderBy($sortBy, $sortOrder);
        $builder->limit($limit, ($page - 1) * $limit);

        $subscriptions = $builder->get()->getResultArray();

        $formattedInvoices = array_map(
            fn($sub) => $this->formatSubscriptionAsInvoice($sub),
            $subscriptions
        );

        return $this->response->setJSON([
            'data' => $formattedInvoices,
            'pagination' => [
                'currentPage' => (int)$page,
                'totalPages' => ceil($totalItems / $limit),
                'totalItems' => $totalItems,
                'itemsPerPage' => (int)$limit,
            ],
        ])->setStatusCode(200);
    }

    /**
     * Get invoice by ID
     * GET /api/admin/invoices/:id
     */
    public function show($id = null)
    {
        if (!$id) {
            return $this->failNotFound('Invoice ID required');
        }

        $sub = $this->fetchSubscription($id);

        if (!$sub) {
            return $this->failNotFound('Invoice not found');
        }

        return $this->response->setJSON([
            'success' => true,
            'data'    => $this->formatSubscriptionAsInvoice($sub),
        ])->setStatusCode(200);
    }

    /**
     * Download invoice PDF
     * GET /api/admin/invoices/:id/pdf
     */
    public function downloadPdf($id = null)
    {
        if (!$id) {
            return $this->failNotFound('Invoice ID required');
        }

        $sub = $this->fetchSubscription($id);

        if (!$sub) {
            return $this->failNotFound('Invoice not found');
        }

        $inv           = $this->formatSubscriptionAsInvoice($sub);
        $invoiceNumber = htmlspecialchars($inv['invoiceNumber']);
        $companyName   = htmlspecialchars($inv['userName']);
        $userEmail     = htmlspecialchars($inv['userEmail']);
        $planName      = htmlspecialchars($sub['plan_name'] ?? 'Subscription');
        $displayStatus = ucfirst($inv['status']);
        $amount        = number_format($inv['amount'], 2);
        $currency      = htmlspecialchars($inv['currency']);
        $issueDate     = date('Y-m-d', strtotime($inv['issueDate'] ?? 'now'));
        $dueDate       = date('Y-m-d', strtotime($inv['dueDate'] ?? 'now'));

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice {$invoiceNumber}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #333; font-size: 14px; }
  h1 { color: #6d28d9; margin-bottom: 4px; }
  .subtitle { color: #888; margin-bottom: 24px; }
  .meta { display: flex; gap: 40px; margin-bottom: 24px; }
  .meta div { line-height: 1.8; }
  label { font-weight: bold; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th { background: #f3f4f6; text-align: left; padding: 10px 12px; border-bottom: 2px solid #ddd; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; }
  .total-row td { font-weight: bold; border-top: 2px solid #ddd; border-bottom: none; font-size: 1.05em; }
  footer { margin-top: 48px; color: #aaa; font-size: 12px; }
</style>
</head>
<body>
<h1>BillingTool</h1>
<p class="subtitle">Super Admin — Invoice Receipt</p>
<div class="meta">
  <div>
    <div><label>Invoice #:</label> {$invoiceNumber}</div>
    <div><label>Status:</label> {$displayStatus}</div>
    <div><label>Issue Date:</label> {$issueDate}</div>
    <div><label>Due Date:</label> {$dueDate}</div>
  </div>
  <div>
    <div><label>Billed to:</label> {$companyName}</div>
    <div><label>Email:</label> {$userEmail}</div>
  </div>
</div>
<table>
  <thead>
    <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>{$planName} Subscription</td>
      <td>1</td>
      <td>{$currency} {$amount}</td>
      <td>{$currency} {$amount}</td>
    </tr>
    <tr class="total-row">
      <td colspan="3">Total</td>
      <td>{$currency} {$amount}</td>
    </tr>
  </tbody>
</table>
<footer>Generated by BillingTool Super Admin Portal &mdash; {$issueDate}</footer>
</body>
</html>
HTML;

        return $this->response
            ->setHeader('Content-Type', 'text/html; charset=UTF-8')
            ->setHeader('Content-Disposition', "inline; filename=\"invoice-{$invoiceNumber}.html\"")
            ->setBody($html);
    }

    /**
     * Get revenue data
     * GET /api/admin/revenue
     */
    public function revenue()
    {
        $period = $this->request->getGet('period') ?? 'monthly';
        $db = \Config\Database::connect();

        // Calculate total revenue from active subscriptions
        $totalRevenue = $db->table('subscriptions s')
            ->select('SUM(p.price) as total')
            ->join('plans p', 'p.id = s.plan_id', 'left')
            ->where('s.status', 'active')
            ->get()
            ->getRow()
            ->total ?? 0;

        // Calculate paid subscriptions count (active subscriptions)
        $paidInvoices = $db->table('subscriptions')
            ->where('status', 'active')
            ->where('current_period_start >=', date('Y-m-d', strtotime('-6 months')))
            ->countAllResults();

        // Calculate pending subscriptions count (past_due or trialing)
        $pendingInvoices = $db->table('subscriptions')
            ->whereIn('status', ['past_due', 'trialing'])
            ->countAllResults();

        // Calculate monthly revenue data for chart (last 6 months)
        $monthlyData = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = date('Y-m-01', strtotime("-$i months"));
            $monthEnd = date('Y-m-t', strtotime("-$i months"));
            
            // Count active subscriptions in this month and multiply by plan price
            $revenue = $db->table('subscriptions s')
                ->select('SUM(p.price) as total')
                ->join('plans p', 'p.id = s.plan_id', 'left')
                ->where('s.status', 'active')
                ->where('s.current_period_start >=', $monthStart)
                ->where('s.current_period_start <=', $monthEnd)
                ->get()
                ->getRow()
                ->total ?? 0;

            $monthlyData[] = [
                'month' => date('M Y', strtotime($monthStart)),
                'revenue' => (float)$revenue,
            ];
        }

        // Calculate growth percentage (current month vs previous month)
        $currentMonthRevenue = end($monthlyData)['revenue'];
        $previousMonthRevenue = $monthlyData[count($monthlyData) - 2]['revenue'] ?? 0;
        $growth = $previousMonthRevenue > 0 
            ? round((($currentMonthRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100, 1) 
            : 0;

        return $this->response->setJSON([
            'totalRevenue' => (float)$totalRevenue,
            'paidInvoices' => $paidInvoices,
            'pendingInvoices' => $pendingInvoices,
            'monthlyData' => $monthlyData,
            'growth' => ($growth >= 0 ? '+' : '') . $growth . '%',
        ])->setStatusCode(200);
    }

    /**
     * Generate manual invoice (creates subscription record)
     * POST /api/admin/invoices
     */
    public function create()
    {
        $rules = [
            'userId' => 'required',
            'dueDate' => 'required|valid_date',
            'items' => 'required'
        ];

        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        // Calculate total from items
        $total = 0;
        foreach ($data['items'] as $item) {
            $total += ($item['quantity'] * $item['unitPrice']);
        }

        // For demo purposes, we'll create a subscription record that represents this "invoice"
        // In a real app, you might have a dedicated billing_invoices table
        $subData = [
            'tenant_id' => $data['userId'],
            'plan_id' => 1, // Default or derived from items
            'status' => 'active',
            'stripe_subscription_id' => 'MANUAL-' . uniqid(),
            'current_period_start' => date('Y-m-d H:i:s'),
            'current_period_end' => $data['dueDate'],
            'created_at' => date('Y-m-d H:i:s')
        ];

        $db->table('subscriptions')->insert($subData);
        $insertId = $db->insertID();

        // Log action
        $this->logAction('created', "BILL-{$insertId}", "Manual invoice generated for tenant ID: {$data['userId']} (Total: €{$total})");

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Invoice generated successfully',
            'data' => [
                'id' => $insertId,
                'total' => $total
            ]
        ])->setStatusCode(201);
    }

    private function fetchSubscription($id): ?array
    {
        $db = \Config\Database::connect();
        return $db->table('subscriptions s')
            ->select('s.*, t.company_name, t.subdomain, p.name as plan_name, p.price as plan_price, MIN(u.email) as admin_email')
            ->join('tenants t', 't.id = s.tenant_id', 'left')
            ->join('plans p', 'p.id = s.plan_id', 'left')
            ->join('users u', 'u.tenant_id = s.tenant_id', 'left')
            ->where('s.id', (int)$id)
            ->groupBy('s.id')
            ->get()
            ->getRowArray() ?: null;
    }

    private function formatSubscriptionAsInvoice(array $sub): array
    {
        $displayStatus = match($sub['status']) {
            'active'    => 'paid',
            'past_due'  => 'unpaid',
            'cancelled' => 'cancelled',
            'trialing'  => 'unpaid',
            default     => 'unpaid'
        };

        $userEmail = !empty($sub['admin_email'])
            ? $sub['admin_email']
            : ($sub['subdomain'] . '@tenant');

        return [
            'id'            => (string)$sub['id'],
            'invoiceNumber' => 'SUB-' . str_pad($sub['id'], 6, '0', STR_PAD_LEFT),
            'userName'      => $sub['company_name'],
            'userEmail'     => $userEmail,
            'userId'        => (string)$sub['tenant_id'],
            'amount'        => (float)$sub['plan_price'],
            'currency'      => 'EUR',
            'status'        => $displayStatus,
            'issueDate'     => $sub['current_period_start'] ?? $sub['created_at'],
            'dueDate'       => $sub['current_period_end'] ?? date('Y-m-d', strtotime(($sub['created_at'] ?? 'now') . ' +30 days')),
            'paidDate'      => $sub['status'] === 'active' ? $sub['current_period_start'] : null,
        ];
    }

    private function logAction($action, $target, $details)
    {
        $db = \Config\Database::connect();
        $db->table('audit_logs')->insert([
            'action' => $action,
            'user' => 'Super Admin',
            'details' => $details,
            'timestamp' => date('Y-m-d H:i:s'),
            'signed' => 0
        ]);
    }
}
