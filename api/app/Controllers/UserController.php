<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Models\UserRoleModel;
use CodeIgniter\API\ResponseTrait;

class UserController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $model = new UserModel();
        // For admin listing, we might want pagination, but findAll is fine for MVP
        $users = $model->select('id, name, email, created_at')->findAll();

        // Optionally fetch roles for each user (n+1 issue, but acceptable for small scale or can be optimized with join)
        $userRoleModel = new UserRoleModel();
        
        foreach ($users as &$user) {
            $roles = $userRoleModel->builder()
                ->select('roles.id, roles.name, roles.company_type_id')
                ->join('roles', 'roles.id = user_roles.role_id')
                ->where('user_roles.user_id', $user['id'])
                ->get()
                ->getResultArray();
            $user['roles'] = $roles;
        }

        return $this->respond($users);
    }

    public function create()
    {
        $model = new UserModel();
        $data = $this->request->getJSON(true);

        // Basic validation
        if (empty($data['email']) || empty($data['password']) || empty($data['name'])) {
            return $this->failValidationError('Name, email and password are required');
        }

        // Check availability
        if ($model->where('email', $data['email'])->first()) {
            return $this->fail('Email already exists', 409);
        }

        // Hash password
        $data['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // Insert user
        // Ensure we don't try to insert the raw password field if model doesn't strip it, 
        // though allowedFields usually handles it. But explicit is better.
        unset($data['password']);
        
        $id = $model->insert($data);
        if (!$id) {
            return $this->failServerError('Failed to create user');
        }

        // Assign roles if provided
        if (isset($data['roles']) && is_array($data['roles'])) {
            $userRoleModel = new UserRoleModel();
            foreach ($data['roles'] as $roleId) {
                $userRoleModel->builder()->insert([
                    'user_id' => $id,
                    'role_id' => $roleId
                ]);
            }
        }

        return $this->respondCreated(['id' => $id, 'message' => 'User created successfully']);
    }

    public function update($id = null)
    {
        $model = new UserModel();
        $userRoleModel = new UserRoleModel();
        $data = $this->request->getJSON(true);

        if (!$model->find($id)) {
            return $this->failNotFound('User not found');
        }

        try {
            $updateData = [];
            
            // Handle basic info update
            if (!empty($data['name'])) {
                $updateData['name'] = $data['name'];
            }
            // Check email uniqueness if changed
            if (!empty($data['email'])) {
                // Verify unique if different
                $existing = $model->where('email', $data['email'])->first();
                if ($existing && $existing['id'] != $id) {
                     return $this->fail('Email already in use', 409);
                }
                $updateData['email'] = $data['email'];
            }

            // Handle password update if provided
            if (!empty($data['password'])) {
                $updateData['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            if (!empty($updateData)) {
                $model->update($id, $updateData);
            }

            // Sync roles if provided
            if (isset($data['roles']) && is_array($data['roles'])) {
                // Delete existing
                $userRoleModel->builder()->where('user_id', $id)->delete();
                
                // Insert new
                foreach ($data['roles'] as $roleId) {
                    $userRoleModel->builder()->insert([
                        'user_id' => $id,
                        'role_id' => $roleId
                    ]);
                }
            }
            
            return $this->respond(['id' => $id, 'message' => 'User updated']);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to update user: ' . $e->getMessage());
        }
    }
}
