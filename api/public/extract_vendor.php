<?php
/**
 * Vendor Auto-Extractor
 * Place this file AND vendor.zip in the SAME directory.
 * Then open this file in your browser.
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Limit execution time just in case it takes a while
set_time_limit(300); 

echo "<h1>Vendor Extractor</h1>";

$serverRoot = dirname(dirname(__FILE__)); // Points to /var/www/.../htdocs/api
$zipFile = $serverRoot . '/vendor.zip';
$extractTo = $serverRoot . '/'; // Extract to main api directory

if (!file_exists($zipFile)) {
    echo "<p style='color:red;'><strong>Error:</strong> <code>vendor.zip</code> was not found in " . __DIR__ . ".</p>";
    echo "<p>Please ensure you have uploaded <code>vendor.zip</code> to the exact same folder as this script.</p>";
    exit;
}

if (!class_exists('ZipArchive')) {
    echo "<p style='color:red;'><strong>Error:</strong> The PHP <code>zip</code> extension is not enabled on this server. Cannot extract the file directly from PHP.</p>";
    exit;
}

// Recursive function to delete a directory and its contents
function deleteDir($dirPath) {
    if (!is_dir($dirPath)) {
        return;
    }
    if (substr($dirPath, strlen($dirPath) - 1, 1) != '/') {
        $dirPath .= '/';
    }
    $files = glob($dirPath . '*', GLOB_MARK);
    foreach ($files as $file) {
        if (is_dir($file)) {
            deleteDir($file);
        } else {
            unlink($file);
        }
    }
    rmdir($dirPath);
}

echo "<p>Found <code>vendor.zip</code>.</p>";

$targetVendorDir = $extractTo . 'vendor';
if (is_dir($targetVendorDir)) {
    echo "<p>Deleting existing <code>vendor/</code> directory to ensure a clean install...</p>";
    deleteDir($targetVendorDir);
    echo "<p style='color:green;'>Old <code>vendor/</code> directory deleted.</p>";
}

echo "<p>Starting extraction...</p>";

$zip = new ZipArchive();
if ($zip->open($zipFile) === TRUE) {
    if ($zip->extractTo($extractTo)) {
        echo "<p style='color:green;'><strong>Success!</strong> Successfully extracted <code>vendor.zip</code> to " . $extractTo . "</p>";
        echo "<p>You should now see the <code>vendor/</code> directory next to this script. You can test your API and <a href='debug.php'>check the debug page</a>.</p>";
        
        // Safety warning
        echo "<p style='color:orange;'><strong>Important Security Step:</strong> Please delete this <code>extract_vendor.php</code> script and <code>vendor.zip</code> once you are finished and everything is working.</p>";
    } else {
        echo "<p style='color:red;'><strong>Failed to extract files.</strong> The server might not have write permissions for this directory.</p>";
    }
    $zip->close();
} else {
    echo "<p style='color:red;'><strong>Error:</strong> Failed to open the zip file. It may be corrupted or permission denied.</p>";
}
?>
