<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\UserModel;
use CodeIgniter\API\ResponseTrait;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthController extends BaseController
{
    use ResponseTrait;

    public function login()
    {
        $userModel = new UserModel();
        $email = $this->request->getVar('email');
        $password = $this->request->getVar('password');

        $user = $userModel->where('email', $email)->first();

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        if (!password_verify($password, $user['password_hash'])) {
            return $this->fail('Invalid password');
        }

        $appConfig = config('App');
        $tenant = isset($appConfig->currentTenant) ? $appConfig->currentTenant : null;
        $tenantId = $tenant ? $tenant['id'] : $user['tenant_id'];

        // Generate ADMIN token (type='admin')
        $token = \App\Helpers\JWTHelper::generateToken(
            $user['id'], 
            $tenantId, 
            $user['email'], 
            $user['name'],
            'admin'  // Mark as admin token
        );

        $rights = $userModel->getRights($user['id']);

        return $this->response->setJSON([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'tenant_id' => $tenantId,
                'rights' => $rights,
                'type' => 'admin'  // Include type in response
            ],
            'tenant' => $tenant // Optional: return full tenant info
        ])->setStatusCode(200);
    }

    public function me()
    {
        $key = \App\Helpers\JWTHelper::getSecretKey();
        $header = $this->request->getHeaderLine('Authorization');
        
        // Shared hosting workaround: check X-Authorization if Authorization is stripped
        if (empty($header)) {
            $header = $this->request->getHeaderLine('X-Authorization');
        }

        $token = null;

        if (!empty($header)) {
            if (preg_match('/Bearer\s(\S+)/', $header, $matches)) {
                $token = $matches[1];
            }
        }

        if (!$token) {
            return $this->failUnauthorized('Token required');
        }

        try {
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            $userModel = new UserModel();
            
            // Fix: Check for both 'uid' and 'user_id' in payload
            $userId = $decoded->uid ?? $decoded->user_id ?? null;
            
            if (!$userId) {
                return $this->failUnauthorized('Invalid token payload');
            }
            
            $user = $userModel->find($userId);
            
            if (!$user) {
                return $this->failNotFound('User not found');
            }

            unset($user['password_hash']);
            $user['rights'] = $userModel->getRights($user['id']);
            return $this->response->setJSON($user)->setStatusCode(200);

        } catch (\Exception $e) {
            return $this->failUnauthorized('Invalid token');
        }
    }
}
