<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');
        $token = null;

        if (!empty($header)) {
            if (preg_match('/Bearer\s(\S+)/', $header, $matches)) {
                $token = $matches[1];
            }
        }

        if (!$token) {
            return Services::response()
                ->setJSON(['error' => 'Token required'])
                ->setStatusCode(401);
        }

        try {
            $key = getenv('JWT_SECRET') ?: 'billing_tool_secret_key';
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            
            // Allow downstream controllers to access the decoded user
            $request->user = $decoded;
            
        } catch (\Exception $e) {
            return Services::response()
                ->setJSON(['error' => 'Invalid or expired token', 'message' => $e->getMessage()])
                ->setStatusCode(401);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // No action needed after response
    }
}
