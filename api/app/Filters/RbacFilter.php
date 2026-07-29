<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\UserModel;
use App\Models\TenantModel;

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
        try {
            // 1. Resolve userId — prefer what UnifiedAuthFilter already injected,
            //    fall back to session, then decode JWT directly.
            $userId = $request->userId ?? null;

            if (!$userId) {
                try { $userId = session()->get('userId'); } catch (\Throwable $e) {}
            }

            if (!$userId) {
                $key    = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? 'e88f7de29c95b084f1eb22e69093c3dafaa85f84eca6bbe0c8a94b8f4590df3e';
                $header = $request->getHeaderLine('Authorization') ?: $request->getHeaderLine('X-Authorization');

                if (!empty($header) && preg_match('/Bearer\s(\S+)/', $header, $matches)) {
                    try {
                        $decoded = \Firebase\JWT\JWT::decode($matches[1], new \Firebase\JWT\Key($key, 'HS256'));
                        $userId  = $decoded->uid ?? $decoded->user_id ?? null;
                    } catch (\Exception $e) {
                        return response()->setJSON(['error' => 'Invalid token'])->setStatusCode(401);
                    }
                }
            }

            if (!$userId) {
                return response()->setJSON(['error' => 'Authentication required'])->setStatusCode(401);
            }

            // 2. Skip RBAC for super-admin users — see UserModel::isEffectiveSuperAdmin()
            //    for the canonical definition (RBAC-table is_super_admin=1, or the legacy
            //    users.role admin/owner fallback).
            $userModel = new UserModel();
            if ($userModel->isEffectiveSuperAdmin((int) $userId)) {
                return; // Super-admin: unrestricted access
            }

            // 3. No arguments = just auth check, no specific right needed
            if (empty($arguments)) {
                return;
            }

            // 4. Check specific right via user_roles → roles → role_rights → rights
            $requiredRight = $arguments[0];
            if (!$userModel->hasRight($userId, $requiredRight)) {
                return response()->setJSON(['error' => 'Access denied: Missing right ' . $requiredRight])->setStatusCode(403);
            }

        } catch (\Throwable $e) {
            file_put_contents('/tmp/billing_debug.log', "RBAC FILTER ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
            return response()->setJSON(['error' => 'Internal RBAC Error: ' . $e->getMessage()])->setStatusCode(500);
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
