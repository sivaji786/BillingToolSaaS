<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Helpers\JWTHelper;

class CustomerAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $authHeader = $request->getHeaderLine('Authorization');
        
        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return service('response')
                ->setJSON(['success' => false, 'message' => 'No token provided'])
                ->setStatusCode(401);
        }

        $token = $matches[1];

        try {
            $decoded = JWTHelper::validateToken($token);
            
            // Add user and tenant info to request for controllers to use
            $request->tenantId = $decoded->tenant_id;
            $request->userId = $decoded->user_id;
            $request->userEmail = $decoded->email;
            
            return $request;
        } catch (\Exception $e) {
            return service('response')
                ->setJSON(['success' => false, 'message' => 'Invalid token: ' . $e->getMessage()])
                ->setStatusCode(401);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}
