<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class BuyerRightsSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        $rightsData = [
            ['module' => 'buyers', 'action' => 'read', 'code' => 'buyers.read', 'description' => 'View buyers directory'],
            ['module' => 'buyers', 'action' => 'create', 'code' => 'buyers.create', 'description' => 'Create buyers'],
            ['module' => 'buyers', 'action' => 'update', 'code' => 'buyers.update', 'description' => 'Update buyers'],
            ['module' => 'buyers', 'action' => 'delete', 'code' => 'buyers.delete', 'description' => 'Delete buyers'],
        ];

        foreach ($rightsData as $right) {
            $existing = $db->table('rights')->where('code', $right['code'])->get()->getRow();
            if (!$existing) {
                $db->table('rights')->insert($right);
                $rightId = $db->insertID();
                
                // Assign to Admin roles
                $adminRoles = $db->table('roles')->where('name', 'Admin')->get()->getResult();
                foreach ($adminRoles as $role) {
                    $db->table('role_rights')->insert([
                        'role_id' => $role->id,
                        'right_id' => $rightId
                    ]);
                }
            }
        }
    }
}
