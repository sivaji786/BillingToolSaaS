<?php

/**
 * DEBUG TOKEN SCRIPT
 * Place this in your api/public/ directory.
 * Access it via: https://yourdomain.com/api/public/debug_token.php
 */

// 1. Setup Environment
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path to the front controller (this file)
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(FCPATH);

// Load Paths
require FCPATH . '../app/Config/Paths.php';
$paths = new \Config\Paths();

// Define framework constants needed by internal classes
define('ROOTPATH',   realpath(FCPATH . '..') . DIRECTORY_SEPARATOR);
define('APPPATH',    realpath($paths->appDirectory) . DIRECTORY_SEPARATOR);
define('SYSTEMPATH', realpath($paths->systemDirectory) . DIRECTORY_SEPARATOR);

// Load App Constants (where APP_NAMESPACE is defined)
require APPPATH . 'Config/Constants.php';

// 1. Manually load and register the Autoloader
require SYSTEMPATH . 'Autoloader/Autoloader.php';
$loader = new \CodeIgniter\Autoloader\Autoloader();

// CRITICAL: Register the system namespace FIRST
$loader->addNamespace('CodeIgniter', SYSTEMPATH);
$loader->register();

// 2. Now we can safely load the App configurations
require APPPATH . 'Config/Autoload.php';
require APPPATH . 'Config/Modules.php';

// Initialize the loader with the configs
$loader->initialize(new \Config\Autoload(), new \Config\Modules());

// 3. Register more namespaces
$loader->addNamespace('Config', APPPATH . 'Config');
$loader->addNamespace('App', APPPATH);
$loader->addNamespace('CodeIgniter\Config', SYSTEMPATH . 'Config');

// 4. Load Composer if available
if (file_exists(ROOTPATH . 'vendor/autoload.php')) {
    require ROOTPATH . 'vendor/autoload.php';
}

// 5. Load DotEnv to get the JWT_SECRET
if (file_exists(ROOTPATH . '.env')) {
    require SYSTEMPATH . 'Config/DotEnv.php';
    $dotenv = new \CodeIgniter\Config\DotEnv(ROOTPATH);
    $dotenv->load();
}

// 6. Manual fallback for JWT_SECRET if env() fails
if (!function_exists('env')) {
    function env($key, $default = null) {
        return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?? $default;
    }
}

use App\Helpers\JWTHelper;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

header('Content-Type: text/plain');

echo "=== AUTH DEBUG UTILITY ===\n\n";

// 2. Server Environment Info
echo "Server Time (UTC): " . gmdate('Y-m-d H:i:s') . "\n";
echo "Server Time (Local): " . date('Y-m-d H:i:s') . " (" . date_default_timezone_get() . ")\n";
echo "Request Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
echo "HTTP_HOST: " . ($_SERVER['HTTP_HOST'] ?? 'N/A') . "\n\n";

// 3. Header Extraction
echo "--- Received Headers ---\n";
$headers = getallheaders();
foreach ($headers as $name => $value) {
    echo "$name: " . ($name === 'Authorization' ? "Bearer [HIDDEN]" : $value) . "\n";
}
echo "\n";

// 4. Token Identification Logic (same as UnifiedAuthFilter)
function getAuthHeader() {
    return $_SERVER['HTTP_AUTHORIZATION'] 
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
        ?? getallheaders()['Authorization'] 
        ?? getallheaders()['X-Authorization'] 
        ?? null;
}

$authHeader = getAuthHeader();
echo "Detected Auth Header: " . ($authHeader ? "Yes (starts with " . substr($authHeader, 0, 15) . "...)" : "No") . "\n";

$token = $_GET['token'] ?? null;
if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $token = $matches[1];
    echo "Using token from: Authorization Header\n";
} elseif ($token) {
    echo "Using token from: GET Parameter (?token=...)\n";
}

if (!$token) {
    echo "ERROR: No Bearer token found in headers or GET parameter.\n";
    echo "Tip: You can test in the browser by adding ?token=YOUR_JWT_HERE to the URL.\n";
    exit;
}

// 5. JWT Secret Check
$secret = JWTHelper::getSecretKey();
echo "Secret Key Information:\n";
echo "- Configured: " . ($secret ? "Yes" : "No") . "\n";
echo "- Length: " . strlen($secret) . " characters\n";
if ($secret) {
    echo "- Prefix/Suffix: " . substr($secret, 0, 4) . "..." . substr($secret, -4) . "\n";
    echo "- Hex Dump (First 8): " . bin2hex(substr($secret, 0, 8)) . "\n";
    echo "- Hex Dump (Last 8):  " . bin2hex(substr($secret, -8)) . "\n";
}
echo "\n";

// 5b. Token Cleaning
$originalToken = $token;
$token = trim($token);
// Strip "Bearer " prefix if accidentally included in GET parameter
if (stripos($token, 'Bearer ') === 0) {
    $token = trim(substr($token, 7));
    echo "NOTICE: Stripped 'Bearer ' prefix from token string.\n";
}
if ($originalToken !== $token) {
    echo "NOTICE: Token had leading/trailing whitespace which was trimmed.\n";
}
echo "Token Hex Dump (First 16): " . bin2hex(substr($token, 0, 16)) . "\n";
echo "Token Hex Dump (Last 16):  " . bin2hex(substr($token, -16)) . "\n\n";

// 6. Token Decoding & Validation
echo "--- Token Analysis ---\n";

try {
    // A. Decode without validation (to see payload)
    $tks = explode('.', $token);
    if (count($tks) !== 3) {
        throw new Exception("Invalid token format (not 3 parts)");
    }
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $tks[1])), true);
    
    echo "Payload Content:\n";
    print_r($payload);
    
    if (isset($payload['exp'])) {
        $exp = $payload['exp'];
        $diff = $exp - time();
        echo "Expiration Time: " . gmdate('Y-m-d H:i:s', $exp) . " UTC\n";
        echo "Current Time:    " . gmdate('Y-m-d H:i:s') . " UTC\n";
        
        if ($diff < 0) {
            echo "RESULT: !!! TOKEN EXPIRED !!! (" . abs($diff) . " seconds ago)\n";
        } else {
            echo "RESULT: Token is valid for " . $diff . " more seconds.\n";
        }
    }

    // B. Full Validation with Secret
    echo "\nFull Validation Check:\n";
    try {
        $decoded = JWT::decode($token, new Key($secret, 'HS256'));
        echo "VALIDATION SUCCESS: Token signature and claims are valid.\n";
    } catch (\Firebase\JWT\ExpiredException $e) {
        echo "VALIDATION FAILED: ExpiredException - " . $e->getMessage() . "\n";
    } catch (\Firebase\JWT\SignatureInvalidException $e) {
        echo "VALIDATION FAILED: SignatureInvalidException - Check if JWT_SECRET in .env matches the one used to generate the token.\n";
    } catch (\Exception $e) {
        echo "VALIDATION FAILED: " . get_class($e) . " - " . $e->getMessage() . "\n";
    }

} catch (Exception $e) {
    echo "CRITICAL ERROR: " . $e->getMessage() . "\n";
}

echo "\n--- End of Debug ---\n";
