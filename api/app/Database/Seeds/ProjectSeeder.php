<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run()
    {
        $data = [
            [
                'name'    => 'Default Project',
                'api_key' => bin2hex(random_bytes(16)), // Generate a random API key
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ],
        ];

        // Simple query
        $this->db->table('projects')->insertBatch($data);
    }
}
