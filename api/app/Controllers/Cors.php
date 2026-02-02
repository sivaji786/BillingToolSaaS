<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class Cors extends Controller
{
    /**
     * Handle OPTIONS requests for CORS preflight
     */
    public function options()
    {
        // Set CORS headers
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 7200');
        header('Access-Control-Allow-Credentials: true');
        
        // Return 204 No Content
        http_response_code(204);
        exit;
    }
}
