<?php

// Validations
$path = __DIR__ . '/../app/Config/Paths.php';
if (!file_exists($path)) {
    die("Cannot find app/Config/Paths.php. Make sure this file is in api/public/");
}

require $path;
$paths = new \Config\Paths();

// Load Environment
require_once $paths->systemDirectory . '/Boot.php';
exit(\CodeIgniter\Boot::bootWeb($paths));

// We need to bypass the normal router to run this script directly, 
// so strictly speaking we should just connect to DB manually like debug.php to avoid framework complexity if framework is broken.

?>
<?php
// Simpler Manual Connection method to avoid Framework issues if app is broken
header('Content-Type: text/plain');

$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("ERROR: .env file not found at " . realpath(__DIR__ . '/../'));
}

$env = parse_ini_file($envFile, false, INI_SCANNER_RAW);

$host = $env['database.default.hostname'] ?? 'localhost';
$user = $env['database.default.username'] ?? 'root';
$pass = $env['database.default.password'] ?? '';
$db   = $env['database.default.database'] ?? '';

echo "Connecting to database '{$db}'...\n";
$mysqli = new mysqli($host, $user, $pass, $db);

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Check if tenant exists
$subdomain = 'humpl';
$sql = "SELECT * FROM tenants WHERE subdomain = '" . $mysqli->real_escape_string($subdomain) . "'";
$result = $mysqli->query($sql);

if ($result->num_rows > 0) {
    echo "SUCCESS: Tenant '{$subdomain}' already exists.\n";
    $row = $result->fetch_assoc();
    echo "ID: " . $row['id'] . ", Status: " . $row['status'] . "\n";
} else {
    echo "Tenant '{$subdomain}' NOT FOUND. Creating...\n";
    
    // Insert
    $insertSql = "INSERT INTO tenants (subdomain, status, created_at, updated_at) VALUES ('{$subdomain}', 'active', NOW(), NOW())";
    
    if ($mysqli->query($insertSql)) {
        echo "SUCCESS: Tenant '{$subdomain}' created successfully!\n";
        echo "New Tenant ID: " . $mysqli->insert_id . "\n";
    } else {
        echo "ERROR: Could not create tenant. " . $mysqli->error . "\n";
    }
}

$mysqli->close();
?>
