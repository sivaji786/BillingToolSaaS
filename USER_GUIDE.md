# SaaS Billing Tool - Complete User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Admin Portal Features](#admin-portal-features)
4. [Package Management](#package-management)
5. [User Management](#user-management)
6. [Billing & Revenue](#billing--revenue)
7. [Usage Analytics](#usage-analytics)
8. [Settings](#settings)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

The SaaS Billing Tool is a comprehensive admin portal for managing your SaaS platform. It provides tools for package management, user administration, billing tracking, and usage analytics.

### Key Features
- 📦 **Package Management** - Create and manage subscription tiers
- 👥 **User Administration** - Monitor and manage customer accounts
- 💰 **Billing Tracking** - Track revenue and invoices
- 📊 **Usage Analytics** - Monitor platform usage and metrics
- ⚙️ **Settings** - Configure platform settings

---

## Getting Started

### System Requirements
- **Frontend**: Node.js 18+ and npm
- **Backend**: PHP 8.1+ with CodeIgniter 4
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

### Installation

#### 1. Backend Setup
```bash
cd api
composer install
cp env .env
# Configure database in .env file
php spark migrate
php spark serve
```

#### 2. Frontend Setup
```bash
npm install
npm run dev
```

### First Login

1. Navigate to `http://localhost:3000/#/SALogin`
2. **Default Credentials:**
   - Email: `admin@example.com`
   - Password: `admin123`
3. Click "Sign In"

> ⚠️ **Important**: Change the default password immediately after first login!

---

## Admin Portal Features

### Dashboard Overview

The dashboard provides a quick overview of your platform:

- **Total Users** - Current number of registered users
- **Active Subscriptions** - Number of paying customers
- **Monthly Revenue** - Current month's revenue
- **API Calls** - Total API usage across all users

#### Key Metrics Cards
- Total Revenue (all-time)
- New Users This Month
- Churn Rate
- Average Revenue Per User (ARPU)

---

## Package Management

### Viewing Packages

1. Click **"Packages"** in the sidebar
2. View all available subscription tiers
3. Use the search bar to filter packages
4. Each package card shows:
   - Package name and description
   - Monthly price
   - Feature list
   - Status (Active/Inactive)

### Creating a New Package

1. Click **"Add Package"** button
2. Fill in the package details:
   - **Name**: Package tier name (e.g., "Professional")
   - **Description**: Brief description of the package
   - **Price**: Monthly price in USD
   - **Currency**: USD (default)
   - **Duration**: Monthly/Yearly
   - **Status**: Active/Inactive

3. Add **Features**:
   - **Storage**: e.g., "50GB"
   - **Users**: e.g., "5 users"
   - **Bandwidth**: e.g., "500GB/month"
   - Add custom features as needed

4. Click **"Create Package"**

### Editing a Package

1. Find the package in the list
2. Click the **"Edit"** button
3. Modify the details
4. Click **"Update Package"**

### Deleting a Package

1. Find the package in the list
2. Click the **"Delete"** button
3. Confirm the deletion

> ⚠️ **Warning**: Deleting a package will affect users currently subscribed to it. Consider marking it as "Inactive" instead.

---

## User Management

### Viewing Users

1. Click **"Users"** in the sidebar
2. View all registered users in a table format
3. **Filter Options**:
   - Search by name or email
   - Filter by status (Active/Suspended/Inactive)
   - Sort by name, email, joined date, or last login

### User Details

Click the **eye icon** (👁️) on any user to view:

#### Basic Information
- Name and email
- Account status
- Join date

#### Subscription Details
- Current package
- Subscription start date
- Next billing date
- Monthly amount

#### Payment Information
- Payment method
- Billing email
- Auto-renewal status

#### Invoice History
- Past invoices with dates and amounts
- Payment status (Paid/Overdue)
- Download individual invoices

#### Usage Statistics
- Storage used vs. limit
- API calls this month
- Bandwidth consumed
- Usage trend charts

### User Actions

#### Send Payment Reminder
1. Open user details
2. Click **"Send Reminder"** button
3. Confirmation toast will appear

#### Suspend User
1. Open user details
2. Click **"Suspend"** button
3. User account will be suspended immediately
4. User won't be able to access the platform

#### Activate User
1. Open suspended user details
2. Click **"Activate"** button
3. User account will be reactivated

### Exporting User Data

1. Go to Users page
2. Click **"Export CSV"** button
3. CSV file will download with all user data

---

## Billing & Revenue

### Viewing Billing Data

1. Click **"Billing"** in the sidebar
2. View billing overview with:
   - Total invoices
   - Paid invoices
   - Pending payments
   - Overdue invoices

### Invoice Management

#### Invoice List
- View all invoices in chronological order
- Filter by status (Paid/Pending/Overdue)
- Search by invoice ID or customer

#### Invoice Details
- Customer information
- Invoice date and due date
- Line items and amounts
- Payment status
- Download PDF invoice

### Revenue Analytics

View revenue trends:
- Monthly revenue chart
- Revenue by package type
- Payment success rate
- Revenue forecasts

---

## Usage Analytics

### Platform Usage Overview

1. Click **"Usage"** in the sidebar
2. View platform-wide metrics:

#### Summary Cards
- **Total Storage Used** - Aggregate across all users
- **API Calls** - Total API requests
- **Bandwidth Used** - Total data transfer
- **Active Sessions** - Current active users

#### Usage Charts
- **Storage Over Time** - Trend of storage consumption
- **API Calls Over Time** - API usage patterns
- **Bandwidth Usage** - Data transfer trends
- **Active Sessions** - Concurrent user activity

### Time Period Filters
- Daily view
- Weekly view
- Monthly view
- Yearly view

### Exporting Usage Data

1. Click **"Export to CSV"** button
2. Select time period
3. Download usage report

---

## Settings

### General Settings

1. Click **"Settings"** in the sidebar
2. Configure platform settings:

#### Platform Configuration
- Platform name
- Support email
- Default currency
- Time zone

#### Email Settings
- SMTP configuration
- Email templates
- Notification preferences

#### Payment Settings
- Payment gateway configuration
- Supported payment methods
- Tax settings

### Admin Account Settings

- Update admin profile
- Change password
- Two-factor authentication
- Session timeout settings

---

## Troubleshooting

### Common Issues

#### Cannot Login
**Problem**: Invalid credentials error  
**Solution**:
1. Verify email and password
2. Check caps lock is off
3. Try password reset if available
4. Contact system administrator

#### CORS Errors
**Problem**: API requests blocked by CORS  
**Solution**:
1. Ensure backend server is running (`php spark serve`)
2. Check API URL in frontend configuration
3. Verify CORS filter is enabled in backend

#### Data Not Loading
**Problem**: Empty tables or missing data  
**Solution**:
1. Check browser console for errors
2. Verify backend API is responding
3. Check network tab for failed requests
4. Clear browser cache and reload

#### Package/User Actions Not Working
**Problem**: Create/Update/Delete operations fail  
**Solution**:
1. Check form validation errors
2. Verify all required fields are filled
3. Check backend logs for errors
4. Ensure proper authentication

### Getting Help

#### Support Resources
- **Documentation**: This user guide
- **API Documentation**: `/api/docs` (if available)
- **GitHub Issues**: Report bugs and feature requests
- **Email Support**: admin@example.com

#### Debug Mode

Enable debug mode for troubleshooting:

**Frontend**:
```bash
# Check browser console (F12)
# Look for error messages and network requests
```

**Backend**:
```bash
# Check CodeIgniter logs
tail -f api/writable/logs/log-*.log
```

---

## Best Practices

### Security
- ✅ Change default admin password immediately
- ✅ Use strong, unique passwords
- ✅ Enable two-factor authentication
- ✅ Regularly review user access
- ✅ Monitor suspicious activity

### Package Management
- ✅ Create clear, descriptive package names
- ✅ Set realistic usage limits
- ✅ Test packages before making them active
- ✅ Deprecate old packages instead of deleting
- ✅ Communicate changes to affected users

### User Management
- ✅ Respond to payment issues promptly
- ✅ Send reminders before suspending accounts
- ✅ Keep user data up to date
- ✅ Monitor usage patterns for anomalies
- ✅ Export user data regularly for backups

### Billing
- ✅ Reconcile revenue reports monthly
- ✅ Follow up on overdue invoices
- ✅ Maintain clear payment records
- ✅ Automate payment reminders
- ✅ Provide clear invoice details

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Esc` | Close modal/dialog |
| `Ctrl/Cmd + S` | Save form (when editing) |
| `Ctrl/Cmd + /` | Show keyboard shortcuts |

---

## API Integration

### Authentication

All API requests require authentication:

```bash
# Login to get token
curl -X POST http://localhost:8080/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Use token in subsequent requests
curl -X GET http://localhost:8080/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Available Endpoints

#### Packages
- `GET /admin/packages` - List all packages
- `GET /admin/packages/:id` - Get package details
- `POST /admin/packages` - Create package
- `PUT /admin/packages/:id` - Update package
- `DELETE /admin/packages/:id` - Delete package

#### Users
- `GET /admin/users` - List all users
- `GET /admin/users/:id` - Get user details
- `POST /admin/users/:id/suspend` - Suspend user
- `POST /admin/users/:id/activate` - Activate user
- `GET /admin/users/export` - Export users CSV

#### Analytics
- `GET /admin/analytics/dashboard` - Dashboard stats
- `GET /admin/usage` - Usage metrics
- `GET /admin/usage/export` - Export usage CSV

#### Billing
- `GET /admin/billing` - List invoices
- `GET /admin/billing/revenue` - Revenue data

---

## Glossary

- **ARPU**: Average Revenue Per User
- **Churn Rate**: Percentage of users who cancel subscriptions
- **MRR**: Monthly Recurring Revenue
- **Package**: Subscription tier or plan
- **Subdomain**: Custom domain for each user
- **Usage Limit**: Maximum allowed resource consumption
- **Active Subscription**: Currently paying customer

---

## Version History

### v1.0.0 (Current)
- Initial release
- Package management
- User administration
- Billing tracking
- Usage analytics
- Admin settings

---

## Contact & Support

For additional help or feature requests:
- **Email**: support@example.com
- **Documentation**: https://docs.example.com
- **GitHub**: https://github.com/sivaji786/BillingToolSaaS

---

**Last Updated**: January 19, 2026  
**Version**: 1.0.0
