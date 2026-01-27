<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use App\Models\AdminUserModel;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        $model = new AdminUserModel();

        $email = 'admin@demo.com';

        // Check if user exists
        if ($model->where('email', $email)->first()) {
            return;
        }

        $model->insert([
            'name'     => 'Super Admin',
            'email'    => $email,
            'password' => 'admin123',
            'role'     => 'super_admin',
        ]);
        
        // echo "Created admin user: $email / admin123\n";
    }
}
