# Quick Deployment Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Create the Deployment Package
```bash
cd /home/sivaji/Downloads/BillingTool
./create-deployment-package.sh
```

This will:
- Build the frontend
- Package everything into `billingtool.zip`
- Clean up temporary files

### Step 2: Upload to Hosting

Upload these 2 files via FTP to your `public_html` folder:
1. `billingtool.zip`
2. `installer.php`

### Step 3: Run the Installer

1. Visit: `https://yourdomain.com/installer.php`
2. Fill in the form with:
   - **Site URL**: `https://yourdomain.com`
   - **API URL**: `https://yourdomain.com/api/public`
   - **Database details** (from phpMyAdmin)
3. Click "Install BillingTool"
4. **Delete** `installer.php` and `billingtool.zip` after installation

---

## 📋 Pre-Installation Checklist

- [ ] PHP 8.1+ on hosting
- [ ] MySQL database created in phpMyAdmin
- [ ] Database user created with all privileges
- [ ] FTP credentials ready
- [ ] Domain pointing to hosting

---

## 🗄️ Database Setup (phpMyAdmin)

1. Login to phpMyAdmin
2. Create new database: `billingtool_db`
3. **Import the schema:**
   - Click on the database name
   - Go to "Import" tab
   - Choose file: `database/schema.sql` (extract from billingtool.zip first)
   - Click "Go" to import
4. Create new user with password
5. Grant all privileges to the user
6. Note down: database name, username, password

---

## 📤 Files to Upload

```
public_html/
├── billingtool.zip    (the package)
└── installer.php      (the installer)
```

---

## ⚙️ Installer Form Fields

| Field | Example Value |
|-------|---------------|
| Site URL | `https://yourdomain.com` |
| API URL | `https://yourdomain.com/api/public` |
| Database Host | `localhost` |
| Database Name | `billingtool_db` |
| Database Username | `your_db_user` |
| Database Password | `your_db_password` |
| Database Port | `3306` |

---

## ✅ Post-Installation

1. **Delete installer files**:
   - `installer.php`
   - `billingtool.zip`

2. **Test your site**:
   - Frontend: `https://yourdomain.com`
   - API: `https://yourdomain.com/api/public/index.php`

3. **Change default passwords**

---

## 🛠️ Troubleshooting

### 500 Error
- Check `.htaccess` files exist
- Verify PHP version is 8.1+
- Check error logs in `api/writable/logs/`

### Database Connection Failed
- Verify credentials in installer form
- Check database exists in phpMyAdmin
- Try `127.0.0.1` instead of `localhost`

### 404 for API
- Check `.htaccess` in `api/public/`
- Verify mod_rewrite is enabled
- Contact hosting support

### Blank Page
- Check browser console for errors
- Verify `index.html` exists in root
- Check if assets folder is present

---

## 📞 Need Help?

See detailed guide: `SHARED_HOSTING_DEPLOYMENT.md`

---

## 🔄 Manual Package Creation (Alternative)

If the script doesn't work:

```bash
# Build frontend
npm run build

# Create package directory
mkdir /tmp/billingtool-package
cp -r dist/* /tmp/billingtool-package/
cp -r api /tmp/billingtool-package/

# Create zip
cd /tmp/billingtool-package
zip -r ~/Downloads/BillingTool/billingtool.zip .
```

---

## 📁 Final Hosting Structure

After installation:
```
public_html/
├── index.html
├── assets/
├── api/
│   ├── public/
│   │   ├── index.php
│   │   └── .htaccess
│   └── .env
└── .htaccess
```

---

**That's it! Your BillingTool is now live! 🎉**
