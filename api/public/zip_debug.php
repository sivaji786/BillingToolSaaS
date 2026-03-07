<?php
// zip_debug.php
// A simple script to verify PHP ZIP extension and basic extraction capabilities

echo "<h1>PHP ZIP Extension Debugger</h1>";

// 1. Check for ZipArchive
$hasZip = false;
echo "<h2>1. Checking Dependencies</h2>";
if (class_exists('ZipArchive')) {
    echo "<p style='color:green;'>&#10004; ZipArchive class exists. PHP 'zip' extension is installed and enabled.</p>";
    $hasZip = true;
} else {
    echo "<p style='color:red;'>&#10008; ZipArchive class NOT FOUND. You need to install/enable the PHP 'zip' extension on your server.</p>";
    echo "<ul>
            <li>Ubuntu/Debian: <code>sudo apt-get install php-zip</code></li>
            <li>CentOS/RHEL: <code>sudo yum install php-zip</code></li>
            <li>Windows: Enable <code>extension=zip</code> in your php.ini</li>
          </ul>";
    exit("Cannot proceed without ZipArchive.");
}

// 2. Check for fileinfo (used by mime_content_type)
if (function_exists('mime_content_type')) {
    echo "<p style='color:green;'>&#10004; mime_content_type() is available (fileinfo extension is enabled).</p>";
} else {
    echo "<p style='color:orange;'>&#9888; mime_content_type() NOT FOUND. The 'fileinfo' extension is missing. The WorkspaceController needs this to determine file types during extraction.</p>";
}

// 3. Test Extraction
echo "<h2>2. Testing Extraction</h2>";

$tempDir = __DIR__ . '/zip_test_temp';
$testZipName = $tempDir . '/test.zip';
$extractDir = $tempDir . '/extracted';

// Create temp directories
if (!is_dir($tempDir)) {
    if (@mkdir($tempDir, 0755, true)) {
        echo "<p>Created temporary test directory: $tempDir</p>";
    } else {
        echo "<p style='color:red;'>&#10008; Failed to create temp directory. Please check permissions for folder: " . __DIR__ . "</p>";
        exit;
    }
}

// Create a dummy zip file
$zip = new ZipArchive();
if ($zip->open($testZipName, ZipArchive::CREATE) === TRUE) {
    $zip->addFromString('test_file.txt', 'This is a test file.');
    $zip->close();
    echo "<p style='color:green;'>&#10004; Successfully created a test zip archive.</p>";
} else {
    echo "<p style='color:red;'>&#10008; Failed to create test zip archive.</p>";
}

// Test extracting the dummy zip file
if (!is_dir($extractDir)) {
    @mkdir($extractDir, 0755, true);
}

$zip = new ZipArchive();
if ($zip->open($testZipName) === TRUE) {
    if ($zip->extractTo($extractDir)) {
        echo "<p style='color:green;'>&#10004; Successfully extracted the test zip archive.</p>";
        $files = scandir($extractDir);
        echo "<p>Extracted files:</p><ul>";
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                echo "<li>" . htmlspecialchars($file) . "</li>";
                @unlink($extractDir . '/' . $file);
            }
        }
        echo "</ul>";
    } else {
        echo "<p style='color:red;'>&#10008; Failed to extract to directory. Permission issue with $extractDir ?</p>";
    }
    $zip->close();
} else {
    echo "<p style='color:red;'>&#10008; Failed to open test zip archive for reading.</p>";
}

// Cleanup
@rmdir($extractDir);
@unlink($testZipName);
@rmdir($tempDir);

echo "<p><em>Test complete and temporary files cleaned up.</em></p>";
?>
