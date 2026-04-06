<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class DisplayOrderSeeder extends Seeder
{
    public function run()
    {
        $ordering = [
            'Users' => 10,
            'Users Administration' => 20,
            'Workspace Features' => 30,
            'Projects' => 40,
            'Storage' => 50,
            'Bandwidth' => 60,
            'API Calls' => 70,
            'Invoices' => 80,
            'Custom Invoice Design' => 90,
            'White Label Invoices' => 100,
            'Custom Templates' => 110,
            'Buyers Directory' => 120,
            'Activity Log' => 130,
            'Ticketing System' => 140,
            'AI Assistant' => 150,
        ];

        foreach ($ordering as $name => $order) {
            $this->db->table('package_services')
                     ->where('name', $name)
                     ->update(['display_order' => $order]);
        }
    }
}
