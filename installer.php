<?php
/**
 * BillingTool Installer
 * 
 * This installer will:
 * 1. Extract the application zip file
 * 2. Configure database connection
 * 3. Set up environment files
 * 4. Configure file permissions
 * 5. Create .htaccess files
 * 
 * NOTE: You must import database/schema.sql via phpMyAdmin BEFORE running this installer!
 */

// Prevent direct access after installation
if (file_exists(__DIR__ . '/.installed')) {
    die('Application is already installed. Delete .installed file to reinstall.');
}

// Configuration
define('APP_ZIP_FILE', 'billingtool.zip');
define('EXTRACT_PATH', __DIR__);
define('MIN_PHP_VERSION', '8.1');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300); // 5 minutes

// Check PHP version
if (version_compare(PHP_VERSION, MIN_PHP_VERSION, '<')) {
    die("PHP {MIN_PHP_VERSION} or higher is required. Current version: " . PHP_VERSION);
}

// Required PHP extensions
$required_extensions = ['mysqli', 'zip', 'json', 'mbstring', 'curl'];
$missing_extensions = [];
foreach ($required_extensions as $ext) {
    if (!extension_loaded($ext)) {
        $missing_extensions[] = $ext;
    }
}

if (!empty($missing_extensions)) {
    die("Missing required PHP extensions: " . implode(', ', $missing_extensions));
}

// Installation class
class Installer {
    private $errors = [];
    private $success = [];
    private $config = [];
    
    public function __construct() {
        session_start();
    }
    
    public function run() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->handleInstallation();
        } else {
            $this->showForm();
        }
    }
    
    private function handleInstallation() {
        // Get form data
        $this->config = [
            'site_url' => rtrim($_POST['site_url'], '/'),
            'api_url' => rtrim($_POST['api_url'], '/'),
            'db_host' => $_POST['db_host'],
            'db_name' => $_POST['db_name'],
            'db_user' => $_POST['db_user'],
            'db_pass' => $_POST['db_pass'],
            'db_port' => $_POST['db_port'] ?? '3306',
            'encryption_key' => bin2hex(random_bytes(16)),
            'jwt_secret' => bin2hex(random_bytes(32)),
        ];
        
        // Step 1: Test database connection
        if (!$this->testDatabaseConnection()) {
            $this->showForm();
            return;
        }
        
        // Step 2: Extract zip file
        if (!$this->extractZipFile()) {
            $this->showForm();
            return;
        }
        
        // Step 3: Create environment files
        if (!$this->createEnvironmentFiles()) {
            $this->showForm();
            return;
        }
        
        // Step 4: Set permissions
        if (!$this->setPermissions()) {
            $this->showForm();
            return;
        }
        
        // Step 5: Create .htaccess files
        if (!$this->createHtaccessFiles()) {
            $this->showForm();
            return;
        }
        
        // Mark as installed
        file_put_contents(EXTRACT_PATH . '/.installed', date('Y-m-d H:i:s'));
        
        $this->showSuccess();
    }
    
    private function testDatabaseConnection() {
        try {
            $mysqli = new mysqli(
                $this->config['db_host'],
                $this->config['db_user'],
                $this->config['db_pass'],
                $this->config['db_name'],
                (int)$this->config['db_port']
            );
            
            if ($mysqli->connect_error) {
                $this->errors[] = "Database connection failed: " . $mysqli->connect_error;
                return false;
            }
            
            $mysqli->close();
            $this->success[] = "Database connection successful";
            return true;
        } catch (Exception $e) {
            $this->errors[] = "Database error: " . $e->getMessage();
            return false;
        }
    }
    
    private function extractZipFile() {
        $zipPath = EXTRACT_PATH . '/' . APP_ZIP_FILE;
        
        if (!file_exists($zipPath)) {
            $this->errors[] = "Zip file not found: " . APP_ZIP_FILE;
            return false;
        }
        
        $zip = new ZipArchive;
        if ($zip->open($zipPath) === TRUE) {
            $zip->extractTo(EXTRACT_PATH);
            $zip->close();
            $this->success[] = "Application files extracted successfully";
            return true;
        } else {
            $this->errors[] = "Failed to extract zip file";
            return false;
        }
    }
    
    private function createEnvironmentFiles() {
        // Create frontend .env.production
        $frontendEnv = "VITE_API_BASE_URL={$this->config['api_url']}/index.php\n";
        
        if (!file_put_contents(EXTRACT_PATH . '/.env.production', $frontendEnv)) {
            $this->errors[] = "Failed to create frontend .env.production file";
            return false;
        }
        
        // Create API .env file
        $apiEnv = <<<ENV
#--------------------------------------------------------------------
# ENVIRONMENT
#--------------------------------------------------------------------
CI_ENVIRONMENT = production

FRONTEND_URL = {$this->config['site_url']}

#--------------------------------------------------------------------
# APP
#--------------------------------------------------------------------
app.baseURL = {$this->config['api_url']}/
app.forceGlobalSecureRequests = false

#--------------------------------------------------------------------
# DATABASE
#--------------------------------------------------------------------
database.default.hostname = {$this->config['db_host']}
database.default.database = {$this->config['db_name']}
database.default.username = {$this->config['db_user']}
database.default.password = {$this->config['db_pass']}
database.default.DBDriver = MySQLi
database.default.port = {$this->config['db_port']}

#--------------------------------------------------------------------
# ENCRYPTION
#--------------------------------------------------------------------
encryption.key = {$this->config['encryption_key']}

#--------------------------------------------------------------------
# SESSION
#--------------------------------------------------------------------
session.driver = 'CodeIgniter\\Session\\Handlers\\FileHandler'
session.savePath = null

#--------------------------------------------------------------------
# LOGGER
#--------------------------------------------------------------------
logger.threshold = 1

#--------------------------------------------------------------------
# JWT
#--------------------------------------------------------------------
JWT_SECRET = {$this->config['jwt_secret']}
ENV;
        
        if (!file_put_contents(EXTRACT_PATH . '/api/.env', $apiEnv)) {
            $this->errors[] = "Failed to create API .env file";
            return false;
        }
        
        $this->success[] = "Environment files created successfully";
        return true;
    }
    
    
    private function setPermissions() {
        $writableDirs = [
            '/api/writable',
            '/api/writable/cache',
            '/api/writable/logs',
            '/api/writable/session',
            '/api/writable/uploads',
            '/api/public/uploads',
        ];
        
        foreach ($writableDirs as $dir) {
            $fullPath = EXTRACT_PATH . $dir;
            if (is_dir($fullPath)) {
                @chmod($fullPath, 0755);
            }
        }
        
        $this->success[] = "Permissions set successfully";
        return true;
    }
    
    private function createHtaccessFiles() {
        // Root .htaccess for frontend
        $rootHtaccess = <<<HTACCESS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Redirect API requests to api folder
    RewriteRule ^api/(.*)$ api/public/index.php/$1 [L]
    
    # Frontend routing
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
HTACCESS;
        
        file_put_contents(EXTRACT_PATH . '/.htaccess', $rootHtaccess);
        
        // API .htaccess
        $apiHtaccess = <<<HTACCESS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /api/public/
    
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php/$1 [L]
</IfModule>

# Disable directory browsing
Options -Indexes

# PHP settings
php_flag display_errors Off
php_value upload_max_filesize 10M
php_value post_max_size 10M
HTACCESS;
        
        file_put_contents(EXTRACT_PATH . '/api/public/.htaccess', $apiHtaccess);
        
        $this->success[] = ".htaccess files created successfully";
        return true;
    }
    
    private function showForm() {
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BillingTool Installer</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
                    max-width: 600px;
                    width: 100%;
                    padding: 40px;
                }
                h1 {
                    color: #333;
                    margin-bottom: 10px;
                    font-size: 28px;
                }
                .subtitle {
                    color: #666;
                    margin-bottom: 30px;
                    font-size: 14px;
                }
                .requirements {
                    background: #f8f9fa;
                    border-left: 4px solid #28a745;
                    padding: 15px;
                    margin-bottom: 30px;
                    border-radius: 4px;
                }
                .requirements h3 {
                    color: #28a745;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                .requirements ul {
                    list-style: none;
                    padding-left: 0;
                }
                .requirements li {
                    padding: 5px 0;
                    color: #555;
                    font-size: 14px;
                }
                .requirements li:before {
                    content: "✓ ";
                    color: #28a745;
                    font-weight: bold;
                    margin-right: 8px;
                }
                .form-group {
                    margin-bottom: 20px;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
                    color: #333;
                    font-weight: 500;
                    font-size: 14px;
                }
                input[type="text"],
                input[type="password"],
                input[type="number"] {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e1e4e8;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.3s;
                }
                input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                .help-text {
                    font-size: 12px;
                    color: #666;
                    margin-top: 5px;
                }
                button {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
                }
                button:active {
                    transform: translateY(0);
                }
                .error {
                    background: #f8d7da;
                    border-left: 4px solid #dc3545;
                    color: #721c24;
                    padding: 15px;
                    margin-bottom: 20px;
                    border-radius: 4px;
                }
                .success {
                    background: #d4edda;
                    border-left: 4px solid #28a745;
                    color: #155724;
                    padding: 15px;
                    margin-bottom: 20px;
                    border-radius: 4px;
                }
                .section-title {
                    color: #667eea;
                    font-size: 18px;
                    margin: 30px 0 15px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e1e4e8;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 BillingTool Installer</h1>
                <p class="subtitle">Configure your installation settings</p>
                
                <div class="requirements">
                    <h3>System Requirements Met</h3>
                    <ul>
                        <li>PHP <?php echo PHP_VERSION; ?> (Required: <?php echo MIN_PHP_VERSION; ?>+)</li>
                        <li>MySQL/MariaDB Database</li>
                        <li>ZIP Extension</li>
                        <li>MySQLi Extension</li>
                    </ul>
                </div>
                
                <div class="warning">
                    <strong>⚠️ IMPORTANT: Database Setup Required</strong>
                    <p style="margin-top: 10px;">Before running this installer, you MUST:</p>
                    <ol style="margin-left: 20px; margin-top: 10px;">
                        <li>Create a database in phpMyAdmin</li>
                        <li>Import the <code>database/schema.sql</code> file into your database</li>
                        <li>Create a database user with all privileges</li>
                    </ol>
                    <p style="margin-top: 10px; font-size: 12px;">The installer will NOT create database tables. You must import the schema manually first.</p>
                </div>
                
                <?php if (!empty($this->errors)): ?>
                    <div class="error">
                        <strong>Installation Errors:</strong>
                        <ul>
                            <?php foreach ($this->errors as $error): ?>
                                <li><?php echo htmlspecialchars($error); ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>
                
                <?php if (!empty($this->success)): ?>
                    <div class="success">
                        <strong>Progress:</strong>
                        <ul>
                            <?php foreach ($this->success as $msg): ?>
                                <li><?php echo htmlspecialchars($msg); ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>
                
                <form method="POST" action="">
                    <h2 class="section-title">Application URLs</h2>
                    
                    <div class="form-group">
                        <label for="site_url">Site URL</label>
                        <input type="text" id="site_url" name="site_url" 
                               value="<?php echo isset($_POST['site_url']) ? htmlspecialchars($_POST['site_url']) : 'https://yourdomain.com'; ?>" 
                               required>
                        <div class="help-text">Your main domain (e.g., https://yourdomain.com)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="api_url">API URL</label>
                        <input type="text" id="api_url" name="api_url" 
                               value="<?php echo isset($_POST['api_url']) ? htmlspecialchars($_POST['api_url']) : 'https://yourdomain.com/api/public'; ?>" 
                               required>
                        <div class="help-text">API endpoint (e.g., https://yourdomain.com/api/public)</div>
                    </div>
                    
                    <h2 class="section-title">Database Configuration</h2>
                    
                    <div class="form-group">
                        <label for="db_host">Database Host</label>
                        <input type="text" id="db_host" name="db_host" 
                               value="<?php echo isset($_POST['db_host']) ? htmlspecialchars($_POST['db_host']) : 'localhost'; ?>" 
                               required>
                        <div class="help-text">Usually 'localhost' for shared hosting</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_name">Database Name</label>
                        <input type="text" id="db_name" name="db_name" 
                               value="<?php echo isset($_POST['db_name']) ? htmlspecialchars($_POST['db_name']) : ''; ?>" 
                               required>
                        <div class="help-text">Create this database in phpMyAdmin first</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_user">Database Username</label>
                        <input type="text" id="db_user" name="db_user" 
                               value="<?php echo isset($_POST['db_user']) ? htmlspecialchars($_POST['db_user']) : ''; ?>" 
                               required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_pass">Database Password</label>
                        <input type="password" id="db_pass" name="db_pass" 
                               value="<?php echo isset($_POST['db_pass']) ? htmlspecialchars($_POST['db_pass']) : ''; ?>" 
                               required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_port">Database Port</label>
                        <input type="number" id="db_port" name="db_port" 
                               value="<?php echo isset($_POST['db_port']) ? htmlspecialchars($_POST['db_port']) : '3306'; ?>" 
                               required>
                        <div class="help-text">Default MySQL port is 3306</div>
                    </div>
                    
                    <button type="submit">Install BillingTool</button>
                </form>
            </div>
        </body>
        </html>
        <?php
    }
    
    private function showSuccess() {
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Installation Complete</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
                    max-width: 600px;
                    width: 100%;
                    padding: 40px;
                    text-align: center;
                }
                .success-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #28a745;
                    margin-bottom: 20px;
                }
                .info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    text-align: left;
                }
                .info h3 {
                    color: #333;
                    margin-bottom: 15px;
                }
                .info p {
                    color: #666;
                    margin-bottom: 10px;
                    line-height: 1.6;
                }
                .warning {
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: left;
                    border-radius: 4px;
                }
                .warning strong {
                    color: #856404;
                }
                .btn {
                    display: inline-block;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-top: 20px;
                    font-weight: 600;
                    transition: transform 0.2s;
                }
                .btn:hover {
                    transform: translateY(-2px);
                }
                code {
                    background: #f4f4f4;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    color: #e83e8c;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>Installation Complete!</h1>
                <p>BillingTool has been successfully installed and configured.</p>
                
                <div class="info">
                    <h3>Next Steps:</h3>
                    <p><strong>1.</strong> Delete the installer files for security:</p>
                    <p style="margin-left: 20px;">- <code>installer.php</code></p>
                    <p style="margin-left: 20px;">- <code>billingtool.zip</code></p>
                    
                    <p style="margin-top: 15px;"><strong>2.</strong> Access your application:</p>
                    <p style="margin-left: 20px;">Frontend: <code><?php echo htmlspecialchars($this->config['site_url']); ?></code></p>
                    <p style="margin-left: 20px;">API: <code><?php echo htmlspecialchars($this->config['api_url']); ?></code></p>
                    
                    <p style="margin-top: 15px;"><strong>3.</strong> Default login credentials:</p>
                    <p style="margin-left: 20px;">Check your database or documentation for default admin credentials</p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important Security Steps:</strong>
                    <p style="margin-top: 10px;">1. Delete <code>installer.php</code> immediately</p>
                    <p>2. Delete <code>billingtool.zip</code></p>
                    <p>3. Change default passwords</p>
                    <p>4. Review file permissions</p>
                </div>
                
                <a href="<?php echo htmlspecialchars($this->config['site_url']); ?>" class="btn">Go to Application</a>
            </div>
        </body>
        </html>
        <?php
    }
}

// Run installer
$installer = new Installer();
$installer->run();
