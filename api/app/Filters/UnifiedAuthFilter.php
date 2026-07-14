<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use App\Helpers\JWTHelper;
use App\Models\UserModel;
use App\Models\TenantModel;

/**
 * Unified Auth Filter
 * Consolidates Tenancy identification and Authentication (JWT/Session)
 */
class UnifiedAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        log_message('debug', 'AuthFilter: URI: ' . $request->getUri()->getPath() . ' Method: ' . $request->getMethod());
        
        // 1. Skip for OPTIONS requests (already handled by CorsFilter)
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return;
        }

        $db = \Config\Database::connect();
        $session = session();
        $tokenData = null;
        $tenant = null;

        // 2. Identify Public Routes EARLY to avoid unnecessary DB lookups
        $uri = $request->getUri()->getPath();
        $isPublicRoute = $this->isPublicRoute($uri);

        // 3. Identify User / Token
        $authHeader = $this->getAuthHeader($request);
        if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            $tokenData = JWTHelper::validateToken($token);
        }

        // 4. Tenancy Identification Logic
        $tenantId = $tokenData['tenant_id'] ?? $tokenData['tid'] ?? null;
        $subdomain = null;

        // Fallback for public routes or if tenant not in JWT
        if (empty($tenantId) && empty($subdomain)) {
            if (preg_match('#^/?portal/([^/]+)#', $uri, $matches)) {
                $subdomain = $matches[1];
            } else {
                $host = $_SERVER['HTTP_HOST'] ?? $request->getUri()->getHost();
                $subdomain = $this->extractSubdomain($host);
            }
        }

        // 4. Resolve Tenant Object
        if ($tenantId) {
            $tenant = $db->table('tenants')->where('id', $tenantId)->where('status', 'active')->get()->getRow();
        } elseif ($subdomain && !in_array($subdomain, ['www', 'billingtool', 'api', 'demo'])) {
            $builder = $db->table('tenants')->where('status', 'active');
            if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $subdomain)) {
                $builder->where('uuid', $subdomain);
            } else {
                $builder->where('subdomain', $subdomain);
            }
            $tenant = $builder->get()->getRow();
        }

        // Special fallback for localhost dev
        $httpHost = $_SERVER['HTTP_HOST'] ?? $request->getUri()->getHost() ?? '';
        if (!$tenant && ($httpHost === 'localhost:8080' || $httpHost === 'localhost')) {
            $tenant = $db->table('tenants')->where('status', 'active')->limit(1)->get()->getRow();
        }

        // 5. ENFORCE TENANT MATCH (Anti-Conflict Logic)
        // If we have a token (authenticated) and we found a tenant, 
        // ensure it matches the current subdomain context.
        if ($tokenData && $tenant) {
            $host = $_SERVER['HTTP_HOST'] ?? $request->getUri()->getHost();
            $hostSubdomain = $this->extractSubdomain($host);
            
            // Only enforce for actual subdomains (skip www, api, etc. if they are not the tenant's)
            if (!empty($hostSubdomain) && !in_array($hostSubdomain, ['www', 'api', 'demo', 'localhost'])) {
                if ($tenant->subdomain !== $hostSubdomain) {
                    // Mismatch! Construct redirect URL
                    $frontendDomain = getenv('FRONTEND_DOMAIN') ?: ($_ENV['FRONTEND_DOMAIN'] ?? 'localhost');
                    $frontendPort = getenv('FRONTEND_PORT') ?: ($_ENV['FRONTEND_PORT'] ?? '');
                    $protocol = getenv('FRONTEND_PROTOCOL') ?: ($_ENV['FRONTEND_PROTOCOL'] ?? 'http');
                    $portSuffix = $frontendPort ? ":{$frontendPort}" : '';
                    
                    $redirectUrl = "{$protocol}://{$tenant->subdomain}.{$frontendDomain}{$portSuffix}/#/dashboard";

                    return Services::response()->setJSON([
                        'error' => 'Workspace mismatch',
                        'message' => "This account belongs to the '{$tenant->subdomain}' workspace.",
                        'redirect_url' => $redirectUrl,
                        'correct_workspace' => $tenant->subdomain
                    ])->setStatusCode(403);
                }
            }
        }

        // 6. Enforce Authentication and Tenancy (Skip for login/signup/admin-auth)

        if (!$isPublicRoute) {
            if (!$tokenData && !$session->get('isLoggedIn')) {
                return $this->fail('Authentication required', 401);
            }

            // If we're in a tenant-specific context (all routes except /admin), require a tenant
            if (strpos($uri, '/admin/') === false && !$tenant) {
                return $this->fail('Tenant not found', 404);
            }
        }

        // 6. Setup Request Context & Session Bridge for Legacy RBAC
        if ($tenant) {
            $request->tenant = $tenant;
            $request->tenantId = $tenant->id;
            config('App')->currentTenant = $tenant;
        }

        if ($tokenData) {
            $tokenDataArr = (array) $tokenData;
            $userId = $tokenDataArr['user_id'] ?? $tokenDataArr['uid'] ?? null;
            
            if (!$userId && isset($tokenDataArr['data'])) {
                $data = (array) $tokenDataArr['data'];
                $userId = $data['id'] ?? null;
            }

            if ($userId) {
                $request->userId = $userId;
                $request->userType = $tokenDataArr['type'] ?? (isset($tokenDataArr['data']) ? ((array)$tokenDataArr['data'])['role'] ?? 'customer' : 'customer');

                // Bridge to session for legacy RBAC.
                // Always sync when the JWT user differs from the stored session user
                // (handles account switching without a full session clear).
                if (!$session->get('isLoggedIn') || (int)$session->get('userId') !== (int)$userId) {
                    try {
                        $session->set([
                            'isLoggedIn' => true,
                            'userId'     => $userId,
                            'tenantId'   => $tenant->id ?? null,
                            'authMethod' => 'jwt',
                        ]);
                    } catch (\Throwable $e) {}
                }
            }
        }

        return $request;
    }

    private function getAuthHeader($request)
    {
        return $request->getHeaderLine('Authorization') 
            ?? $request->getHeaderLine('X-Authorization') 
            ?? $_SERVER['HTTP_AUTHORIZATION'] 
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
            ?? null;
    }

    private function extractSubdomain(string $host): string
    {
        $host = explode(':', $host)[0];
        if (filter_var($host, FILTER_VALIDATE_IP) || $host === 'localhost') {
            return 'demo'; 
        }
        
        $parts = explode('.', $host);
        
        // Handle .localhost (e.g. highgoweb.localhost)
        if (count($parts) === 2 && $parts[1] === 'localhost') {
            return $parts[0];
        }
        
        // Handle standard subdomains (e.g. highgoweb.billingtool.com)
        return (count($parts) > 2) ? $parts[0] : '';
    }

    private function isPublicRoute(string $uri): bool
    {
        $publicPatterns = [
            '/auth/login',
            '/auth/signup',
            '/auth/forgot-password',
            '/auth/reset-password',
            '/auth/check-email',    // Quick Access email check – public, no token
            '/auth/quick-access',   // Quick Access OTP – no auth needed
            '/api/countries',
            '/onboarding/',
            '/admin/auth/login',
            '/test/',
            '/debug/',
            '/billing/plans',
            '/billing/package-services',
            '/tickets',
            '/api/public/cms/',
            '/api/public/mockups', // Guest-visible mirror of the admin Wiki's Mockups tab
            '/ping',               // OfflineBanner health check – no auth, no tenant
            '/auth/sso/',          // SSO redirect, callback, and providers endpoints
            '/auth/saml/',         // SAML 2.0 — IdP-initiated and SP-initiated flows
            '/auth/oidc/',         // Generic OIDC redirect and callback
            '/workhub/files/proxy', // HMAC-signed presign URL — auth IS the signature, no session needed
        ];
        foreach ($publicPatterns as $pattern) {
            if (strpos($uri, $pattern) !== false) return true;
        }
        return false;
    }

    private function fail(string $message, int $code)
    {
        log_message('error', "UnifiedAuthFilter Failure [$code]: $message. URI: " . ($_SERVER['REQUEST_URI'] ?? ''));
        return Services::response()
            ->setJSON(['success' => false, 'message' => $message])
            ->setStatusCode($code);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
