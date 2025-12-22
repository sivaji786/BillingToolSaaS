<?php

/**
 * Comprehensive Database Verification Test
 * Access via: https://einvoice.online-project.in/api/public/index.php/test/verify
 */

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class Test extends ResourceController
{
    public function index()
    {
        return $this->respond([
            'status' => 'success',
            'message' => 'API is working!',
            'timestamp' => date('Y-m-d H:i:s'),
            'environment' => ENVIRONMENT,
            'base_url' => base_url(),
        ]);
    }
    
    public function verify()
    {
        try {
            $db = \Config\Database::connect();
            $results = [
                'status' => 'checking',
                'timestamp' => date('Y-m-d H:i:s'),
                'tables' => [],
                'summary' => [
                    'total_tables' => 0,
                    'tables_ok' => 0,
                    'tables_missing' => 0,
                    'total_expected_columns' => 0,
                    'columns_ok' => 0,
                    'columns_missing' => 0,
                ],
            ];
            
            // Define expected schema
            $expectedSchema = [
                'users' => [
                    'columns' => ['id', 'email', 'password_hash', 'name', 'role', 'created_at'],
                    'should_have_data' => true,
                ],
                'invoices' => [
                    'columns' => ['id', 'invoice_number', 'issue_date', 'due_date', 'currency', 'status', 'seller_name', 'buyer_name', 'payable_amount', 'created_by'],
                    'should_have_data' => false, // May be empty initially
                ],
                'invoice_lines' => [
                    'columns' => ['id', 'invoice_id', 'description', 'quantity', 'unit_price', 'tax_percent'],
                    'should_have_data' => false,
                ],
                'company_profiles' => [
                    'columns' => ['id', 'name', 'vat_id', 'email', 'phone', 'bank_iban'],
                    'should_have_data' => true,
                ],
                'invoice_templates' => [
                    'columns' => ['id', 'name', 'description', 'default_currency'],
                    'should_have_data' => true,
                ],
                'audit_logs' => [
                    'columns' => ['id', 'timestamp', 'action', 'invoice_number', 'user'],
                    'should_have_data' => false,
                ],
            ];
            
            $results['summary']['total_tables'] = count($expectedSchema);
            
            // Check each table
            foreach ($expectedSchema as $tableName => $tableInfo) {
                $tableResult = [
                    'exists' => false,
                    'row_count' => 0,
                    'columns' => [
                        'expected' => $tableInfo['columns'],
                        'found' => [],
                        'missing' => [],
                    ],
                    'status' => 'not_checked',
                ];
                
                // Check if table exists
                if ($db->tableExists($tableName)) {
                    $tableResult['exists'] = true;
                    $results['summary']['tables_ok']++;
                    
                    // Get row count
                    $tableResult['row_count'] = $db->table($tableName)->countAll();
                    
                    // Check columns
                    $fields = $db->getFieldNames($tableName);
                    $tableResult['columns']['found'] = $fields;
                    
                    foreach ($tableInfo['columns'] as $expectedCol) {
                        if (!in_array($expectedCol, $fields)) {
                            $tableResult['columns']['missing'][] = $expectedCol;
                            $results['summary']['columns_missing']++;
                        } else {
                            $results['summary']['columns_ok']++;
                        }
                    }
                    
                    $results['summary']['total_expected_columns'] += count($tableInfo['columns']);
                    
                    // Determine status
                    if (count($tableResult['columns']['missing']) > 0) {
                        $tableResult['status'] = 'missing_columns';
                    } elseif ($tableInfo['should_have_data'] && $tableResult['row_count'] === 0) {
                        $tableResult['status'] = 'missing_data';
                    } else {
                        $tableResult['status'] = 'ok';
                    }
                    
                    // Get sample data for verification
                    if ($tableResult['row_count'] > 0) {
                        $sample = $db->table($tableName)->limit(1)->get()->getRowArray();
                        $tableResult['sample_row'] = array_keys($sample); // Just show column names, not data
                    }
                } else {
                    $tableResult['status'] = 'missing_table';
                    $results['summary']['tables_missing']++;
                    $results['summary']['columns_missing'] += count($tableInfo['columns']);
                    $results['summary']['total_expected_columns'] += count($tableInfo['columns']);
                }
                
                $results['tables'][$tableName] = $tableResult;
            }
            
            // Overall status
            if ($results['summary']['tables_missing'] > 0) {
                $results['status'] = 'error';
                $results['message'] = 'Some tables are missing!';
            } elseif ($results['summary']['columns_missing'] > 0) {
                $results['status'] = 'warning';
                $results['message'] = 'All tables exist but some columns are missing!';
            } else {
                $results['status'] = 'success';
                $results['message'] = 'All tables and columns verified successfully!';
            }
            
            return $this->respond($results);
            
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => $e->getMessage(),
                'trace' => ENVIRONMENT === 'development' ? $e->getTraceAsString() : null,
            ], 500);
        }
    }
    
    public function database()
    {
        try {
            $db = \Config\Database::connect();
            
            // Test database connection
            $tables = $db->listTables();
            
            // Test each table
            $results = [];
            foreach ($tables as $table) {
                $count = $db->table($table)->countAll();
                $results[$table] = $count . ' rows';
            }
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Database connected successfully',
                'tables' => $results,
            ]);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
