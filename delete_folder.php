<?php
/**
 * Recursive Folder Deletion Script
 * 
 * This script allows you to delete a folder and all its contents (files and subfolders)
 * by providing the folder path via GET or POST parameter.
 * 
 * Usage:
 * - Via URL: delete_folder.php?folder=path/to/folder
 * - Via Form: Submit folder path through the form below
 * 
 * SECURITY WARNING: This script can permanently delete files!
 * - Uncomment the authentication section below for production use
 * - Consider adding IP whitelist or password protection
 * - Never leave this script publicly accessible without protection
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Set to true to enable authentication (RECOMMENDED for production)
define('REQUIRE_AUTH', true);
define('AUTH_PASSWORD', 'Case897beak422'); // Change this!

// Base directory - restrict deletions to this directory for safety
// Set to null to allow deletion anywhere (NOT RECOMMENDED)
define('BASE_DIR', __DIR__);

// Enable detailed logging
define('ENABLE_LOGGING', true);
define('LOG_FILE', __DIR__ . '/deletion_log.txt');

// ============================================================================
// AUTHENTICATION (if enabled)
// ============================================================================

if (REQUIRE_AUTH) {
    session_start();
    
    if (!isset($_SESSION['authenticated'])) {
        if (isset($_POST['password']) && $_POST['password'] === AUTH_PASSWORD) {
            $_SESSION['authenticated'] = true;
        } else {
            showLoginForm();
            exit;
        }
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Recursively delete a directory and all its contents
 * 
 * @param string $dir Directory path to delete
 * @return array Result with success status and message
 */
function deleteDirectory($dir) {
    if (!file_exists($dir)) {
        return [
            'success' => false,
            'message' => "Directory does not exist: $dir"
        ];
    }
    
    if (!is_dir($dir)) {
        return [
            'success' => false,
            'message' => "Path is not a directory: $dir"
        ];
    }
    
    $deletedFiles = 0;
    $deletedDirs = 0;
    $errors = [];
    
    try {
        $items = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        
        foreach ($items as $item) {
            if ($item->isDir()) {
                if (rmdir($item->getRealPath())) {
                    $deletedDirs++;
                } else {
                    $errors[] = "Failed to delete directory: " . $item->getRealPath();
                }
            } else {
                if (unlink($item->getRealPath())) {
                    $deletedFiles++;
                } else {
                    $errors[] = "Failed to delete file: " . $item->getRealPath();
                }
            }
        }
        
        // Delete the main directory
        if (rmdir($dir)) {
            $deletedDirs++;
            $success = true;
            $message = "Successfully deleted: $deletedFiles files and $deletedDirs directories";
        } else {
            $success = false;
            $message = "Failed to delete main directory: $dir";
            $errors[] = $message;
        }
        
    } catch (Exception $e) {
        $success = false;
        $message = "Error: " . $e->getMessage();
        $errors[] = $message;
    }
    
    return [
        'success' => $success,
        'message' => $message,
        'deleted_files' => $deletedFiles,
        'deleted_dirs' => $deletedDirs,
        'errors' => $errors
    ];
}

/**
 * Log deletion activity
 */
function logDeletion($folder, $result) {
    if (!ENABLE_LOGGING) return;
    
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    $status = $result['success'] ? 'SUCCESS' : 'FAILED';
    
    $logEntry = sprintf(
        "[%s] %s - IP: %s - Folder: %s - Files: %d - Dirs: %d - Message: %s\n",
        $timestamp,
        $status,
        $ip,
        $folder,
        $result['deleted_files'] ?? 0,
        $result['deleted_dirs'] ?? 0,
        $result['message']
    );
    
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND);
}

/**
 * Validate folder path for security
 */
function validatePath($path) {
    // Remove any directory traversal attempts
    $path = str_replace(['../', '..\\'], '', $path);
    
    // Convert to absolute path
    $realPath = realpath($path);
    
    if ($realPath === false) {
        // Path doesn't exist yet or is invalid
        $realPath = $path;
    }
    
    // If BASE_DIR is set, ensure path is within it
    if (BASE_DIR !== null) {
        $baseReal = realpath(BASE_DIR);
        if ($baseReal && strpos($realPath, $baseReal) !== 0) {
            return [
                'valid' => false,
                'message' => 'Access denied: Path is outside allowed directory'
            ];
        }
    }
    
    return [
        'valid' => true,
        'path' => $realPath
    ];
}

/**
 * Show login form
 */
function showLoginForm() {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authentication Required</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
            input[type="password"] { width: 100%; padding: 10px; margin: 10px 0; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
            button:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <h2>Authentication Required</h2>
        <form method="POST">
            <input type="password" name="password" placeholder="Enter password" required>
            <button type="submit">Login</button>
        </form>
    </body>
    </html>
    <?php
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

$result = null;
$folderToDelete = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['folder'])) {
    $folderToDelete = trim($_POST['folder']);
} elseif (isset($_GET['folder'])) {
    $folderToDelete = trim($_GET['folder']);
}

if (!empty($folderToDelete)) {
    // Validate path
    $validation = validatePath($folderToDelete);
    
    if (!$validation['valid']) {
        $result = [
            'success' => false,
            'message' => $validation['message']
        ];
    } else {
        // Perform deletion
        $result = deleteDirectory($validation['path']);
        logDeletion($folderToDelete, $result);
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Folder Deletion Tool</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            color: #856404;
        }
        
        .warning strong {
            display: block;
            margin-bottom: 5px;
        }
        
        .form-group {
            margin: 20px 0;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 600;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        button {
            flex: 1;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-delete {
            background: #dc3545;
            color: white;
        }
        
        .btn-delete:hover {
            background: #c82333;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }
        
        .btn-reset {
            background: #6c757d;
            color: white;
        }
        
        .btn-reset:hover {
            background: #5a6268;
        }
        
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 6px;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .result.success {
            background: #d4edda;
            border-left: 4px solid #28a745;
            color: #155724;
        }
        
        .result.error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
            color: #721c24;
        }
        
        .result-details {
            margin-top: 10px;
            font-size: 14px;
        }
        
        .error-list {
            margin-top: 10px;
            padding-left: 20px;
        }
        
        .info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            color: #014361;
            font-size: 14px;
        }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗑️ Folder Deletion Tool</h1>
        
        <div class="warning">
            <strong>⚠️ Warning!</strong>
            This action will permanently delete the folder and all its contents. This cannot be undone!
        </div>
        
        <?php if ($result): ?>
            <div class="result <?php echo $result['success'] ? 'success' : 'error'; ?>">
                <strong><?php echo $result['success'] ? '✓ Success' : '✗ Error'; ?></strong>
                <div><?php echo htmlspecialchars($result['message']); ?></div>
                
                <?php if (isset($result['deleted_files']) || isset($result['deleted_dirs'])): ?>
                    <div class="result-details">
                        Files deleted: <?php echo $result['deleted_files'] ?? 0; ?><br>
                        Directories deleted: <?php echo $result['deleted_dirs'] ?? 0; ?>
                    </div>
                <?php endif; ?>
                
                <?php if (!empty($result['errors'])): ?>
                    <div class="error-list">
                        <strong>Errors encountered:</strong>
                        <ul>
                            <?php foreach ($result['errors'] as $error): ?>
                                <li><?php echo htmlspecialchars($error); ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <form method="POST" onsubmit="return confirm('Are you sure you want to delete this folder and all its contents? This action cannot be undone!');">
            <div class="form-group">
                <label for="folder">Folder Path:</label>
                <input 
                    type="text" 
                    id="folder" 
                    name="folder" 
                    placeholder="e.g., uploads/temp or /var/www/html/old_files"
                    value="<?php echo htmlspecialchars($folderToDelete); ?>"
                    required
                >
            </div>
            
            <div class="info">
                <strong>💡 Tips:</strong><br>
                • Use relative paths (e.g., <code>uploads/temp</code>) or absolute paths (e.g., <code>/var/www/html/folder</code>)<br>
                • Make sure you have proper permissions to delete the folder<br>
                <?php if (BASE_DIR !== null): ?>
                • Deletions are restricted to: <code><?php echo htmlspecialchars(BASE_DIR); ?></code><br>
                <?php endif; ?>
                <?php if (ENABLE_LOGGING): ?>
                • All deletions are logged to: <code><?php echo htmlspecialchars(LOG_FILE); ?></code>
                <?php endif; ?>
            </div>
            
            <div class="btn-group">
                <button type="submit" class="btn-delete">Delete Folder</button>
                <button type="reset" class="btn-reset">Clear</button>
            </div>
        </form>
        
        <?php if (REQUIRE_AUTH): ?>
            <div style="margin-top: 20px; text-align: center;">
                <a href="?logout=1" style="color: #667eea; text-decoration: none;">Logout</a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>

<?php
// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}
?>
