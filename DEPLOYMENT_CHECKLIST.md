# ✅ Deployment Checklist - BillingTool

## 📦 Package Ready!

Your deployment package has been successfully created:
- **File**: `billingtool.zip` (44 MB)
- **Installer**: `installer.php` (26 KB)
- **Location**: `/home/sivaji/Downloads/BillingTool/`

---

## 🚀 Deployment Steps

### ☐ Step 1: Prepare Database (5 minutes)

1. Login to your hosting control panel (cPanel)
2. Open **phpMyAdmin**
3. Create a new database:
   - Click "Databases" tab
   - Database name: `billingtool_db` (or your choice)
   - Collation: `utf8mb4_unicode_ci`
   - Click "Create"

4. Create database user:
   - Click "MySQL Databases" in cPanel
   - Create new user with strong password
   - Add user to database
   - Grant **ALL PRIVILEGES**

5. **Import the database schema:**
   - Extract `billingtool.zip` temporarily on your computer
   - Find `database/schema.sql` file
   - In phpMyAdmin, click on your database name
   - Click "Import" tab
   - Choose `schema.sql` file
   - Click "Go" to import
   - Verify tables are created (users, invoices, clients, etc.)

6. **Write down these details** (you'll need them):
   ```
   Database Host: localhost (or 127.0.0.1)
   Database Name: _________________
   Database User: _________________
   Database Password: _________________
   Database Port: 3306
   ```

---

### ☐ Step 2: Upload Files via FTP (5 minutes)

1. Open your FTP client (FileZilla, WinSCP, etc.)

2. Connect to your hosting:
   ```
   Host: ftp.yourdomain.com
   Username: your_ftp_username
   Password: your_ftp_password
   Port: 21 (or 22 for SFTP)
   ```

3. Navigate to `public_html` (or `www`, `htdocs`)

4. Upload these 2 files:
   - ☐ `billingtool.zip` (44 MB)
   - ☐ `installer.php` (26 KB)

5. Verify both files are uploaded successfully

---

### ☐ Step 3: Run the Installer (2 minutes)

1. Open your web browser

2. Navigate to: `https://yourdomain.com/installer.php`
   (Replace `yourdomain.com` with your actual domain)

3. Fill in the installation form:

   **Application URLs:**
   ```
   Site URL: https://yourdomain.com
   API URL:  https://yourdomain.com/api/public
   ```

   **Database Configuration:**
   ```
   Database Host:     localhost
   Database Name:     [from Step 1]
   Database Username: [from Step 1]
   Database Password: [from Step 1]
   Database Port:     3306
   ```

4. Click **"Install BillingTool"** button

5. Wait for installation to complete (30-60 seconds)

6. You should see a success page!

---

### ☐ Step 4: Security & Cleanup (2 minutes)

**CRITICAL - Do this immediately after installation:**

1. Delete these files via FTP:
   - ☐ `installer.php`
   - ☐ `billingtool.zip`

2. Verify they are deleted (refresh FTP)

---

### ☐ Step 5: Test Your Installation (3 minutes)

1. **Test Frontend:**
   - Visit: `https://yourdomain.com`
   - You should see the BillingTool login page
   - ☐ Frontend loads correctly

2. **Test API:**
   - Visit: `https://yourdomain.com/api/public/index.php`
   - You should see a response (not 404)
   - ☐ API is accessible

3. **Test Login:**
   - Username: `admin`
   - Password: `password`
   - ☐ Login successful

---

### ☐ Step 6: Post-Installation Setup (5 minutes)

1. **Change Admin Password:**
   - ☐ Login with default credentials
   - ☐ Go to Settings/Profile
   - ☐ Change password to something secure
   - ☐ Update email address

2. **Update Company Profile:**
   - ☐ Add company name
   - ☐ Add company details
   - ☐ Upload company logo

3. **Test Core Features:**
   - ☐ Create a test client
   - ☐ Create a test invoice
   - ☐ Generate PDF
   - ☐ Test all main features

---

## 🔒 Security Checklist

After installation, ensure:

- ☐ `installer.php` is deleted
- ☐ `billingtool.zip` is deleted
- ☐ Admin password changed from default
- ☐ Admin email updated
- ☐ SSL certificate installed (HTTPS)
- ☐ Regular backups scheduled
- ☐ File permissions are correct (755 for directories)

---

## 📁 Expected File Structure

After installation, your hosting should have:

```
public_html/
├── index.html                 ✓ Frontend entry
├── assets/                    ✓ JS, CSS, images
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── .htaccess                  ✓ Root routing
├── .env.production           ✓ Frontend config
├── database/
│   └── schema.sql            ✓ DB schema (reference)
└── api/
    ├── app/                  ✓ CodeIgniter app
    ├── public/
    │   ├── index.php        ✓ API entry
    │   ├── .htaccess        ✓ API routing
    │   └── uploads/         ✓ Public uploads
    ├── writable/
    │   ├── cache/           ✓ Cache
    │   ├── logs/            ✓ Error logs
    │   ├── session/         ✓ Sessions
    │   └── uploads/         ✓ Private uploads
    ├── vendor/              ✓ Dependencies
    └── .env                 ✓ API config
```

---

## 🛠️ Troubleshooting

### Problem: "Database connection failed"
**Solution:**
- ☐ Verify database exists in phpMyAdmin
- ☐ Check username and password are correct
- ☐ Try `127.0.0.1` instead of `localhost`
- ☐ Ensure user has ALL PRIVILEGES

### Problem: "500 Internal Server Error"
**Solution:**
- ☐ Check if `.htaccess` files exist
- ☐ Verify PHP version is 8.1+ in cPanel
- ☐ Check error logs: `api/writable/logs/`
- ☐ Contact hosting to enable `mod_rewrite`

### Problem: "404 Not Found" for API
**Solution:**
- ☐ Check `.htaccess` in `api/public/` exists
- ☐ Verify mod_rewrite is enabled
- ☐ Test direct: `https://yourdomain.com/api/public/index.php`

### Problem: Blank page on frontend
**Solution:**
- ☐ Open browser console (F12) for errors
- ☐ Check if `index.html` exists in root
- ☐ Verify `assets/` folder is present
- ☐ Check `.env.production` has correct API URL

### Problem: File upload errors
**Solution:**
- ☐ Check permissions: `api/writable/uploads/` (755)
- ☐ Check permissions: `api/public/uploads/` (755)
- ☐ Verify disk space available

---

## 📞 Support Resources

### Error Logs
Check these locations for errors:
- `api/writable/logs/log-YYYY-MM-DD.log`

### Debug Mode (Temporary)
To enable debug mode:
1. Edit `api/.env` via FTP
2. Change `CI_ENVIRONMENT = production` to `development`
3. Check errors
4. **Change back to production when done!**

### Documentation
- `QUICK_DEPLOY.md` - Quick reference
- `SHARED_HOSTING_DEPLOYMENT.md` - Detailed guide
- `INSTALLER_README.md` - Installer docs
- `DEPLOYMENT_SUMMARY.md` - Overview

---

## ✨ Default Credentials

**⚠️ CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!**

```
Username: admin
Password: password
Email:    admin@billingtool.local
```

---

## 🎉 Success Criteria

Your installation is successful when:

- ✅ Frontend loads at `https://yourdomain.com`
- ✅ API responds at `https://yourdomain.com/api/public/index.php`
- ✅ You can login with admin credentials
- ✅ You can create clients and invoices
- ✅ You can generate PDF invoices
- ✅ No errors in browser console
- ✅ No errors in `api/writable/logs/`

---

## 📊 Estimated Time

| Step | Time |
|------|------|
| Database Setup | 5 min |
| File Upload | 5 min |
| Run Installer | 2 min |
| Security Cleanup | 2 min |
| Testing | 3 min |
| Post-Setup | 5 min |
| **Total** | **~20 min** |

---

## 🔄 Future Updates

To update your application:

1. ☐ Backup database via phpMyAdmin
2. ☐ Backup files via FTP
3. ☐ Build new version locally
4. ☐ Create new deployment package
5. ☐ Upload and extract manually
6. ☐ Keep existing `.env` files
7. ☐ Test thoroughly

---

## 📝 Notes

- Keep a copy of your database credentials safe
- Set up automatic daily backups
- Monitor error logs regularly
- Keep PHP and MySQL updated
- Use strong passwords
- Enable HTTPS/SSL

---

**You're ready to deploy! Follow the checklist step by step.** 🚀

**Good luck with your deployment!** 🎉
