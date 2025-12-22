<?php
/**
 * Simple test to verify CodeIgniter is working
 * Access via: https://einvoice.online-project.in/api/public/index.php/test
 */

// Get CodeIgniter instance
$routes = \Config\Services::routes();

echo "<h1>CodeIgniter Test</h1>";
echo "<p><strong>Status:</strong> CodeIgniter is working!</p>";
echo "<p><strong>Environment:</strong> " . ENVIRONMENT . "</p>";
echo "<p><strong>Base URL:</strong> " . base_url() . "</p>";
echo "<p><strong>Current URI:</strong> " . uri_string() . "</p>";

echo "<h2>Available Routes:</h2>";
echo "<pre>";
print_r($routes->getRoutes());
echo "</pre>";

echo "<h2>Request Info:</h2>";
echo "<pre>";
echo "REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'Not set') . "\n";
echo "SCRIPT_NAME: " . ($_SERVER['SCRIPT_NAME'] ?? 'Not set') . "\n";
echo "PATH_INFO: " . ($_SERVER['PATH_INFO'] ?? 'Not set') . "\n";
echo "</pre>";
