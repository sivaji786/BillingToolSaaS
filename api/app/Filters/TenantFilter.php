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
        // Allow OPTIONS requests to bypass tenant check (Safety fallback for CORS)
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return;
        }

        $db = \Config\Database::connect();
        $subdomain = null;
        $tenantId = null;

        // 1. Check for X-Tenant-ID Header (Explicit Override)
        $tenantIdHeader = $request->getHeaderLine('X-Tenant-ID');
        if (!empty($tenantIdHeader)) {
            $subdomain = $tenantIdHeader;
        }

        // 2. Check for JWT Token (Primary Method for Common Users)
        if (empty($subdomain)) {
            $authHeader = $request->getHeaderLine('Authorization');
            // Check for alternate Authorization headers
            if (!$authHeader) {
                $authHeader = $request->getHeaderLine('X-Authorization') 
                    ?? $_SERVER['HTTP_AUTHORIZATION'] 
                    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
                    ?? null;
            }

            if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
                $decoded = \App\Helpers\JWTHelper::validateToken($token);
                
                if ($decoded && !empty($decoded['tenant_id'])) {
                    $tenantId = $decoded['tenant_id'];
                }
            }
        }

        // 3. Check for URL Segment (e.g. /portal/acme/...) - Fallback for Public Routes
        if (empty($subdomain) && empty($tenantId)) {
            $uri = $request->getUri()->getPath();
            // Match /portal/{subdomain}/...
            if (preg_match('#^/?portal/([^/]+)#', $uri, $matches)) {
                $subdomain = $matches[1];
            }
        }

        // 4. Fallback to Host parsing (Legacy/Subdomain support)
        if (empty($subdomain) && empty($tenantId)) {
            $host = $_SERVER['HTTP_HOST'] ?? $request->getUri()->getHost();
            $subdomain = $this->extractSubdomain($host);
        }

        // Skip if no context found (likely global route or login)
        if (empty($tenantId) && (empty($subdomain) || in_array($subdomain, ['www', 'billingtool', 'api']))) {
            return; 
        }

        // SPECIAL LOCALHOST FALLBACK: Map 'demo' or empty to the first tenant if we're on localhost
        if (($subdomain === 'demo' || empty($subdomain)) && ($_SERVER['HTTP_HOST'] === 'localhost:8080' || $_SERVER['HTTP_HOST'] === 'localhost')) {
             $firstTenant = $db->table('tenants')->where('status', 'active')->limit(1)->get()->getRow();
             if ($firstTenant) {
                 $tenant = $firstTenant;
                 $subdomain = $tenant->subdomain;
             }
        }

        // Bypass check for auth routes if filter exception fails
        $uri = $request->getUri()->getPath();
        if (strpos($uri, 'auth/') === 0 || strpos($uri, 'onboarding/') === 0 || strpos($uri, 'admin/') === 0) {
            return;
        }
        
        $tenant = null;

        // Fetch by ID (from Token)
        if ($tenantId) {
            $tenant = $db->table('tenants')
                ->where('id', $tenantId)
                ->where('status', 'active')
                ->get()
                ->getRow();
        } 
        // Fetch by Identifier (UUID or Subdomain from Header/URL)
        elseif ($subdomain) {
            $builder = $db->table('tenants')->where('status', 'active');
            
            // Check if it's a UUID
            if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $subdomain)) {
                $builder->where('uuid', $subdomain);
            } else {
                $builder->where('subdomain', $subdomain);
            }
            
            $tenant = $builder->get()->getRow();
        }
        
        if (!$tenant) {
            return Services::response()
                ->setJSON([
                    'error' => 'Tenant not found',
                    'message' => 'This account does not exist or has been suspended.'
                ])
                ->setStatusCode(404);
        }
        
        // Store tenant in request & global config
        $request->tenant = $tenant;
        config('App')->currentTenant = $tenant;
    }
    
    private function extractSubdomain(string $host): string
    {
        // Remove port if present
        $host = explode(':', $host)[0];
        
        // If IP address, return 'demo' for dev ease
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return 'demo'; 
        }
        
        $parts = explode('.', $host);
        
        if ($host === 'localhost') return 'demo';

        if (count($parts) > 2) return $parts[0];
        if (count($parts) === 2 && $parts[1] === 'localhost') return $parts[0];

        return '';
    }
    
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nothing needed
    }
}
