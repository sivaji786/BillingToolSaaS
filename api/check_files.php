<?php
// Include the path to the DB config manually for this check script
define('FCPATH', __DIR__);
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/app/Config/Database.php';

$connection = \Config\Database::connect();

$tenants = $connection->table('tenants')->get()->getResultArray();
$users = $connection->table('users')->get()->getResultArray();

echo "TENANTS:\n";
echo json_encode($tenants, JSON_PRETTY_PRINT);
echo "\n\nUSERS:\n";
echo json_encode($users, JSON_PRETTY_PRINT);
