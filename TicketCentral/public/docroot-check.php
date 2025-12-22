<?php
echo "<h1>Document Root Check</h1>";
echo "<p><strong>Current file location:</strong> " . __FILE__ . "</p>";
echo "<p><strong>Document Root:</strong> " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
echo "<p><strong>Script Name:</strong> " . $_SERVER['SCRIPT_NAME'] . "</p>";
echo "<p><strong>Server Software:</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "</p>";

// Check if we can access parent directory
$parentDir = dirname(__DIR__);
echo "<hr>";
echo "<p><strong>Parent directory:</strong> " . $parentDir . "</p>";
echo "<p><strong>Parent directory exists:</strong> " . (is_dir($parentDir) ? '<span style="color:green">YES</span>' : '<span style="color:red">NO</span>') . "</p>";

// Check for .env file
$envPath = $parentDir . '/.env';
echo "<p><strong>.env file exists:</strong> " . (file_exists($envPath) ? '<span style="color:green">YES</span>' : '<span style="color:red">NO - UPLOAD IT!</span>') . "</p>";
if (file_exists($envPath)) {
    echo "<p><strong>.env file size:</strong> " . filesize($envPath) . " bytes</p>";
}

// Check for vendor directory
$vendorPath = $parentDir . '/vendor';
echo "<p><strong>vendor directory exists:</strong> " . (is_dir($vendorPath) ? '<span style="color:green">YES</span>' : '<span style="color:red">NO - RUN COMPOSER INSTALL!</span>') . "</p>";

// Check for index.php
$indexPath = __DIR__ . '/index.php';
echo "<p><strong>index.php exists:</strong> " . (file_exists($indexPath) ? '<span style="color:green">YES</span>' : '<span style="color:red">NO</span>') . "</p>";

// Check for .htaccess
$htaccessPath = __DIR__ . '/.htaccess';
echo "<p><strong>.htaccess exists:</strong> " . (file_exists($htaccessPath) ? '<span style="color:green">YES</span>' : '<span style="color:red">NO</span>') . "</p>";

echo "<hr>";
echo "<h2>Recommendation:</h2>";
if (strpos($_SERVER['DOCUMENT_ROOT'], '/public') === false) {
    echo "<p style='color:red; font-weight:bold;'>⚠️ WARNING: Your document root does not appear to be set to the /public directory!</p>";
    echo "<p>Current document root: " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
    echo "<p>Should be: /path/to/api/public</p>";
} else {
    echo "<p style='color:green; font-weight:bold;'>✓ Document root appears to be correctly set to /public directory</p>";
}
