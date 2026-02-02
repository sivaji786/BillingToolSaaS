<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CorsFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $origin = $request->getHeaderLine('Origin');
        $allowedOrigin = $this->getAllowedOrigin($origin);

        // Handle preflight requests
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            header("Access-Control-Allow-Origin: $allowedOrigin");
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Requested-With, X-Tenant-ID');
            header('Access-Control-Max-Age: 7200');
            header('Access-Control-Allow-Credentials: true');
            http_response_code(204);
            exit(0);
        }

        // For non-OPTIONS requests, we also set headers using header() 
        // to ensure they exist even if a later 'before' filter terminates the request
        header("Access-Control-Allow-Origin: $allowedOrigin");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Requested-With, X-Tenant-ID');
        header('Access-Control-Allow-Credentials: true');
        
        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $origin = $request->getHeaderLine('Origin');
        $allowedOrigin = $this->getAllowedOrigin($origin);

        // Add CORS headers to all responses
        $response->setHeader('Access-Control-Allow-Origin', $allowedOrigin);
        $response->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        $response->setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Authorization, X-Requested-With, X-Tenant-ID');
        $response->setHeader('Access-Control-Allow-Credentials', 'true');
        
        // GLOBAL FIX: Force 200 OK for successful responses to avoid server-level 500 overrides
        // Only override if the current status is purely 200 or unset (0)
        if ($response->getStatusCode() === 200 || $response->getStatusCode() === 0) {
            $response->setStatusCode(200);
        }
        
        return $response;
    }

    private function getAllowedOrigin($origin)
    {
        // Allow localhost for development and any *.humpl.org subdomain
        $allowedOrigins = [
            'http://localhost:3000',
            'https://localhost:3000',
        ];
        
        // Check if origin matches *.humpl.org pattern (production)
        if (preg_match('/^https?:\/\/([a-zA-Z0-9-]+\.)?humpl\.org$/', $origin)) {
            return $origin;
        }
        
        // Check if origin matches *.localhost:3000 pattern (local development)
        if (preg_match('/^https?:\/\/([a-zA-Z0-9_-]+\.)?localhost:3000$/', $origin)) {
            return $origin;
        }
        
        if (in_array($origin, $allowedOrigins)) {
            return $origin;
        }

        return 'http://localhost:3000'; // Default fallback
    }
}
