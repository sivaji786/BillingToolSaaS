<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Helpers\JWTHelper;
use App\Models\UserModel;

/**
 * Hybrid Auth Filter
 * Accepts both JWT tokens (from SaaS customers) and session-based auth (from old system)
 * Validates JWT and sets up RBAC session for old invoice dashboard access
 */
class HybridAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Allow OPTIONS requests to pass through (handled by CORS filter)
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return $request;
        }

        $session = session();
        
        // Check if already authenticated via session (old system)
        if ($session->get('isLoggedIn')) {
            return $request;
        }
        
        // Check for JWT token (new SaaS system)
        $authHeader = $request->getHeaderLine('Authorization');
        
        // Fallback for some Apache configurations where header is renamed or stripped
        if (!$authHeader) {
            $authHeader = $request->getHeaderLine('X-Authorization') 
                ?? $_SERVER['HTTP_AUTHORIZATION'] 
                ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
                ?? null;
        }
        
        if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            
            try {
                $decoded = JWTHelper::validateToken($token);
                
                if ($decoded) {
                    // Handle both key formats (user_id/uid and tenant_id/tid)
                    $userId = $decoded['user_id'] ?? $decoded['uid'] ?? null;
                    $tenantId = $decoded['tenant_id'] ?? $decoded['tid'] ?? null;
                    
                    if ($userId) {
                        // Get user details
                        $userModel = new UserModel();
                        $user = $userModel->find($userId);
                        
                        if ($user) {
                            // Set up session for RBAC system
                            $session->set([
                                'isLoggedIn' => true,
                                'userId' => $user['id'],
                                'userEmail' => $user['email'],
                                'userName' => $user['name'] ?? $user['email'],
                                'tenantId' => $tenantId,
                                'companyTypeId' => $user['company_type_id'] ?? 1,
                                'authMethod' => 'jwt' // Track that this is JWT auth
                            ]);
                            
                            // Add to request for controllers
                            $request->tenantId = $tenantId;
                            $request->userId = $userId;
                            
                            return $request;
                        }
                    }
                }
            } catch (\Exception $e) {
                // JWT validation failed, continue to check other auth methods
                log_message('error', 'JWT validation failed: ' . $e->getMessage());
            }
        }
        
        // No valid authentication found
        return service('response')
            ->setJSON(['success' => false, 'message' => 'Authentication required'])
            ->setStatusCode(401);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
