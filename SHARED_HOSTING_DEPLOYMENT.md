# BillingTool - Shared Hosting Deployment Guide

This guide will help you deploy the BillingTool application to a shared hosting environment using the PHP installer.

## 📋 Prerequisites

### Hosting Requirements
- **PHP**: 8.1 or higher
- **MySQL/MariaDB**: 5.7 or higher
- **PHP Extensions**: mysqli, zip, json, mbstring, curl
- **File Upload Limit**: At least 50MB
- **Access**: FTP/SFTP and phpMyAdmin

### Before You Start
1. Access to cPanel or hosting control panel
2. FTP client (FileZilla, WinSCP, etc.)
3. Database created in phpMyAdmin
4. Your domain pointing to the hosting

---

## 🎯 Step 1: Build the Production Frontend

Before creating the zip file, you need to build the React frontend for production.

### 1.1 Build the Frontend

```bash
# Navigate to the project directory
cd /home/sivaji/Downloads/BillingTool

# Install dependencies (if not already installed)
npm install

# Build for production
npm run build
```

This will create a `dist` folder with the optimized production build.

---

## 📦 Step 2: Prepare the Deployment Package

### 2.1 Create the Zip File

You need to create a zip file named `billingtool.zip` containing:
- The built frontend files (from `dist` folder)
- The API backend (from `api` folder)

Run the following commands:

```bash
# Navigate to the project directory
cd /home/sivaji/Downloads/BillingTool

# Create a temporary directory for packaging
mkdir -p /tmp/billingtool-package

# Copy the built frontend files
cp -r dist/* /tmp/billingtool-package/

# Copy the API folder
cp -r api /tmp/billingtool-package/

# Copy necessary files
cp .env.production /tmp/billingtool-package/
cp .env.example /tmp/billingtool-package/

# Create the zip file
cd /tmp/billingtool-package
zip -r /home/sivaji/Downloads/BillingTool/billingtool.zip .

# Clean up
rm -rf /tmp/billingtool-package

# Verify the zip was created
ls -lh /home/sivaji/Downloads/BillingTool/billingtool.zip
```

### 2.2 Alternative: Manual Zip Creation

If you prefer to create the zip manually:

1. Create a new folder called `billingtool-package`
2. Copy all files from the `dist` folder into it
3. Copy the entire `api` folder into it
4. Copy `.env.production` into it
5. Right-click and compress to `billingtool.zip`

### 2.3 Verify Zip Contents

Your `billingtool.zip` should contain:
```
billingtool.zip
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── api/
│   ├── app/
│   ├── public/
│   ├── vendor/
│   ├── writable/
│   ├── composer.json
│   ├── spark
│   └── ...
└── .env.production
```

---

## 🗄️ Step 3: Prepare the Database

### 3.1 Create Database in phpMyAdmin

1. Log in to your hosting control panel (cPanel)
2. Open **phpMyAdmin**
3. Click **"Databases"** tab
4. Create a new database:
   - Database name: `your_database_name` (e.g., `billingtool_db`)
   - Collation: `utf8mb4_unicode_ci`
5. Create a database user:
   - Username: `your_db_user`
   - Password: `strong_password_here`
6. Grant all privileges to the user for this database

**Note down these credentials - you'll need them during installation!**

---

## 📤 Step 4: Upload Files to Hosting

### 4.1 Connect via FTP

1. Open your FTP client (FileZilla, WinSCP, etc.)
2. Connect to your hosting:
   - Host: `ftp.yourdomain.com` or IP address
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (or 22 for SFTP)

### 4.2 Upload Files

Upload these two files to your public_html (or www, htdocs) directory:

1. **billingtool.zip** - The application package
2. **installer.php** - The installer script

```
public_html/
├── billingtool.zip
└── installer.php
```

### 4.3 Set Permissions

Ensure the following permissions:
- `installer.php`: 644
- `billingtool.zip`: 644

---

## 🚀 Step 5: Run the Installer

### 5.1 Access the Installer

Open your web browser and navigate to:
```
https://yourdomain.com/installer.php
```

### 5.2 Fill in the Installation Form

The installer will present a form with the following fields:

#### Application URLs
- **Site URL**: `https://yourdomain.com`
  - Your main domain (no trailing slash)
  
- **API URL**: `https://yourdomain.com/api/public`
  - The API endpoint path

#### Database Configuration
- **Database Host**: `localhost` (usually for shared hosting)
- **Database Name**: The database you created in Step 3
- **Database Username**: The database user you created
- **Database Password**: The database password
- **Database Port**: `3306` (default MySQL port)

### 5.3 Submit and Install

1. Click **"Install BillingTool"** button
2. The installer will:
   - ✅ Test database connection
   - ✅ Extract the zip file
   - ✅ Create environment configuration files
   - ✅ Run database migrations
   - ✅ Set file permissions
   - ✅ Create .htaccess files

### 5.4 Installation Complete

Once successful, you'll see a success page with:
- Your application URLs
- Next steps
- Security recommendations

---

## 🔒 Step 6: Post-Installation Security

### 6.1 Delete Installer Files

**IMPORTANT**: Immediately delete these files via FTP:
- `installer.php`
- `billingtool.zip`
- `.installed` (optional, but recommended after verification)

### 6.2 Verify File Structure

Your hosting directory should now look like:
```
public_html/
├── index.html
├── assets/
├── api/
│   ├── public/
│   │   ├── index.php
│   │   └── .htaccess
│   ├── app/
│   ├── writable/
│   └── .env
├── .htaccess
└── .env.production
```

### 6.3 Verify Permissions

Ensure these directories are writable (755):
- `api/writable/`
- `api/writable/cache/`
- `api/writable/logs/`
- `api/writable/session/`
- `api/writable/uploads/`
- `api/public/uploads/`

---

## ✅ Step 7: Test Your Installation

### 7.1 Test Frontend

Visit: `https://yourdomain.com`

You should see the BillingTool login page.

### 7.2 Test API

Visit: `https://yourdomain.com/api/public/index.php`

You should see a CodeIgniter welcome page or API response.

### 7.3 Test Login

Try logging in with your credentials. If you haven't seeded data, you may need to create an admin user manually via phpMyAdmin.

---

## 🛠️ Troubleshooting

### Issue: "500 Internal Server Error"

**Solution**:
1. Check `.htaccess` files are present
2. Verify PHP version is 8.1+
3. Check error logs in `api/writable/logs/`
4. Ensure `mod_rewrite` is enabled

### Issue: "Database connection failed"

**Solution**:
1. Verify database credentials in `api/.env`
2. Check if database exists in phpMyAdmin
3. Ensure database user has proper privileges
4. Try `127.0.0.1` instead of `localhost` for host

### Issue: "404 Not Found" for API requests

**Solution**:
1. Check `.htaccess` in root directory
2. Check `.htaccess` in `api/public/` directory
3. Verify `mod_rewrite` is enabled
4. Update API URL in `.env.production`

### Issue: Frontend shows blank page

**Solution**:
1. Check browser console for errors
2. Verify `VITE_API_BASE_URL` in `.env.production`
3. Check if `index.html` exists in root
4. Verify assets folder is present

### Issue: File upload errors

**Solution**:
1. Check permissions on `api/writable/uploads/`
2. Check permissions on `api/public/uploads/`
3. Verify PHP `upload_max_filesize` setting
4. Check disk space on hosting

### Issue: Session errors

**Solution**:
1. Check permissions on `api/writable/session/`
2. Verify `session.savePath` in `api/.env`
3. Check PHP session configuration

---

## 📝 Default Admin User

If you need to create a default admin user manually:

1. Open phpMyAdmin
2. Navigate to your database
3. Open the `users` table
4. Insert a new row with:
   ```sql
   INSERT INTO users (username, email, password, role, created_at, updated_at)
   VALUES (
       'admin',
       'admin@yourdomain.com',
       '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
       'admin',
       NOW(),
       NOW()
   );
   ```

**Default Password**: `password` (Change immediately after first login!)

---

## 🔄 Updating the Application

To update your application:

1. Build the new version locally
2. Create a new `billingtool.zip`
3. Backup your current `.env` files
4. Backup your database
5. Upload and extract the new zip
6. Restore your `.env` files
7. Run any new migrations if needed

---

## 📞 Support

If you encounter issues:

1. Check the `api/writable/logs/` directory for error logs
2. Enable debug mode temporarily by setting `CI_ENVIRONMENT = development` in `api/.env`
3. Check browser console for frontend errors
4. Verify all file permissions
5. Contact your hosting provider for server-specific issues

---

## 🎉 Congratulations!

Your BillingTool application is now deployed and ready to use on shared hosting!

**Remember to**:
- Change default passwords
- Set up regular database backups
- Monitor error logs
- Keep the application updated
- Use HTTPS (SSL certificate)

---

## 📋 Quick Reference

### Important Files
- **Frontend Config**: `.env.production`
- **API Config**: `api/.env`
- **Root Routing**: `.htaccess`
- **API Routing**: `api/public/.htaccess`
- **Error Logs**: `api/writable/logs/`

### Important URLs
- **Frontend**: `https://yourdomain.com`
- **API**: `https://yourdomain.com/api/public/index.php`
- **Uploads**: `https://yourdomain.com/api/public/uploads/`

### Important Directories
- **Frontend Assets**: `/assets/`
- **API Code**: `/api/app/`
- **Uploads**: `/api/public/uploads/`
- **Logs**: `/api/writable/logs/`
- **Cache**: `/api/writable/cache/`
