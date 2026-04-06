<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class RemoveDuplicatesSeeder extends Seeder
{
    public function run()
    {
        $services = $this->db->table('package_services')->orderBy('id', 'ASC')->get()->getResult();
        $seenTypes = [];
        $seenNames = [];
        $idsToDelete = [];

        foreach ($services as $service) {
            $type = strtolower(trim($service->type));
            $name = strtolower(trim($service->name));
            
            // If we've seen this exact type or name before, mark for deletion
            if (isset($seenTypes[$type]) || isset($seenNames[$name])) {
                $idsToDelete[] = $service->id;
            } else {
                $seenTypes[$type] = true;
                $seenNames[$name] = true;
            }
        }

        if (!empty($idsToDelete)) {
            $this->db->table('package_services')->whereIn('id', $idsToDelete)->delete();
            echo "Deleted " . count($idsToDelete) . " duplicate package services.\n";
        } else {
            echo "No duplicates found.\n";
        }
    }
}
