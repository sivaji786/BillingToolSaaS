<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use Config\Services;
use Exception;

class Database extends BaseController
{
    use ResponseTrait;

    /**
     * Run all pending migrations
     * URL: /database/migrate?token=YOUR_TOKEN
     */
    public function migrate()
    {
        if (!$this->verifyToken()) {
            return $this->failUnauthorized('Invalid migration token');
        }

        $migrate = Services::migrations();

        try {
            if ($migrate->latest()) {
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Migrations successfully ran to the latest version.'
                ]);
            } else {
                return $this->respond([
                    'status' => 'info',
                    'message' => 'No new migrations found.'
                ]);
            }
        } catch (Exception $e) {
            return $this->failServerError('Migration failed: ' . $e->getMessage());
        }
    }

    /**
     * Run database seeders
     * URL: /database/seed?token=YOUR_TOKEN&class=SeederName
     */
    public function seed()
    {
        if (!$this->verifyToken()) {
            return $this->failUnauthorized('Invalid migration token');
        }

        $seeder = \Config\Database::seeder();
        $class = $this->request->getGet('class') ?? 'DatabaseSeeder';

        try {
            $seeder->call($class);
            return $this->respond([
                'status' => 'success',
                'message' => "Seeder '$class' ran successfully."
            ]);
        } catch (Exception $e) {
            return $this->failServerError('Seeding failed: ' . $e->getMessage());
        }
    }

    /**
     * Verify the migration token against environment variable or admin session
     */
    private function verifyToken(): bool
    {
        // 1. Check for token in URL
        $token = $this->request->getGet('token');
        $expectedToken = getenv('MIGRATION_TOKEN') ?: 'debug_token_123';
        
        if (!empty($token) && $token === $expectedToken) {
            return true;
        }

        // 2. Check for authenticated admin user
        $authHeader = $this->request->getHeaderLine('Authorization');
        if ($authHeader) {
            $jwtoken = str_replace('Bearer ', '', $authHeader);
            try {
                $key = getenv('JWT_SECRET') ?: 'your-secret-key-change-this-in-production';
                $decoded = \Firebase\JWT\JWT::decode($jwtoken, new \Firebase\JWT\Key($key, 'HS256'));
                
                if (isset($decoded->data->role) && $decoded->data->role === 'super_admin') {
                    return true;
                }
            } catch (\Exception $e) {
                // Invalid token
            }
        }

        return false;
    }
}
