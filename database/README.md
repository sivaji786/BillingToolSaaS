# Database Schema Import Instructions

## 📋 Overview

This file (`schema.sql`) contains the complete database structure for BillingTool, including:
- All database tables
- Foreign key relationships
- Default admin user

## ⚠️ IMPORTANT

**You MUST import this schema into your database BEFORE running the installer!**

The installer does NOT create database tables automatically. You need to import this file manually via phpMyAdmin.

---

## 🚀 How to Import

### Step 1: Create Database

1. Login to **phpMyAdmin**
2. Click **"Databases"** tab
3. Create a new database:
   - Name: `billingtool_db` (or your choice)
   - Collation: `utf8mb4_unicode_ci`
4. Click **"Create"**

### Step 2: Import Schema

1. Click on your database name in the left sidebar
2. Click the **"Import"** tab at the top
3. Click **"Choose File"** button
4. Select this `schema.sql` file
5. Scroll down and click **"Go"** button
6. Wait for the import to complete

### Step 3: Verify Import

After import, you should see these tables in your database:
- ✅ `users`
- ✅ `company_profiles`
- ✅ `clients`
- ✅ `invoices`
- ✅ `invoice_items`
- ✅ `invoice_templates`
- ✅ `audit_logs`
- ✅ `tickets`
- ✅ `projects`

### Step 4: Create Database User

1. Go back to cPanel
2. Open **"MySQL Databases"**
3. Create a new user with a strong password
4. Add the user to your database
5. Grant **ALL PRIVILEGES**

---

## 👤 Default Admin User

The schema includes a default admin user:

```
Username: admin
Password: password
Email:    admin@billingtool.local
```

**⚠️ IMPORTANT:** Change this password immediately after first login!

---

## 🔧 What's Included

### Tables Created:

1. **users** - User accounts and authentication
2. **company_profiles** - Company information and branding
3. **clients** - Customer/client records
4. **invoices** - Invoice headers and metadata
5. **invoice_items** - Line items for invoices
6. **invoice_templates** - Custom invoice templates
7. **audit_logs** - System activity logging
8. **tickets** - Support ticket system
9. **projects** - Project management (for ticketing)

### Relationships:

- Foreign keys are properly set up
- Cascading deletes where appropriate
- Referential integrity enforced

---

## 🛠️ Troubleshooting

### Error: "Table already exists"

**Solution:** 
- Drop all existing tables first, or
- Use a fresh database

### Error: "Access denied"

**Solution:**
- Ensure you're logged in as database admin
- Check user has import privileges

### Error: "Unknown collation"

**Solution:**
- Your MySQL version might be old
- Try changing collation to `utf8_general_ci`

### Import takes too long

**Solution:**
- This is normal for large schemas
- Wait for completion (usually 10-30 seconds)
- Don't close the browser

---

## ✅ Next Steps

After successfully importing the schema:

1. ✅ Verify all tables are created
2. ✅ Note down your database credentials
3. ✅ Upload `billingtool.zip` and `installer.php` to your hosting
4. ✅ Run the installer at `https://yourdomain.com/installer.php`

---

## 📝 Notes

- This schema uses `utf8mb4_unicode_ci` collation for full Unicode support
- All tables use InnoDB engine for transaction support
- Timestamps are automatically managed by the application
- The default admin password is hashed using bcrypt

---

## 🔒 Security

- The default admin password is **"password"** (hashed)
- **Change it immediately** after installation
- Never use default credentials in production
- Keep regular database backups

---

**Ready to proceed? Import this schema and continue with the installation!** 🚀
