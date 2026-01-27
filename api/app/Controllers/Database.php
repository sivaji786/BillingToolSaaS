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
     * Verify the migration token against environment variable
     */
    private function verifyToken(): bool
    {
        $token = $this->request->getGet('token');
        $expectedToken = getenv('MIGRATION_TOKEN') ?: 'debug_token_123'; // Fallback for local dev
        
        return !empty($token) && $token === $expectedToken;
    }
}
