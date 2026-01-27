<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CorsFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Handle preflight requests - use header() directly for immediate output
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            $origin = $request->getHeaderLine('Origin');
            $allowedOrigin = $this->getAllowedOrigin($origin);
            
            header("Access-Control-Allow-Origin: $allowedOrigin");
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Requested-With, X-Tenant-ID');
            header('Access-Control-Max-Age: 7200');
            header('Access-Control-Allow-Credentials: true');
            http_response_code(204);
            exit(0);
        }
        
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
        
        return $response;
    }

    private function getAllowedOrigin($origin)
    {
        // Allow localhost for development and any *.humpl.org subdomain
        $allowedOrigins = [
            'http://localhost:3000',
            'https://localhost:3000',
        ];
        
        // Check if origin matches *.humpl.org pattern
        if (preg_match('/^https?:\/\/([a-zA-Z0-9-]+\.)?humpl\.org$/', $origin)) {
            return $origin;
        }
        
        if (in_array($origin, $allowedOrigins)) {
            return $origin;
        }

        return 'http://localhost:3000'; // Default fallback
    }
}
