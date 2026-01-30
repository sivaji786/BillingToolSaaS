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

        // Get total count
        $totalItems = $builder->countAllResults(false);

        // Apply sorting and pagination
        $builder->orderBy($sortBy, $sortOrder);
        $builder->limit($limit, ($page - 1) * $limit);

        $subscriptions = $builder->get()->getResultArray();

        // Format subscriptions as invoices for frontend
        $formattedInvoices = array_map(function($sub) {
            // Generate invoice number from subscription
            $invoiceNumber = 'SUB-' . str_pad($sub['id'], 6, '0', STR_PAD_LEFT);
            
            // Determine status for display
            $displayStatus = match($sub['status']) {
                'active' => 'paid',
                'past_due' => 'unpaid',
                'cancelled' => 'cancelled',
                'trialing' => 'unpaid',
                default => 'unpaid'
            };

            return [
                'id' => $sub['id'],
                'invoiceNumber' => $invoiceNumber,
                'userName' => $sub['company_name'],
                'userEmail' => $sub['subdomain'] . '@tenant',
                'userId' => $sub['tenant_id'],
                'amount' => (float)$sub['plan_price'],
                'currency' => 'EUR',
                'status' => $displayStatus,
                'issueDate' => $sub['current_period_start'] ?? $sub['created_at'],
                'dueDate' => $sub['current_period_end'] ?? date('Y-m-d', strtotime(($sub['created_at'] ?? 'now') . ' +30 days')),
                'paidDate' => $sub['status'] === 'active' ? $sub['current_period_start'] : null,
            ];
        }, $subscriptions);

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
        $invoice = [
            'id' => $id,
            'invoiceNumber' => 'INV-2024-001',
            'userName' => 'John Doe',
            'userEmail' => 'john@example.com',
            'userId' => '1',
            'amount' => 79.99,
            'currency' => 'EUR',
            'status' => 'paid',
            'issueDate' => '2024-06-01T00:00:00Z',
            'dueDate' => '2024-06-15T00:00:00Z',
            'paidDate' => '2024-06-05T10:30:00Z',
        ];

        return $this->response->setJSON([
            'success' => true,
            'data' => $invoice,
        ])->setStatusCode(200);
    }

    /**
     * Download invoice PDF
     * GET /api/admin/invoices/:id/pdf
     */
    public function downloadPdf($id = null)
    {
        // Mock PDF content
        $pdf = "%PDF-1.4\nMock PDF content for invoice {$id}";

        return $this->response
            ->setHeader('Content-Type', 'application/pdf')
            ->setHeader('Content-Disposition', "attachment; filename=\"invoice-{$id}.pdf\"")
            ->setBody($pdf);
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
}
