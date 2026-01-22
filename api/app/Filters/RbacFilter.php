<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\UserModel;

class RbacFilter implements FilterInterface
{
    /**
     * Do whatever processing this filter needs to do.
     * By default it should not return anything during
     * normal execution. However, when an abnormal state
     * is found, it should return an instance of
     * CodeIgniter\HTTP\Response. If it does, script
     * execution will end and that Response will be
     * sent back to the client, allowing for error pages,
     * redirects, etc.
     *
     * @param RequestInterface $request
     * @param array|null       $arguments
     *
     * @return mixed
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();
        $userId = $session->get('userId');

        // 1. Check Authentication (should be handled by HybridAuthFilter, but double check)
        if (!$userId) {
            // Fallback: Check for JWT in header (in case HybridAuthFilter didn't run or failed)
            $key = getenv('JWT_SECRET') ?: 'billing_tool_secret_key';
            $header = $request->getHeaderLine('Authorization');
            
            if (!empty($header) && preg_match('/Bearer\s(\S+)/', $header, $matches)) {
                $token = $matches[1];
                try {
                    $decoded = JWT::decode($token, new Key($key, 'HS256'));
                    $userId = $decoded->uid ?? $decoded->user_id; // Handle both key formats
                } catch (\Exception $e) {
                     return response()->setJSON(['error' => 'Invalid token'])->setStatusCode(401);
                }
            }
        }

        if (!$userId) {
             return response()->setJSON(['error' => 'Authentication required'])->setStatusCode(401);
        }
        
        // 2. Check Permissions if arguments provided
        if (empty($arguments)) {
            // No specific permission required, just authentication (which passed)
            return;
        }
        
        // Arguments passed from Routes: ['rbac:invoices.read'] -> $arguments = ['invoices.read']
        $requiredRight = $arguments[0]; // Assuming one right per filter call for now
        
        $userModel = new UserModel();
        if (!$userModel->hasRight($userId, $requiredRight)) {
            return response()->setJSON(['error' => 'Access denied: Missing right ' . $requiredRight])->setStatusCode(403);
        }
    }

    /**
     * Allows After filters to inspect and modify the response
     * object as needed. This method does not allow any way
     * to stop execution of other after filters, short of
     * throwing an Exception or Error.
     *
     * @param RequestInterface  $request
     * @param ResponseInterface $response
     * @param array|null        $arguments
     *
     * @return mixed
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Do nothing
    }
}
