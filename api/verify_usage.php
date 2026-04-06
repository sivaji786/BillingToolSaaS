<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php'; // This might not work for CI4

// For CI4, we can use the following to bootstrap
define('FCPATH', __DIR__ . '/public/');
$loader = require rtrim(realpath(__DIR__ . '/vendor'), '/ ') . '/autoload.php';
require rtrim(realpath(__DIR__ . '/system'), '/ ') . '/bootstrap.php';

$db = \Config\Database::connect();
$query = $db->query("SELECT * FROM tenant_usage LIMIT 10");
$results = $query->getResultArray();

if (empty($results)) {
    echo "No usage data found in tenant_usage table.\n";
} else {
    echo "Found " . count($results) . " usage records:\n";
    foreach ($results as $row) {
        echo "Tenant ID: {$row['tenant_id']}, Resource: {$row['resource_key']}, Used: {$row['used_amount']}\n";
    }
}
