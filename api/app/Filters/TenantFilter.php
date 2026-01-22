<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

class TenantFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Get the full host
        // 1. Check for X-Tenant-ID Header (Preferred for API)
        $tenantIdHeader = $request->getHeaderLine('X-Tenant-ID');
        
        if (!empty($tenantIdHeader)) {
            // Using ID or Subdomain from header?
            // Let's assume the header sends the SUBDOMAIN for consistency with current logic.
            // Or it could send the ID. Let's support subdomain in header for now as it's easier for frontend to derive.
            $subdomain = $tenantIdHeader;
            
            file_put_contents(WRITEPATH . 'logs/tenant_debug.log', date('Y-m-d H:i:s') . " Header X-Tenant-ID found: $subdomain\n", FILE_APPEND);
        } else {
            // 2. Fallback to Host parsing
            // Get the full host from server variable for reliability
            $host = $_SERVER['HTTP_HOST'] ?? $request->getUri()->getHost();
            $subdomain = $this->extractSubdomain($host);
             file_put_contents(WRITEPATH . 'logs/tenant_debug.log', date('Y-m-d H:i:s') . " Host: $host SERVER_HOST: " . ($_SERVER['HTTP_HOST'] ?? 'N/A') . " Subdomain: $subdomain URI: " . $request->getUri()->getPath() . "\n", FILE_APPEND);
        }

        // Skip for main domain or if no subdomain found
        if (empty($subdomain) || in_array($subdomain, ['www', 'billingtool', 'api'])) {
            return; 
        }

        // Bypass check for auth routes if filter exception fails
        $uri = $request->getUri()->getPath();
        if (strpos($uri, 'auth/') === 0 || strpos($uri, 'onboarding/') === 0) {
            return;
        }
        
        $db = \Config\Database::connect();
        $tenant = $db->table('tenants')
            ->where('subdomain', $subdomain)
            ->where('status', 'active')
            ->get()
            ->getRow();
        
        if (!$tenant) {
            return Services::response()
                ->setJSON([
                    'error' => 'Tenant not found',
                    'subdomain' => $subdomain,
                    'message' => 'This account does not exist or has been suspended.'
                ])
                ->setStatusCode(404);
        }
        
        // Check if subscription is active (Optional for Phase 1, but good practice)
        // Simple check: do we have a subscription? 
        /*
        $subscription = $db->table('subscriptions')
            ->where('tenant_id', $tenant['id'])
            ->whereIn('status', ['active', 'trialing'])
            ->get()
            ->getRowArray();

        if (!$subscription) {
             return Services::response()
                ->setJSON(['error' => 'Subscription inactive'])->setStatusCode(402);
        }
        */
        
        // Store tenant in request & global config
        $request->tenant = $tenant;
        config('App')->currentTenant = $tenant;
    }
    
    private function extractSubdomain(string $host): string
    {
        // Remove port if present
        $host = explode(':', $host)[0];
        
        // If IP address, return 'demo' for dev ease, or empty?
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return 'demo'; // Default for local development
        }
        
        // Split by dots
        $parts = explode('.', $host);
        
        // localhost handling: sub.localhost -> parts = [sub, localhost]
        // billingtool.local -> sub.billingtool.local -> parts = [sub, billingtool, local]
        // billingtool.com -> sub.billingtool.com -> parts = [sub, billingtool, com]
        
        // General logic: if more than 2 parts (for .com) or more than 1 part (for localhost), take the first.
        // But localhost itself has 1 part. 'localhost'.
        
        if ($host === 'localhost') {
            return 'demo'; // Fallback
        }

        if (count($parts) > 2) {
            return $parts[0];
        }
        
        // sub.localhost
        if (count($parts) === 2 && $parts[1] === 'localhost') {
            return $parts[0];
        }

        return '';
    }
    
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nothing needed
    }
}
