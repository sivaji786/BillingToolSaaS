<?php
/**
 * Server Diagnostic Tool
 * Place this file in /api/public/ directory
 * Access via: https://einvoice.online-project.in/api/diagnostic.php
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Diagnostic Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px; 
            margin: 30px auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        .section { 
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 0; }
        .success { color: #4CAF50; font-weight: bold; }
        .error { color: #f44336; font-weight: bold; }
        .warning { color: #ff9800; font-weight: bold; }
        table { 
            width: 100%; 
            border-collapse: collapse;
            margin: 10px 0;
        }
        th, td { 
            padding: 10px; 
            text-align: left; 
            border-bottom: 1px solid #ddd;
        }
        th { 
            background: #f9f9f9;
            font-weight: 600;
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .badge-success { background: #4CAF50; color: white; }
        .badge-error { background: #f44336; color: white; }
        .badge-warning { background: #ff9800; color: white; }
        pre { 
            background: #f5f5f5; 
            padding: 15px; 
            border-radius: 4px;
            overflow-x: auto;
        }
        .test-item {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .test-item:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <h1>🔍 Server Diagnostic Report</h1>
    <p><strong>Generated:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>

    <!-- PHP Information -->
    <div class="section">
        <h2>📋 PHP Configuration</h2>
        <table>
            <tr>
                <th>Setting</th>
                <th>Value</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>PHP Version</td>
                <td><?php echo PHP_VERSION; ?></td>
                <td>
                    <?php echo version_compare(PHP_VERSION, '7.4.0', '>=') 
                        ? '<span class="status-badge badge-success">OK</span>' 
                        : '<span class="status-badge badge-error">UPGRADE NEEDED</span>'; ?>
                </td>
            </tr>
            <tr>
                <td>Server Software</td>
                <td><?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?></td>
                <td><span class="status-badge badge-success">✓</span></td>
            </tr>
            <tr>
                <td>Document Root</td>
                <td><?php echo $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown'; ?></td>
                <td><span class="status-badge badge-success">✓</span></td>
            </tr>
            <tr>
                <td>Current Script Path</td>
                <td><?php echo __FILE__; ?></td>
                <td><span class="status-badge badge-success">✓</span></td>
            </tr>
        </table>
    </div>

    <!-- Required PHP Extensions -->
    <div class="section">
        <h2>🔌 Required PHP Extensions</h2>
        <table>
            <tr>
                <th>Extension</th>
                <th>Status</th>
                <th>Required For</th>
            </tr>
            <?php
            $extensions = [
                'intl' => 'Internationalization',
                'json' => 'JSON encoding/decoding',
                'mbstring' => 'Multi-byte string functions',
                'mysqlnd' => 'MySQL Native Driver',
                'mysqli' => 'MySQL Database',
                'xml' => 'XML processing',
                'curl' => 'HTTP requests',
            ];
            
            foreach ($extensions as $ext => $purpose) {
                $loaded = extension_loaded($ext);
                echo "<tr>";
                echo "<td><strong>{$ext}</strong></td>";
                echo "<td>" . ($loaded 
                    ? '<span class="status-badge badge-success">LOADED</span>' 
                    : '<span class="status-badge badge-error">MISSING</span>') . "</td>";
                echo "<td>{$purpose}</td>";
                echo "</tr>";
            }
            ?>
        </table>
    </div>

    <!-- Environment File Check -->
    <div class="section">
        <h2>⚙️ Environment Configuration</h2>
        <?php
        $envPath = dirname(__DIR__) . '/.env';
        $envExists = file_exists($envPath);
        $envReadable = $envExists && is_readable($envPath);
        ?>
        <div class="test-item">
            <strong>.env file exists:</strong> 
            <?php echo $envExists 
                ? '<span class="success">✓ YES</span> (' . $envPath . ')' 
                : '<span class="error">✗ NO</span> (' . $envPath . ')'; ?>
        </div>
        <div class="test-item">
            <strong>.env file readable:</strong> 
            <?php echo $envReadable 
                ? '<span class="success">✓ YES</span>' 
                : '<span class="error">✗ NO</span>'; ?>
        </div>
        
        <?php if ($envReadable): ?>
        <div class="test-item">
            <strong>.env file size:</strong> <?php echo filesize($envPath); ?> bytes
        </div>
        <div class="test-item">
            <strong>Environment variables from .env:</strong>
            <pre><?php
            $envContent = file_get_contents($envPath);
            // Hide sensitive values
            $lines = explode("\n", $envContent);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || strpos($line, '#') === 0) {
                    echo htmlspecialchars($line) . "\n";
                } else {
                    $parts = explode('=', $line, 2);
                    if (count($parts) === 2) {
                        $key = trim($parts[0]);
                        $value = trim($parts[1]);
                        // Hide sensitive keys
                        if (stripos($key, 'password') !== false || 
                            stripos($key, 'secret') !== false || 
                            stripos($key, 'key') !== false) {
                            echo htmlspecialchars($key) . " = ********\n";
                        } else {
                            echo htmlspecialchars($line) . "\n";
                        }
                    }
                }
            }
            ?></pre>
        </div>
        <?php endif; ?>
    </div>

    <!-- File Permissions -->
    <div class="section">
        <h2>📁 File Permissions</h2>
        <?php
        $checkPaths = [
            'Writable Directory' => dirname(__DIR__) . '/writable',
            '.env File' => dirname(__DIR__) . '/.env',
            'Public Directory' => __DIR__,
        ];
        ?>
        <table>
            <tr>
                <th>Path</th>
                <th>Exists</th>
                <th>Readable</th>
                <th>Writable</th>
                <th>Permissions</th>
            </tr>
            <?php foreach ($checkPaths as $name => $path): 
                $exists = file_exists($path);
                $readable = $exists && is_readable($path);
                $writable = $exists && is_writable($path);
                $perms = $exists ? substr(sprintf('%o', fileperms($path)), -4) : 'N/A';
            ?>
            <tr>
                <td><strong><?php echo $name; ?></strong><br><small><?php echo $path; ?></small></td>
                <td><?php echo $exists ? '<span class="success">✓</span>' : '<span class="error">✗</span>'; ?></td>
                <td><?php echo $readable ? '<span class="success">✓</span>' : '<span class="error">✗</span>'; ?></td>
                <td><?php echo $writable ? '<span class="success">✓</span>' : '<span class="error">✗</span>'; ?></td>
                <td><?php echo $perms; ?></td>
            </tr>
            <?php endforeach; ?>
        </table>
    </div>

    <!-- Database Connection Test -->
    <div class="section">
        <h2>🗄️ Database Connection Test</h2>
        <?php
        // Try to load environment variables manually
        if (file_exists($envPath)) {
            $envLines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($envLines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);
                    if (!getenv($key)) {
                        putenv("$key=$value");
                    }
                }
            }
        }
        
        // Extract database config from .env
        $dbHost = getenv('database.default.hostname') ?: 'localhost';
        $dbName = getenv('database.default.database') ?: 'c30082_015_einvoice';
        $dbUser = getenv('database.default.username') ?: 'c30082_015_einv';
        $dbPass = getenv('database.default.password') ?: 'TudrudNirceej$';
        $dbPort = getenv('database.default.port') ?: 3306;
        
        echo "<div class='test-item'><strong>Host:</strong> {$dbHost}:{$dbPort}</div>";
        echo "<div class='test-item'><strong>Database:</strong> {$dbName}</div>";
        echo "<div class='test-item'><strong>Username:</strong> {$dbUser}</div>";
        echo "<div class='test-item'><strong>Password:</strong> " . (empty($dbPass) ? '<span class="warning">Empty</span>' : '<span class="success">Set</span>') . "</div>";
        
        if (extension_loaded('mysqli')) {
            echo "<div class='test-item'><strong>Connection Test:</strong> ";
            $mysqli = @new mysqli($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
            
            if ($mysqli->connect_error) {
                echo '<span class="error">✗ FAILED</span><br>';
                echo '<span class="error">Error: ' . htmlspecialchars($mysqli->connect_error) . '</span>';
            } else {
                echo '<span class="success">✓ SUCCESS</span><br>';
                echo '<span class="success">Server version: ' . $mysqli->server_info . '</span>';
                $mysqli->close();
            }
            echo "</div>";
        } else {
            echo "<div class='test-item'><span class='error'>✗ MySQLi extension not loaded</span></div>";
        }
        ?>
    </div>

    <!-- CodeIgniter Framework Check -->
    <div class="section">
        <h2>🚀 CodeIgniter Framework</h2>
        <?php
        $vendorPath = dirname(__DIR__) . '/vendor';
        $vendorExists = is_dir($vendorPath);
        $autoloadPath = $vendorPath . '/autoload.php';
        $autoloadExists = file_exists($autoloadPath);
        $sparkPath = dirname(__DIR__) . '/spark';
        $sparkExists = file_exists($sparkPath);
        ?>
        <div class="test-item">
            <strong>Vendor directory:</strong> 
            <?php echo $vendorExists 
                ? '<span class="success">✓ EXISTS</span>' 
                : '<span class="error">✗ MISSING - Run composer install</span>'; ?>
        </div>
        <div class="test-item">
            <strong>Composer autoload:</strong> 
            <?php echo $autoloadExists 
                ? '<span class="success">✓ EXISTS</span>' 
                : '<span class="error">✗ MISSING</span>'; ?>
        </div>
        <div class="test-item">
            <strong>Spark CLI:</strong> 
            <?php echo $sparkExists 
                ? '<span class="success">✓ EXISTS</span>' 
                : '<span class="error">✗ MISSING</span>'; ?>
        </div>
    </div>

    <!-- URL Rewriting Test -->
    <div class="section">
        <h2>🔄 URL Rewriting (.htaccess)</h2>
        <?php
        $htaccessPath = __DIR__ . '/.htaccess';
        $htaccessExists = file_exists($htaccessPath);
        ?>
        <div class="test-item">
            <strong>.htaccess file:</strong> 
            <?php echo $htaccessExists 
                ? '<span class="success">✓ EXISTS</span>' 
                : '<span class="error">✗ MISSING</span>'; ?>
        </div>
        <div class="test-item">
            <strong>mod_rewrite enabled:</strong> 
            <?php 
            if (function_exists('apache_get_modules')) {
                echo in_array('mod_rewrite', apache_get_modules()) 
                    ? '<span class="success">✓ YES</span>' 
                    : '<span class="error">✗ NO - Enable mod_rewrite</span>';
            } else {
                echo '<span class="warning">⚠ Cannot detect (not Apache or CGI mode)</span>';
            }
            ?>
        </div>
        <div class="test-item">
            <strong>Request URI:</strong> <?php echo $_SERVER['REQUEST_URI'] ?? 'Not available'; ?>
        </div>
        <div class="test-item">
            <strong>Script Name:</strong> <?php echo $_SERVER['SCRIPT_NAME'] ?? 'Not available'; ?>
        </div>
    </div>

    <!-- HTTP Headers -->
    <div class="section">
        <h2>📡 HTTP Headers</h2>
        <pre><?php
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                echo htmlspecialchars($key) . ': ' . htmlspecialchars($value) . "\n";
            }
        }
        ?></pre>
    </div>

    <!-- Recommendations -->
    <div class="section">
        <h2>💡 Recommendations</h2>
        <?php
        $issues = [];
        
        if (!version_compare(PHP_VERSION, '7.4.0', '>=')) {
            $issues[] = 'Upgrade PHP to version 7.4 or higher';
        }
        
        if (!extension_loaded('mysqli')) {
            $issues[] = 'Install mysqli PHP extension';
        }
        
        if (!extension_loaded('intl')) {
            $issues[] = 'Install intl PHP extension';
        }
        
        if (!$vendorExists) {
            $issues[] = 'Run "composer install" in the api directory';
        }
        
        if (!$htaccessExists) {
            $issues[] = 'Create .htaccess file in public directory';
        }
        
        if (!$envExists) {
            $issues[] = 'Create .env file from .env.production';
        }
        
        if (empty($issues)) {
            echo '<p class="success">✓ All checks passed! Your server appears to be properly configured.</p>';
        } else {
            echo '<p class="error">⚠ Issues found that need attention:</p>';
            echo '<ol>';
            foreach ($issues as $issue) {
                echo '<li>' . htmlspecialchars($issue) . '</li>';
            }
            echo '</ol>';
        }
        ?>
    </div>

    <div class="section">
        <p><strong>Note:</strong> After reviewing this diagnostic, you may delete this file for security reasons.</p>
        <p><small>Diagnostic file location: <?php echo __FILE__; ?></small></p>
    </div>
</body>
</html>
