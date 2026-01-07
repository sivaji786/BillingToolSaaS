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

        $key = getenv('JWT_SECRET') ?: 'billing_tool_secret_key';
        $payload = [
            'iss' => 'billing-tool-api',
            'aud' => 'billing-tool-client',
            'iat' => time(),
            'nbf' => time(),
            'exp' => time() + 3600, // 1 hour
            'uid' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $token = JWT::encode($payload, $key, 'HS256');

        $rights = $userModel->getRights($user['id']);

        return $this->respond([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'rights' => $rights
            ]
        ]);
    }

    public function me()
    {
        $key = getenv('JWT_SECRET') ?: 'billing_tool_secret_key';
        $header = $this->request->getHeaderLine('Authorization');
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
            $user = $userModel->find($decoded->uid);
            
            if (!$user) {
                return $this->failNotFound('User not found');
            }

            unset($user['password_hash']);
            $user['rights'] = $userModel->getRights($user['id']);
            return $this->respond($user);

        } catch (\Exception $e) {
            return $this->failUnauthorized('Invalid token');
        }
    }
}
