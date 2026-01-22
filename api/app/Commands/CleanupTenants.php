<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class CleanupTenants extends BaseCommand
{
    protected $group       = 'Maintenance';
    protected $name        = 'cleanup:tenants';
    protected $description = 'Deletes all tenants except IDs 1 and 2, along with related data.';

    public function run(array $params)
    {
        $db = \Config\Database::connect();
        
        $keepIds = [1, 2];
        
        // Disable foreign keys checks to allow flexible deletion order
        $db->query('SET FOREIGN_KEY_CHECKS=0');
        
        try {
            $builder = $db->table('tenants');
            $tenantsToDelete = $builder->whereNotIn('id', $keepIds)->get()->getResultArray();
            $idsToDelete = array_column($tenantsToDelete, 'id');
            
            if (empty($idsToDelete)) {
                CLI::write("No tenants found to delete.", 'yellow');
                return;
            }
            
            CLI::write("Found " . count($idsToDelete) . " tenants to delete.", 'yellow');
            
            // List of tables to clean up based on tenant_id
            $tables = [
                'users',
                'subscriptions',
                'invoices',
                'audit_logs', // Assuming this exists based on context
                'company_settings', // Potential table
                'api_keys', // Potential table
                'package_usage_tracking' // Potential table
            ];

            foreach ($tables as $table) {
                if ($db->tableExists($table)) {
                    $this->deleteFromTable($db, $table, $idsToDelete);
                }
            }

            // Finally delete tenants
            $db->table('tenants')->whereNotIn('id', $keepIds)->delete();
            CLI::write("Deleted record from tenants.", 'green');
            
        } catch (\Exception $e) {
            CLI::error("Error: " . $e->getMessage());
        } finally {
            $db->query('SET FOREIGN_KEY_CHECKS=1');
        }
        
        CLI::write('Cleanup complete.', 'green');
    }

    private function deleteFromTable($db, $table, $tenantIds)
    {
        $db->table($table)->whereIn('tenant_id', $tenantIds)->delete();
        CLI::write("Deleted records from {$table}.", 'green');
    }
}
