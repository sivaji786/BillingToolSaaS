<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AdminAuth extends ResourceController
{
    use ResponseTrait;

    protected $modelName = 'App\Models\AdminUserModel';
    protected $format = 'json';

    /**
     * Admin Login
     * POST /api/admin/auth/login
     */
    public function login()
    {
        // Set CORS headers
        $this->response->setHeader('Access-Control-Allow-Origin', '*');
        $this->response->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $this->response->setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        $rules = [
            'email' => 'required|valid_email',
            'password' => 'required|min_length[6]',
        ];

        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        try {
            $email = $this->request->getVar('email');
            $password = $this->request->getVar('password');

            $model = new \App\Models\AdminUserModel();
            $user = $model->where('email', $email)->first();

            if ($user && password_verify($password, $user['password'])) {
                // Update last login
                $model->update($user['id'], ['last_login' => date('Y-m-d H:i:s')]);

                // Prepare user data for token (exclude password)
                unset($user['password']);

                $token = $this->generateToken($user);

                return $this->response->setJSON([
                    'success' => true,
                    'data' => [
                        'user' => $user,
                        'token' => $token,
                    ],
                    'message' => 'Login successful',
                ])->setStatusCode(200);
            }

            return $this->failUnauthorized('Invalid credentials');
        } catch (\Throwable $e) {
            // DEBUGGING: Return the actual error message
            return $this->failServerError('LOGIN CRASH: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        }
    }

    /**
     * Get current admin user
     * GET /api/admin/auth/me
     */
    public function me()
    {
        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return $this->failUnauthorized('Unauthorized');
        }

        return $this->response->setJSON([
            'success' => true,
            'data' => $user,
        ])->setStatusCode(200);
    }

    /**
     * Logout
     * POST /api/admin/auth/logout
     */
    public function logout()
    {
        return $this->response->setJSON([
            'success' => true,
            'message' => 'Logged out successfully',
        ])->setStatusCode(200);
    }

    /**
     * Refresh token
     * POST /api/admin/auth/refresh
     */
    public function refresh()
    {
        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return $this->failUnauthorized('Unauthorized');
        }

        $token = $this->generateToken($user);

        return $this->response->setJSON([
            'success' => true,
            'data' => [
                'token' => $token,
            ],
        ])->setStatusCode(200);
    }

    /**
     * Generate JWT token
     */
    private function generateToken($user)
    {
        $key = getenv('JWT_SECRET') ?: 'your-secret-key-change-this-in-production';
        $payload = [
            'iss' => base_url(),
            'aud' => base_url(),
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24), // 24 hours
            'data' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ];

        return JWT::encode($payload, $key, 'HS256');
    }

    /**
     * Get authenticated user from token
     */
    private function getAuthenticatedUser()
    {
        $authHeader = $this->request->getHeaderLine('Authorization');
        
        if (!$authHeader) {
            return null;
        }

        $token = str_replace('Bearer ', '', $authHeader);
        
        try {
            $key = getenv('JWT_SECRET') ?: 'your-secret-key-change-this-in-production';
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            
            // Verify user exists in DB
            $model = new \App\Models\AdminUserModel();
            $user = $model->find($decoded->data->id);

            if (!$user) {
                return null;
            }

            // Return user data (without password)
            unset($user['password']);
            return $user;
        } catch (\Exception $e) {
            return null;
        }
    }
}
