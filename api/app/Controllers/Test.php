<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class Test extends Controller
{
    public function database()
    {
        try {
            $db = \Config\Database::connect();
            $forge = \Config\Database::forge();
            
            $db->disableForeignKeyChecks();
            
            $tables = ['user_roles', 'role_rights', 'rights', 'roles', 'company_types'];
            foreach ($tables as $table) {
                if ($db->tableExists($table)) {
                    $forge->dropTable($table, true);
                    echo "Dropped $table\n";
                } else {
                    echo "Table $table does not exist\n";
                }
            }
            
            // Cleanup company_profiles column
            // We can check if column exists by querying information_schema or just trying to drop FK/Col
            if ($db->fieldExists('company_type_id', 'company_profiles')) {
                // Try dropping FK
                try {
                    $db->query("ALTER TABLE company_profiles DROP FOREIGN KEY company_profiles_company_type_id_fk");
                    echo "Dropped FK\n";
                } catch (\Throwable $e) { 
                    echo "FK drop failed (maybe didn't exist): " . $e->getMessage() . "\n"; 
                }
                
                // Drop Column
                $forge->dropColumn('company_profiles', 'company_type_id');
                echo "Dropped company_type_id from company_profiles\n";
            } else {
                echo "Column company_type_id not found in company_profiles\n";
            }
            
            $db->enableForeignKeyChecks();
            echo "DONE";
        } catch (\Throwable $e) {
            echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
        }
    }
}
