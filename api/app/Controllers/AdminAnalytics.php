<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\TenantModel;
use App\Models\PlanModel;
use App\Models\SubscriptionModel;

class AdminAnalytics extends ResourceController
{
    use ResponseTrait, \App\Traits\AuditTrait;

    protected $format = 'json';
    protected $tenantModel;
    protected $planModel;
    protected $subscriptionModel;

    public function __construct()
    {
        $this->tenantModel = new TenantModel();
        $this->planModel = new PlanModel();
        $this->subscriptionModel = new SubscriptionModel();
    }

    /**
     * Get dashboard statistics
     * GET /api/admin/analytics/dashboard
     */
    public function dashboard()
    {
        $db = \Config\Database::connect();
        // Get real statistics from database
        $totalUsers = $this->tenantModel->countAll();
        
        $activeSubscriptions = $this->subscriptionModel
            ->where('status', 'active')
            ->countAllResults();

        // Calculate monthly revenue from active subscriptions
        $builder = $this->subscriptionModel->builder();
        $builder->select('SUM(plans.price) as total_revenue');
        $builder->join('plans', 'plans.id = subscriptions.plan_id');
        $builder->where('subscriptions.status', 'active');
        $result = $builder->get()->getRowArray();
        $monthlyRevenue = $result['total_revenue'] ?? 0;

        // Calculate total revenue (12 months average projection)
        $totalRevenue = $monthlyRevenue * 12;

        // Get new users this month
        $firstDayOfMonth = date('Y-m-01 00:00:00');
        $newUsersThisMonth = $this->tenantModel
            ->where('created_at >=', $firstDayOfMonth)
            ->countAllResults();

        // Calculate churn rate
        $suspendedUsers = $this->tenantModel
            ->where('status', 'suspended')
            ->countAllResults();
        $churnRate = $totalUsers > 0 ? ($suspendedUsers / $totalUsers) * 100 : 0;

        // Calculate ARPU (Average Revenue Per User)
        $averageRevenuePerUser = $totalUsers > 0 ? $monthlyRevenue / $totalUsers : 0;

        // Real API calls (all time or last 30 days)
        $apiCalls = $db->table('aiquery_history')->countAllResults();

        // --- Calculate Trends (Current vs Previous Month) ---

        // 1. User Trend
        $prevMonthStart = date('Y-m-01 00:00:00', strtotime('first day of previous month'));
        $prevMonthEnd = date('Y-m-t 23:59:59', strtotime('last day of previous month'));
        
        $currentMonthUsers = $this->tenantModel
            ->where('created_at >=', $firstDayOfMonth)
            ->countAllResults();
            
        $prevMonthUsers = $this->tenantModel
            ->where('created_at >=', $prevMonthStart)
            ->where('created_at <=', $prevMonthEnd)
            ->countAllResults();

        $userTrendValue = $prevMonthUsers > 0 
            ? (($currentMonthUsers - $prevMonthUsers) / $prevMonthUsers) * 100 
            : ($currentMonthUsers > 0 ? 100 : 0);
            
        // 2. Revenue Trend
        // Ideally compare this month's revenue vs last month's
        // We'll estimate using created_at for tenants for now as proxy
        $currentMonthRevenue = $currentMonthUsers * 50; // Approx
        $prevMonthRevenue = $prevMonthUsers * 50; // Approx
        
        $revenueTrendValue = $prevMonthRevenue > 0 
            ? (($currentMonthRevenue - $prevMonthRevenue) / $prevMonthRevenue) * 100
            : ($currentMonthRevenue > 0 ? 100 : 0);

        // 3. Subscription Trend (New vs Old)
        // Using same proxy as users for now since 1 tenant = 1 sub usually
        $subscriptionTrendValue = $userTrendValue;

        // 4. API Calls Trend (Real)
        $currentMonthApiCalls = $db->table('aiquery_history')
            ->where('created_at >=', $firstDayOfMonth)
            ->countAllResults();
            
        $prevMonthApiCalls = $db->table('aiquery_history')
            ->where('created_at >=', $prevMonthStart)
            ->where('created_at <=', $prevMonthEnd)
            ->countAllResults();

        $apiCallsTrendValue = $prevMonthApiCalls > 0 
            ? (($currentMonthApiCalls - $prevMonthApiCalls) / $prevMonthApiCalls) * 100
            : ($currentMonthApiCalls > 0 ? 100 : 0);

        // --- Historical Data for Charts ---

        // 1. Revenue History (Last 6 Months)
        // For simplicity in this demo, we'll estimate past revenue based on tenant creation dates
        // In a real system, you'd query an 'payments' or 'invoices' table.
        $revenueHistory = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = date('Y-m-01', strtotime("-$i months"));
            $monthEnd = date('Y-m-t', strtotime("-$i months"));
            $monthLabel = date('M', strtotime("-$i months"));
            
            // Count active tenants up to this month
            $activeTenantsCount = $this->tenantModel
                ->where('created_at <=', $monthEnd . ' 23:59:59')
                ->where('status !=', 'suspended') // Rough approximation
                ->countAllResults();
                
            // Estimate revenue: active tenants * average plan price (approx $50 for demo)
            $estimatedRevenue = $activeTenantsCount * 50; 
            
            $revenueHistory[] = [
                'month' => $monthLabel,
                'revenue' => $estimatedRevenue
            ];
        }

        // 2. User Growth History (Last 6 Months)
        $userGrowthHistory = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = date('Y-m-01', strtotime("-$i months"));
            $monthEnd = date('Y-m-t', strtotime("-$i months"));
            $monthLabel = date('M', strtotime("-$i months"));
            
            $newUsers = $this->tenantModel
                ->where('created_at >=', $monthStart . ' 00:00:00')
                ->where('created_at <=', $monthEnd . ' 23:59:59')
                ->countAllResults();
            
            $userGrowthHistory[] = [
                'month' => $monthLabel,
                'users' => $newUsers
            ];
        }

        // --- Recent Activity ---
        // Combine new tenants and invoices for a feed
        $recentActivity = [];
        
        // Latest Tenants
        $latestTenants = $this->tenantModel
            ->orderBy('created_at', 'DESC')
            ->limit(5)
            ->find();
            
        foreach ($latestTenants as $tenant) {
            $recentActivity[] = [
                'id' => 'tenant-' . $tenant['id'],
                'description' => "New workspace created: {$tenant['company_name']}",
                'userName' => $tenant['subdomain'], // Using subdomain as user identifier for now
                'timestamp' => $tenant['created_at'],
                'type' => 'user_signup'
            ];
        }
        
        // Sort by timestamp if we added other sources, but for now just tenants is fine for a start
        // or we could add invoices too if models are available.
        // Let's add a fake "System Update" to verify multiple types
        // $recentActivity[] = ...

        $stats = [
            'totalUsers' => $totalUsers,
            'activeSubscriptions' => $activeSubscriptions,
            'monthlyRevenue' => round($monthlyRevenue, 2),
            'apiCalls' => $apiCalls,
            'totalRevenue' => round($totalRevenue, 2),
            'newUsersThisMonth' => $newUsersThisMonth,
            'churnRate' => round($churnRate, 2),
            'averageRevenuePerUser' => round($averageRevenuePerUser, 2),
            // Trends
            'userTrend' => ['value' => round(abs($userTrendValue), 1), 'isPositive' => $userTrendValue >= 0],
            'revenueTrend' => ['value' => round(abs($revenueTrendValue), 1), 'isPositive' => $revenueTrendValue >= 0],
            'subscriptionTrend' => ['value' => round(abs($subscriptionTrendValue), 1), 'isPositive' => $subscriptionTrendValue >= 0],
            'apiCallsTrend' => ['value' => round(abs($apiCallsTrendValue), 1), 'isPositive' => $apiCallsTrendValue >= 0],
            // New fields
            'revenueHistory' => $revenueHistory,
            'userGrowthHistory' => $userGrowthHistory,
            'recentActivity' => $recentActivity
        ];

        return $this->response->setJSON([
            'success' => true,
            'data' => $stats,
        ])->setStatusCode(200);
    }

    /**
     * Get usage metrics
     * GET /api/admin/usage
     */
    public function usage()
    {
        $period = $this->request->getGet('period') ?? 'monthly';
        $userId = $this->request->getGet('userId');
        $db = \Config\Database::connect();

        $tenantId = null;
        if ($userId) {
            $user = $db->table('users')->where('id', $userId)->get()->getRow();
            if ($user) {
                $tenantId = $user->tenant_id;
            }
        }

        // Determine time window and steps based on period
        $now = time();
        switch ($period) {
            case 'daily':
                $steps = 24;
                $interval = 'hour';
                $format = 'H:00';
                $startTime = date('Y-m-d H:00:00', strtotime('-23 hours'));
                break;
            case 'weekly':
                $steps = 7;
                $interval = 'day';
                $format = 'D d';
                $startTime = date('Y-m-d 00:00:00', strtotime('-6 days'));
                break;
            case 'yearly':
                $steps = 12;
                $interval = 'month';
                $format = 'M Y';
                $startTime = date('Y-m-01 00:00:00', strtotime('-11 months'));
                break;
            case 'monthly':
            default:
                $steps = 30;
                $interval = 'day';
                $format = 'M d';
                $startTime = date('Y-m-d 00:00:00', strtotime('-29 days'));
                break;
        }

        // 1. Storage: Real sum of file sizes added in the period
        $storageQuery = $db->table('workspace_files')
            ->selectSum('size')
            ->where('created_at >=', $startTime);
        if ($tenantId) {
            $storageQuery->where('tenant_id', $tenantId);
        }
        $storageUsedBytes = $storageQuery->get()->getRow()->size ?? 0;
        $storageUsed = round($storageUsedBytes / (1024 * 1024 * 1024), 4); // Convert to GB
        $storageLimit = 1000; // GB

        // 2. API Calls: Real count of AI queries in the period
        $apiCallsQuery = $db->table('aiquery_history')
            ->where('created_at >=', $startTime);
        if ($tenantId) {
            $apiCallsQuery->where('tenant_id', $tenantId);
        }
        $apiCalls = $apiCallsQuery->countAllResults();
        $apiCallsLimit = 1000000;

        // 3. Bandwidth: Estimate based on REAL activity (file sizes + API overhead)
        $bandwidthQuery = $db->table('workspace_files')
            ->selectSum('size')
            ->where('created_at >=', $startTime);
        if ($tenantId) {
            $bandwidthQuery->where('tenant_id', $tenantId);
        }
        $fileUploadsBytes = $bandwidthQuery->get()->getRow()->size ?? 0;
        
        // Estimate 1KB bandwidth for each AI call metadata + the actual file bytes
        $bandwidthUsed = round(($fileUploadsBytes / (1024 * 1024 * 1024)) + ($apiCalls * 0.000001), 4);
        $bandwidthLimit = 10000; // GB

        // 4. Active Sessions: Real count from ci_sessions (active in last 15 mins)
        // Note: For individual tenants, we approximate based on user activity if tenantId is present
        $sessionThreshold = time() - (15 * 60);
        $sessionsQuery = $db->table('ci_sessions')
            ->where('timestamp >', $sessionThreshold);
        
        // Since ci_sessions doesn't have tenant_id directly, if we are filtering for a specific user/tenant,
        // we might not get accurate results without parsing session data.
        // For now, if tenantId provided, return 1 as a placeholder if user is the one being viewed, 
        // or just keep global if we can't filter.
        $activeSessions = $sessionsQuery->countAllResults();
        $activeSessionsLimit = 5000;

        // Historical data for charts - fetching real counts for each point
        $historicalData = [];
        for ($i = $steps - 1; $i >= 0; $i--) {
            if ($period === 'daily') {
                $start = date('Y-m-d H:i:s', strtotime("-$i hour", strtotime(date('Y-m-d H:00:00'))));
                $end = date('Y-m-d H:i:s', strtotime("+1 hour", strtotime($start)) - 1);
                $label = date('H:00', strtotime($start));
            } elseif ($period === 'yearly') {
                $start = date('Y-m-01 00:00:00', strtotime("-$i month", strtotime(date('Y-m-01'))));
                $end = date('Y-m-t 23:59:59', strtotime($start));
                $label = date('M Y', strtotime($start));
            } else {
                $start = date('Y-m-d 00:00:00', strtotime("-$i day"));
                $end = date('Y-m-d 23:59:59', strtotime($start));
                $label = date('M d', strtotime($start));
            }

            // Real API calls in this step
            $stepApiCallsQuery = $db->table('aiquery_history')
                ->where('created_at >=', $start)
                ->where('created_at <=', $end);
            if ($tenantId) {
                $stepApiCallsQuery->where('tenant_id', $tenantId);
            }
            $stepApiCalls = $stepApiCallsQuery->countAllResults();

            // Real Storage growth (files added in this step)
            $stepStorageQuery = $db->table('workspace_files')
                ->selectSum('size')
                ->where('created_at <=', $end);
            if ($tenantId) {
                $stepStorageQuery->where('tenant_id', $tenantId);
            }
            $stepStorage = $stepStorageQuery->get()->getRow()->size ?? 0;
            
            // Bandwidth in this step
            $stepBandwidthQuery = $db->table('workspace_files')
                ->selectSum('size')
                ->where('created_at >=', $start)
                ->where('created_at <=', $end);
            if ($tenantId) {
                $stepBandwidthQuery->where('tenant_id', $tenantId);
            }
            $stepFileUploads = $stepBandwidthQuery->get()->getRow()->size ?? 0;

            $historicalData[] = [
                'date' => $label,
                'storage' => round($stepStorage / (1024 * 1024 * 1024), 4),
                'apiCalls' => $stepApiCalls,
                'bandwidth' => round(($stepFileUploads / (1024 * 1024 * 1024)) + ($stepApiCalls * 0.000001), 6),
                'sessions' => rand(2, 10), // We don't have session history, only current active
            ];
        }

        $metrics = [
            'storageUsed' => $storageUsed,
            'storageLimit' => $storageLimit,
            'apiCalls' => $apiCalls,
            'apiCallsLimit' => $apiCallsLimit,
            'bandwidthUsed' => $bandwidthUsed,
            'bandwidthLimit' => $bandwidthLimit,
            'activeSessions' => $activeSessions,
            'activeSessionsLimit' => $activeSessionsLimit,
            'period' => $period,
            'historicalData' => $historicalData,
        ];

        return $this->response->setJSON([
            'success' => true,
            'data' => $metrics,
        ])->setStatusCode(200);
    }

    /**
     * Get usage per tenant
     * GET /api/admin/analytics/tenants
     */
    public function tenantUsage()
    {
        $db = \Config\Database::connect();
        
        // Fetch all tenants
        $tenants = $db->table('tenants')
            ->select('id as tenant_id, company_name as tenant_name')
            ->get()->getResultArray();

        $result = [];
        foreach ($tenants as $tenant) {
            $tenantId = $tenant['tenant_id'];
            
            // Get the first user for this tenant
            $user = $db->table('users')
                ->where('tenant_id', $tenantId)
                ->limit(1)
                ->get()->getRow();
            
            // Storage per tenant
            $storage = $db->table('workspace_files')
                ->selectSum('size')
                ->where('tenant_id', $tenantId)
                ->get()->getRow()->size ?? 0;
            
            // API Calls per tenant
            $apiCalls = $db->table('aiquery_history')
                ->where('tenant_id', $tenantId)
                ->countAllResults();

            $result[] = [
                'tenantId' => $tenantId,
                'tenantName' => $tenant['tenant_name'],
                'adminName' => $user ? $user->name : 'N/A',
                'adminEmail' => $user ? $user->email : 'N/A',
                'userId' => $user ? $user->id : null,
                'storageUsed' => round($storage / (1024 * 1024 * 1024), 4), // GB
                'apiCalls' => $apiCalls,
                'bandwidthUsed' => round(($storage / (1024 * 1024 * 1024)) + ($apiCalls * 0.000001), 4),
            ];
        }

        // Sort by storage used desc
        usort($result, function($a, $b) {
            return $b['storageUsed'] <=> $a['storageUsed'];
        });

        return $this->response->setJSON([
            'success' => true,
            'data' => $result,
        ])->setStatusCode(200);
    }

    /**
     * Export usage data as CSV
     * GET /api/admin/usage/export
     */
    public function exportUsage()
    {
        // Mock CSV data
        $csv = "Date,Storage (GB),API Calls,Bandwidth (GB),Active Sessions\n";
        $csv .= "2024-01,45.2,125000,1250,320\n";
        $csv .= "2024-02,52.8,145000,1580,385\n";
        $csv .= "2024-03,61.5,168000,1820,445\n";
        $csv .= "2024-04,68.3,192000,2150,512\n";
        $csv .= "2024-05,72.1,215000,2380,578\n";
        $csv .= "2024-06,78.9,238000,2650,642\n";

        $this->logAction('exported', 'ADMIN-USAGE', "Usage data exported by admin");
        return $this->response
            ->setHeader('Content-Type', 'text/csv')
            ->setHeader('Content-Disposition', 'attachment; filename="usage-export.csv"')
            ->setBody($csv);
    }
}
