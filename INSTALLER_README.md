# BillingTool PHP Installer

## Overview

This installer automates the deployment of BillingTool to shared hosting environments. It handles:
- ✅ Zip file extraction
- ✅ Database configuration
- ✅ Environment file creation
- ✅ Database table creation
- ✅ File permissions setup
- ✅ .htaccess configuration

## Features

### 🎨 User-Friendly Interface
- Modern, responsive design
- Real-time validation
- Progress indicators
- Clear error messages

### 🔒 Security
- Database connection testing
- Secure key generation
- Post-installation cleanup reminders
- File permission management

### 🚀 Automation
- One-click installation
- Automatic database migration
- Environment configuration
- Default admin user creation

## Requirements

- **PHP**: 8.1 or higher
- **MySQL/MariaDB**: 5.7 or higher
- **PHP Extensions**: 
  - mysqli
  - zip
  - json
  - mbstring
  - curl
- **File Upload Limit**: At least 50MB
- **mod_rewrite**: Enabled (for clean URLs)

## Installation Process

### Step 1: Prepare Files

1. Build your frontend:
   ```bash
   npm run build
   ```

2. Create deployment package:
   ```bash
   ./create-deployment-package.sh
   ```

3. You should now have:
   - `billingtool.zip` (application package)
   - `installer.php` (this installer)

### Step 2: Prepare Database

1. Login to phpMyAdmin
2. Create a new database (e.g., `billingtool_db`)
3. Create a database user
4. Grant all privileges to the user
5. Note down the credentials

### Step 3: Upload Files

Upload via FTP to your `public_html` directory:
- `billingtool.zip`
- `installer.php`

### Step 4: Run Installer

1. Navigate to: `https://yourdomain.com/installer.php`
2. Fill in the form:
   - **Site URL**: Your domain (e.g., `https://yourdomain.com`)
   - **API URL**: API endpoint (e.g., `https://yourdomain.com/api/public`)
   - **Database credentials**: From Step 2
3. Click "Install BillingTool"
4. Wait for completion

### Step 5: Post-Installation

1. **Delete installer files**:
   - `installer.php`
   - `billingtool.zip`

2. **Test your installation**:
   - Frontend: `https://yourdomain.com`
   - API: `https://yourdomain.com/api/public/index.php`

3. **Login with default credentials**:
   - Username: `admin`
   - Password: `password`
   - **⚠️ CHANGE THIS IMMEDIATELY!**

## What the Installer Does

### 1. Database Connection Test
- Validates database credentials
- Ensures database is accessible
- Tests connection before proceeding

### 2. File Extraction
- Extracts `billingtool.zip`
- Places files in correct locations
- Maintains directory structure

### 3. Environment Configuration
Creates two environment files:

#### Frontend `.env.production`
```env
VITE_API_BASE_URL=https://yourdomain.com/api/public/index.php
```

#### Backend `api/.env`
```env
CI_ENVIRONMENT = production
FRONTEND_URL = https://yourdomain.com
app.baseURL = https://yourdomain.com/api/public/
database.default.hostname = localhost
database.default.database = your_db_name
database.default.username = your_db_user
database.default.password = your_db_pass
encryption.key = [auto-generated]
JWT_SECRET = [auto-generated]
```

### 4. Database Migration
- Executes `database/schema.sql`
- Creates all required tables:
  - users
  - company_profiles
  - clients
  - invoices
  - invoice_items
  - invoice_templates
  - audit_logs
  - tickets
  - projects
- Creates default admin user

### 5. File Permissions
Sets correct permissions for:
- `api/writable/` (755)
- `api/writable/cache/` (755)
- `api/writable/logs/` (755)
- `api/writable/session/` (755)
- `api/writable/uploads/` (755)
- `api/public/uploads/` (755)

### 6. .htaccess Configuration

#### Root `.htaccess`
```apache
RewriteEngine On
RewriteRule ^api/(.*)$ api/public/index.php/$1 [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

#### API `.htaccess`
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php/$1 [L]
```

## Default Admin User

The installer creates a default admin user:

- **Username**: `admin`
- **Email**: `admin@billingtool.local`
- **Password**: `password`
- **Role**: `admin`

**⚠️ IMPORTANT**: Change this password immediately after first login!

## File Structure After Installation

```
public_html/
├── index.html                    # Frontend entry point
├── assets/                       # Frontend assets (JS, CSS, images)
├── .htaccess                     # Root routing configuration
├── .env.production              # Frontend environment config
├── database/
│   └── schema.sql               # Database schema (for reference)
└── api/
    ├── app/                     # CodeIgniter application
    ├── public/
    │   ├── index.php           # API entry point
    │   ├── .htaccess           # API routing
    │   └── uploads/            # Public uploads
    ├── writable/
    │   ├── cache/              # Cache files
    │   ├── logs/               # Error logs
    │   ├── session/            # Session files
    │   └── uploads/            # Private uploads
    ├── vendor/                  # Composer dependencies
    └── .env                     # API environment config
```

## Troubleshooting

### "Database connection failed"
**Causes**:
- Incorrect credentials
- Database doesn't exist
- User doesn't have privileges
- Wrong host (try `127.0.0.1` instead of `localhost`)

**Solution**:
1. Verify credentials in phpMyAdmin
2. Ensure database exists
3. Check user privileges
4. Try different host value

### "Failed to extract zip file"
**Causes**:
- Zip file corrupted
- Insufficient disk space
- Permission issues

**Solution**:
1. Re-upload the zip file
2. Check available disk space
3. Verify file permissions

### "500 Internal Server Error" after installation
**Causes**:
- Missing .htaccess files
- PHP version too old
- mod_rewrite not enabled
- File permission issues

**Solution**:
1. Check if `.htaccess` files exist
2. Verify PHP version (8.1+)
3. Contact hosting to enable mod_rewrite
4. Check file permissions

### "404 Not Found" for API requests
**Causes**:
- Incorrect API URL
- .htaccess not working
- mod_rewrite disabled

**Solution**:
1. Verify API URL in `.env.production`
2. Check `.htaccess` in `api/public/`
3. Test: `https://yourdomain.com/api/public/index.php` directly

### Blank page on frontend
**Causes**:
- Incorrect API URL
- JavaScript errors
- Missing assets

**Solution**:
1. Check browser console for errors
2. Verify `VITE_API_BASE_URL` in `.env.production`
3. Ensure `assets/` folder exists

## Security Recommendations

### Immediate Actions
1. ✅ Delete `installer.php`
2. ✅ Delete `billingtool.zip`
3. ✅ Change admin password
4. ✅ Update admin email

### Ongoing Security
1. 🔒 Use HTTPS (SSL certificate)
2. 🔒 Regular database backups
3. 🔒 Keep PHP and MySQL updated
4. 🔒 Monitor error logs
5. 🔒 Use strong passwords
6. 🔒 Limit file upload sizes
7. 🔒 Regular security audits

## Support

### Log Files
Check these locations for errors:
- `api/writable/logs/log-YYYY-MM-DD.log`

### Debug Mode
To enable debug mode temporarily:
1. Edit `api/.env`
2. Change `CI_ENVIRONMENT = production` to `CI_ENVIRONMENT = development`
3. Check errors
4. **Change back to production when done!**

### Common Issues
- **Session errors**: Check `api/writable/session/` permissions
- **Upload errors**: Check `api/public/uploads/` permissions
- **Database errors**: Check `api/.env` database settings
- **CORS errors**: Check `FRONTEND_URL` in `api/.env`

## Updating the Application

To update to a new version:

1. **Backup everything**:
   - Database (via phpMyAdmin)
   - Files (via FTP)
   - `.env` files

2. **Upload new package**:
   - Build new version
   - Create new `billingtool.zip`
   - Upload to server

3. **Extract manually**:
   - Extract zip via cPanel File Manager
   - Or use FTP to upload individual files

4. **Restore configuration**:
   - Keep your existing `.env` files
   - Run any new migrations if needed

5. **Test thoroughly**

## License

This installer is part of the BillingTool application.

## Credits

Created for easy deployment to shared hosting environments.

---

**Need more help?** See `SHARED_HOSTING_DEPLOYMENT.md` for detailed instructions.
