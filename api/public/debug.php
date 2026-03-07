<?php
// debug.php - Production Diagnostics Script
// SECURITY WARNING: REMOVE THIS FILE IMMEDIATELY AFTER USE
// This script bypasses the CodeIgniter framework to check the raw environment.

header('Content-Type: text/html; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo "<pre>\n";
echo "========================================\n";
echo " DIAGNOSTIC REPORT \n";
echo "========================================\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n\n";

// --------------------------------------------------------------------
// FIX TENANT LOGIC (Integrated)
// --------------------------------------------------------------------
if (isset($_GET['fix_tenant'])) {
    header('Content-Type: text/plain');
    echo "ATTEMPTING TO FIX TENANT 'humpl'...\n";
    
    $envFile = __DIR__ . '/../.env';
    if (!file_exists($envFile)) {
        echo "Trying alternative paths for .env...\n";
        $envFile = realpath(__DIR__ . '/../../api/.env'); 
    }
    
    if (!file_exists($envFile)) {
        die("ERROR: Could not locate .env file to read DB credentials.\n");
    }

    $env = parse_ini_file($envFile, false, INI_SCANNER_RAW);
    $host = $env['database.default.hostname'] ?? 'localhost';
    $user = $env['database.default.username'] ?? 'root';
    $pass = $env['database.default.password'] ?? '';
    $db   = $env['database.default.database'] ?? '';

    $mysqli = new mysqli($host, $user, $pass, $db);
    if ($mysqli->connect_error) {
        die("DB Connection Failed: " . $mysqli->connect_error);
    }

    $subdomain = 'humpl';
    $check = $mysqli->query("SELECT id FROM tenants WHERE subdomain = '$subdomain'");
    if ($check && $check->num_rows > 0) {
         echo "SUCCESS: Tenant '$subdomain' ALREADY EXISTS (ID: " . $check->fetch_assoc()['id'] . ").\n";
    } else {
         $sql = "INSERT INTO tenants (subdomain, status, created_at, updated_at) VALUES ('$subdomain', 'active', NOW(), NOW())";
         if ($mysqli->query($sql)) {
             echo "SUCCESS: Tenant '$subdomain' CREATED! New ID: " . $mysqli->insert_id . "\n";
         } else {
             echo "ERROR: Failed to create tenant: " . $mysqli->error . "\n";
         }
    }
    $mysqli->close();
    echo "\n<br><a href='debug.php'>[ Back to Diagnostics ]</a>";
    exit;
}

// --------------------------------------------------------------------
// SCHEMA AUDIT LOGIC
// --------------------------------------------------------------------
if (isset($_GET['show_schema'])) {
    header('Content-Type: text/plain');
    echo "========================================\n";
    echo " DATABASE SCHEMA AUDIT \n";
    echo "========================================\n";
    
    $envFile = __DIR__ . '/../.env';
    // ... (Reuse env loading logic or just use file read for simplicity in standalone) ...
    // Copying minimal env loader for robustness in this isolated block
    if (!file_exists($envFile)) $envFile = realpath(__DIR__ . '/../../api/.env'); 
    
    if (file_exists($envFile)) {
        try {
            // parse_ini_file is disabled on this server, use manual parsing
            $host = 'localhost';
            $user = 'root'; 
            $pass = '';
            $db   = '';
            
            if (is_readable($envFile)) {
                $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (strpos(trim($line), '#') === 0) continue;
                    $parts = explode('=', $line, 2);
                    if (count($parts) == 2) {
                        $key = trim($parts[0]);
                        $val = trim(trim($parts[1]), '"\'');
                        if ($key == 'database.default.hostname') $host = $val;
                        if ($key == 'database.default.username') $user = $val;
                        if ($key == 'database.default.password') $pass = $val;
                        if ($key == 'database.default.database') $db = $val;
                    }
                }
            }

            echo "Connecting to database '$db' on '$host'...\n";
            
            // PHP 8+ throws exceptions by default for mysqli errors
            mysqli_report(MYSQLI_REPORT_OFF); 
            $mysqli = new mysqli($host, $user, $pass, $db);
            
            if ($mysqli->connect_error) {
                die("DB Connection Failed: " . $mysqli->connect_error . "\n");
            }
            
            echo "Connection OK. Listing tables...\n";
            
            $tables = $mysqli->query("SHOW TABLES");
            if ($tables) {
                $count = $tables->num_rows;
                echo "Found $count tables.\n";
                
                while ($row = $tables->fetch_array()) {
                    $tableName = $row[0];
                    echo "\nTABLE: $tableName\n";
                    echo str_repeat("-", strlen($tableName)+7) . "\n";
                    
                    $cols = $mysqli->query("SHOW COLUMNS FROM `$tableName`");
                    if ($cols) {
                        echo str_pad("Field", 25) . str_pad("Type", 20) . "Null\n";
                        while ($col = $cols->fetch_assoc()) {
                            echo str_pad($col['Field'], 25) . str_pad($col['Type'], 20) . $col['Null'] . "\n";
                        }
                    } else {
                         echo "Error listing columns: " . $mysqli->error . "\n";
                    }
                }
            } else {
                echo "Error listing tables: " . $mysqli->error . "\n";
            }
            $mysqli->close();
        } catch (Throwable $t) {
            echo "CRASH DURING AUDIT: " . $t->getMessage() . "\n";
        }
    } else {
        echo "Could not find .env file at $envFile\n";
    }
    
    echo "\n\n<a href='debug.php'>[ Back to Diagnostics ]</a>";
    exit;
}

// 1. PHP Version & Extensions
echo "1. PHP ENVIRONMENT\n";
echo "------------------\n";
echo "PHP Version: " . phpversion() . "\n";
echo "SAPI: " . php_sapi_name() . "\n";

$required_extensions = ['intl', 'mbstring', 'json', 'mysqlnd', 'xml', 'curl'];
foreach ($required_extensions as $ext) {
    echo "Extension '$ext': " . (extension_loaded($ext) ? "[OK]" : "[MISSING]") . "\n";
}
echo "\n";

// 1b. Web Server & Rewrite Module
echo "1b. WEB SERVER\n";
echo "--------------\n";
echo "Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "\n";
if (function_exists('apache_get_modules')) {
    $modules = apache_get_modules();
    $rewrite_status = in_array('mod_rewrite', $modules) ? "[ENABLED]" : "[DISABLED/MISSING]";
    echo "mod_rewrite: $rewrite_status (detected via apache_get_modules)\n";
} else {
    echo "mod_rewrite: [UNKNOWN] (apache_get_modules function not available)\n";
    echo "  > TIP: If using Apache, ensure 'RewriteEngine On' works in .htaccess.\n";
}

// 1c. Rewrite Logic Test Links
echo "\n1c. REWRITE TEST LINKS\n";
echo "----------------------\n";
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
$host = $_SERVER['HTTP_HOST'];
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
// Ensure no trailing slash on scriptDir unless it's just /
$scriptDir = rtrim($scriptDir, '/');

$url_with_index = "$protocol://$host$scriptDir/index.php/billing/plans";
$url_clean = "$protocol://$host$scriptDir/billing/plans";

echo "Try clicking these links:\n";
echo "1. [Direct] $url_with_index\n";
echo "   (Should work if PHP is working. If this fails, the app is broken)\n\n";
echo "2. [Rewritten] $url_clean\n";
echo "   (Requires valid .htaccess & mod_rewrite. If 404, rewrite is broken)\n";
echo "\n";

// 2. File System & Permissions
echo "2. FILE SYSTEM\n";
echo "--------------\n";
$rootPath = realpath(__DIR__ . '/..');
echo "Root Path: $rootPath\n";

$paths_to_check = [
    'vendor/autoload.php' => 'file',
    'writable' => 'dir_writable',
    'writable/cache' => 'dir_writable',
    'writable/logs' => 'dir_writable',
    'writable/session' => 'dir_writable',
    '.env' => 'file'
];

foreach ($paths_to_check as $rel_path => $check_type) {
    $full_path = $rootPath . '/' . $rel_path;
    $exists = file_exists($full_path);
    $status = $exists ? "Exists" : "MISSING";
    
    if ($exists && $check_type == 'dir_writable') {
        $writable = is_writable($full_path);
        $status .= ($writable ? " [Writable: OK]" : " [Writable: FAIL - Permission Denied]");
    }
    
    echo "$rel_path: $status\n";
}
echo "\n";

// 3. Database Connection (Manual Test)
echo "3. DATABASE CONNECTIVITY (Start)\n";
echo "--------------------------------\n";

$envFile = $rootPath . '/.env';
$db_creds = [
    'hostname' => 'localhost',
    'username' => '',
    'password' => '',
    'database' => ''
];

if (file_exists($envFile) && is_readable($envFile)) {
    echo "Reading .env file... ";
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env_count = 0;
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        
        $parts = explode('=', $line, 2);
        if (count($parts) == 2) {
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            
            // Basic cleanup of quotes
            $val = trim($val, '"\'');
            
            if ($key == 'database.default.hostname') $db_creds['hostname'] = $val;
            if ($key == 'database.default.username') $db_creds['username'] = $val;
            if ($key == 'database.default.password') $db_creds['password'] = $val;
            if ($key == 'database.default.database') $db_creds['database'] = $val;
            $env_count++;
        }
    }
    echo "Parsed $env_count variables.\n";
} else {
    echo "WARNING: Could not read .env file. Using defaults/empty.\n";
}

echo "Attempting MySQLi connection to '{$db_creds['hostname']}' with user '{$db_creds['username']}'...\n";

try {
    // Suppress warnings to avoid leaking password in stack trace on screen if configured poorly
    $mysqli = @new mysqli(
        $db_creds['hostname'], 
        $db_creds['username'], 
        $db_creds['password'], 
        $db_creds['database']
    );

    if ($mysqli->connect_error) {
        throw new Exception("Connection failed: " . $mysqli->connect_error);
    }
    
    echo "Connection Successful! [OK]\n";
    echo "Server Info: " . $mysqli->server_info . "\n";
    echo "Host Info: " . $mysqli->host_info . "\n";
    
    // Check if tables exist
    $result = $mysqli->query("SHOW TABLES");
    $table_count = $result ? $result->num_rows : 0;
    echo "Tables found in database '{$db_creds['database']}': $table_count\n";
    
    $mysqli->close();
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "\n";

// 4. CodeIgniter Framework Boot (Attempt)
echo "4. FRAMEWORK BOOTSTRAP\n";
echo "----------------------\n";

// Path definitions from index.php
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(FCPATH);
$pathsConfig = FCPATH . '../app/Config/Paths.php';

if (file_exists($pathsConfig)) {
    try {
        require $pathsConfig;
        $paths = new Config\Paths();
        
        // 1. Load Composer Autoloader (Critical for finding CodeIgniter classes)
        $composerAutoload = $rootPath . '/vendor/autoload.php';
        if (file_exists($composerAutoload)) {
            require_once $composerAutoload;
            echo "Composer Autoloader loaded [OK]\n";
        } else {
            echo "WARNING: vendor/autoload.php NOT FOUND. Class loading will fail.\n";
        }

        require $paths->systemDirectory . '/Boot.php';
        
        // Load Common.php (defines config() helper) - Critical for Services
        if (file_exists($paths->systemDirectory . '/Common.php')) {
            require_once $paths->systemDirectory . '/Common.php';
        }

        // Initialize the Autoloader manually via Services
        // We need to verify Services.php exists in app/Config
        $appServices = $paths->appDirectory . '/Config/Services.php';
        if (file_exists($appServices)) {
             require_once $paths->systemDirectory . '/Config/BaseService.php';
             require_once $paths->systemDirectory . '/Config/Services.php';
             require_once $appServices;
        }

        if (class_exists('Config\Services')) {
            // Manually define constants needed by factories/logger if Boot didn't run entirely
            if (!defined('WRITEPATH')) define('WRITEPATH', $paths->writableDirectory . '/');
            if (!defined('APPPATH')) define('APPPATH', $paths->appDirectory . '/');
            if (!defined('ROOTPATH')) define('ROOTPATH', realpath($paths->appDirectory . '/../') . '/');
            if (!defined('SYSTEMPATH')) define('SYSTEMPATH', $paths->systemDirectory . '/');
            
            $app = \Config\Services::codeigniter();
            $app->initialize();
            $app->setContext('web');
            echo "CodeIgniter Framework Initialized [OK]\n";
        } else {
            echo "Config\Services Class NOT FOUND. Framework init skipped.\n";
        }
    } catch (Throwable $e) {
        echo "Bootstrap CRASHED: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    }
} else {
    echo "Could not find app/Config/Paths.php\n";
}

// 5. DEEP SCAN: Logs & Tenant Logic
echo "\n5. DEEP SCAN DIAGNOSTICS\n";
echo "----------------------\n";

// 5a. AdminAuth Instantiation Test
echo "[CLASS CHECK] Attempting to instantiate AdminAuth controller...\n";
try {
    if (class_exists('\\App\\Controllers\\AdminAuth')) {
        $auth = new \App\Controllers\AdminAuth();
        echo "AdminAuth instantiated successfully [OK]\n";
    } else {
        echo "Class \\App\\Controllers\\AdminAuth NOT FOUND.\n";
        echo "DEBUGGING: Listing files in app/Controllers/ to check for typos/case-sensitivity:\n";
        $controllerPath = realpath(__DIR__ . '/../app/Controllers');
        if (is_dir($controllerPath)) {
            $files = scandir($controllerPath);
            foreach ($files as $f) {
                if ($f === '.' || $f === '..') continue;
                echo " - $f\n";
            }
        } else {
            echo "ERROR: Directory $controllerPath not found!\n";
        }
    }
    
    // SYNTAX CHECK
    $targetFile = realpath(__DIR__ . '/../app/Controllers/AdminAuth.php');
    if ($targetFile && file_exists($targetFile)) {
         echo "\n[SYNTAX CHECK] Attempting to include AdminAuth.php directly...\n";
         try {
             include_once $targetFile;
             echo "File included successfully. (No syntax errors)\n";
         } catch (Throwable $t) {
             echo "FATAL ERROR during include: " . $t->getMessage() . "\n";
         }
    }
} catch (Throwable $e) {
    echo "AdminAuth instantiation FAILED: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
echo "\n";

// 5b. Log Reader
echo "[LOG READER] Checking for recent errors in writable/logs/...\n";
$logPath = $rootPath . '/writable/logs';
if (is_dir($logPath)) {
    $files = glob($logPath . '/log-*.log');
    if ($files) {
        // Sort by modified time, newest first
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        $latestLog = $files[0];
        echo "Latest Log File: " . basename($latestLog) . "\n";
        echo "Last 20 lines:\n";
        echo "--------------------------------------------------\n";
        
        $lines = file($latestLog);
        $lastLines = array_slice($lines, -20);
        foreach ($lastLines as $line) {
            echo $line;
        }
        echo "--------------------------------------------------\n";
    } else {
        echo "No log files found.\n";
    }
} else {
    echo "Log directory not found.\n";
}
echo "\n";

// 5b. Tenant 'humpl' Check
echo "[TENANT CHECK] Verifying 'humpl' tenant in database...\n";
try {
    $mysqli = @new mysqli(
        $db_creds['hostname'], 
        $db_creds['username'], 
        $db_creds['password'], 
        $db_creds['database']
    );

    if ($mysqli->connect_error) {
        throw new Exception("Connection failed: " . $mysqli->connect_error);
    }
    
    // Check tenants table existence
    $checkTable = $mysqli->query("SHOW TABLES LIKE 'tenants'");
    if ($checkTable->num_rows > 0) {
        // Check for specific tenant
        $stmt = $mysqli->prepare("SELECT * FROM tenants WHERE subdomain = ?");
        $tenantName = 'humpl';
        $stmt->bind_param("s", $tenantName);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo "Tenant 'humpl' found! ID: " . $row['id'] . ", Status: " . ($row['status'] ?? 'N/A') . "\n";
        } else {
            echo "CRITICAL: Tenant 'humpl' NOT FOUND in 'tenants' table.\n";
            echo "This explains why X-Tenant-ID: humpl might fail if internal lookup logic expects it.\n";
            echo " >> ACTION: <a href='?fix_tenant=1' style='background:red;color:white;padding:5px;'>CLICK HERE TO CREATE 'humpl' TENANT</a> <<\n";
            
            // List all tenants
            echo "Listing first 5 tenants for reference:\n";
            $allParams = $mysqli->query("SELECT id, subdomain, status FROM tenants LIMIT 5");
            while ($t = $allParams->fetch_assoc()) {
                echo " - ID: {$t['id']}, Subdomain: {$t['subdomain']}, Status: {$t['status']}\n";
            }
        }
    } else {
        echo "CRITICAL: 'tenants' table does not exist.\n";
    }
    
    $mysqli->close();
} catch (Exception $e) {
    echo "DB Check Logic Error: " . $e->getMessage() . "\n";
}

echo "\n--------------------------------------------------\n";
echo " >> ACTION: <a href='?show_schema=1' style='background:blue;color:white;padding:5px;'>CLICK HERE TO VIEW DATABASE SCHEMA (TABLES & COLUMNS)</a> <<\n";
echo "--------------------------------------------------\n";

// 6. Composer & Library Checks
echo "\n6. COMPOSER & DEPENDENCY CHECK\n";
echo "------------------------------\n";
$autoload_path = $rootPath . '/vendor/autoload.php';

if (file_exists($autoload_path)) {
    echo "Vendor Autoload: [OK] Found at $autoload_path\n";
    require_once $autoload_path;
    
    // Check specific critical libraries
    echo "Checking specific critical libraries:\n";
    
    if (class_exists('CodeIgniter\CodeIgniter')) {
        echo " - CodeIgniter Core: [OK] Loaded\n";
    } else {
        echo " - CodeIgniter Core: [MISSING]\n";
    }
    
    if (class_exists('Smalot\PdfParser\Parser')) {
        echo " - Smalot/PdfParser: [OK] Loaded\n";
    } else {
        echo " - Smalot/PdfParser: [MISSING] MUST run `composer install` on server.\n";
    }

} else {
    echo "Vendor Autoload: [NOT FOUND] MUST run `composer install` on server.\n";
}
echo "\n";

echo "7. SERVER LIMITS & CONFIG\n";
echo "-----------------------\n";
echo "Memory Limit: " . ini_get('memory_limit') . "\n";
echo "Upload Max Filesize: " . ini_get('upload_max_filesize') . "\n";
echo "Post Max Size: " . ini_get('post_max_size') . "\n";
$disabled_functions = ini_get('disable_functions');
echo "Disabled Functions: " . ($disabled_functions ?: "None") . "\n";

echo "\n========================================\n";
echo " END OF REPORT \n";
echo "========================================\n";
echo "</pre>";
