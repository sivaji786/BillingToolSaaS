<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\UserModel;

/**
 * ProfileController
 *
 * Handles user profile actions that require auth.
 * Endpoint: POST /profile/set-password
 */
class ProfileController extends ResourceController
{
    use ResponseTrait;

    protected $format = 'json';

    /**
     * POST /profile/set-password
     * Body: { "password": "...", "password_confirm": "..." }
     *
     * Allows Quick Access new users to set a real password after
     * their account is auto-created with a random password.
     */
    public function setPassword()
    {
        // JWT user ID is injected by the auth filter into this property
        $userId = $this->request->userId ?? null;
        if (!$userId) {
            return $this->failUnauthorized('Authentication required');
        }

        $data = $this->request->getJSON(true);

        $password        = trim($data['password'] ?? '');
        $passwordConfirm = trim($data['password_confirm'] ?? '');

        if (strlen($password) < 8) {
            return $this->fail('Password must be at least 8 characters', 422);
        }

        if ($password !== $passwordConfirm) {
            return $this->fail('Passwords do not match', 422);
        }

        $userModel = new UserModel();
        $user      = $userModel->find($userId);

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        // Pass raw password — UserModel's beforeUpdate `hashPassword` callback
        // will automatically hash it into the `password_hash` column.
        $updated = $userModel->update($userId, [
            'password' => $password,
        ]);

        if (!$updated) {
            return $this->fail('Failed to update password', 500);
        }

        return $this->response->setJSON([
            'success' => true,
            'message' => 'Password set successfully',
        ])->setStatusCode(200);
    }
}
