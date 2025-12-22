# Deployment Guide

## Overview

This billing tool consists of two components:
- **Frontend**: React + Vite application
- **Backend**: CodeIgniter 4 REST API

Both use environment variables for configuration, making it easy to deploy to different environments.

---

## Frontend Deployment

### Environment Configuration

Create a `.env.production` file with your production API URL:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api
```

### Build for Production

```bash
cd /path/to/BillingTool
npm run build
```

This creates a `build/` directory with optimized static files.

### Deployment Options

#### Option 1: Static Hosting (Netlify, Vercel, etc.)

1. Upload the `build/` folder contents
2. Configure environment variable `VITE_API_BASE_URL` in hosting dashboard
3. Set build command: `npm run build`
4. Set publish directory: `build`

#### Option 2: Traditional Web Server (Apache/Nginx)

1. Copy `build/` contents to web root
2. Configure web server for SPA routing:

**Apache (.htaccess)**:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Nginx**:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## Backend Deployment

### Environment Configuration

1. Copy `.env.production.example` to `.env`:
```bash
cp .env.production.example .env
```

2. Update `.env` with your values:
```env
# Environment
CI_ENVIRONMENT = production

# Frontend URL for CORS (your frontend domain)
FRONTEND_URL = https://your-domain.com

# Backend base URL
app.baseURL = https://api.your-domain.com/

# Database credentials
database.default.hostname = your-db-host
database.default.database = billing_tool
database.default.username = your-db-user
database.default.password = your-secure-password

# Generate secure keys
encryption.key = your-encryption-key
JWT_SECRET = your-jwt-secret
```

### Generate Secure Keys

```bash
# In the api directory
php spark key:generate
```

### Database Setup

```bash
# Run migrations
php spark migrate

# Optional: Run seeders for demo data
php spark db:seed DatabaseSeeder
```

### Deployment Options

#### Option 1: Shared Hosting with cPanel

1. Upload `api/` folder to your hosting
2. Point domain to `api/public/` directory
3. Update `.env` with database credentials from cPanel
4. Ensure PHP 7.4+ is installed
5. Enable required PHP extensions: `intl`, `mbstring`, `mysqli`

#### Option 2: VPS/Cloud Server

1. Install PHP 7.4+ with required extensions
2. Install Composer
3. Upload `api/` folder
4. Run `composer install --no-dev`
5. Set document root to `api/public/`
6. Configure web server:

**Apache (VirtualHost)**:
```apache
<VirtualHost *:80>
    ServerName api.your-domain.com
    DocumentRoot /var/www/billing-tool/api/public
    
    <Directory /var/www/billing-tool/api/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

**Nginx**:
```nginx
server {
    listen 80;
    server_name api.your-domain.com;
    root /var/www/billing-tool/api/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
    }
}
```

---

## Production Checklist

### Security

- [ ] Set `CI_ENVIRONMENT = production` in backend `.env`
- [ ] Generate and use secure `JWT_SECRET`
- [ ] Generate and use secure `encryption.key`
- [ ] Use strong database passwords
- [ ] Enable HTTPS for both frontend and backend
- [ ] Set `app.forceGlobalSecureRequests = true`
- [ ] Update CORS `FRONTEND_URL` to match your frontend domain
- [ ] Remove example `.env` files from production

### Performance

- [ ] Run `npm run build` for optimized frontend bundle
- [ ] Enable Gzip/Brotli compression on web server
- [ ] Configure caching headers for static assets
- [ ] Optimize database queries and add indexes
- [ ] Set `logger.threshold = 1` (errors only)

### Testing

- [ ] Test frontend can connect to backend API
- [ ] Verify CORS allows your frontend domain
- [ ] Test authentication flow
- [ ] Create test invoice and verify all features
- [ ] Check error logging is working
- [ ] Test on different browsers

---

## Environment Variables Reference

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://api.example.com/api` |

### Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `CI_ENVIRONMENT` | Environment mode | `production` |
| `FRONTEND_URL` | Frontend domain(s) for CORS | `https://example.com` |
| `app.baseURL` | Backend base URL | `https://api.example.com/` |
| `database.default.*` | Database configuration | See `.env` file |
| `encryption.key` | Encryption key | Generated via `php spark key:generate` |
| `JWT_SECRET` | JWT signing secret | Secure random string |

---

## Common Deployment Scenarios

### Scenario 1: Same Domain

Frontend: `https://example.com`  
Backend: `https://example.com/api`

**Frontend `.env.production`**:
```env
VITE_API_BASE_URL=https://example.com/backend/api
```

**Backend `.env`**:
```env
FRONTEND_URL=https://example.com
app.baseURL=https://example.com/backend/
```

### Scenario 2: Subdomains

Frontend: `https://app.example.com`  
Backend: `https://api.example.com`

**Frontend `.env.production`**:
```env
VITE_API_BASE_URL=https://api.example.com/api
```

**Backend `.env`**:
```env
FRONTEND_URL=https://app.example.com
app.baseURL=https://api.example.com/
```

### Scenario 3: Separate Domains

Frontend: `https://billing.company.com`  
Backend: `https://api.billing-service.com`

**Frontend `.env.production`**:
```env
VITE_API_BASE_URL=https://api.billing-service.com/api
```

**Backend `.env`**:
```env
FRONTEND_URL=https://billing.company.com
app.baseURL=https://api.billing-service.com/
```

---

## Troubleshooting

### CORS Errors

If you see CORS errors in browser console:
1. Verify `FRONTEND_URL` in backend `.env` matches your frontend domain
2. Check there are no trailing slashes in URLs
3. Restart backend server after changing `.env`
4. Check browser DevTools Network tab for specific error

### API Connection Fails

1. Verify `.env` files exist and have correct URLs
2. Check `VITE_API_BASE_URL` doesn't have trailing slash
3. Test API directly: `curl https://api.your-domain.com/api/invoices`
4. Check web server error logs

### Build Issues

1. Run `npm install` to ensure all dependencies are installed
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Clear Vite cache: `rm -rf node_modules/.vite`

---

## Support

For issues or questions:
1. Check this deployment guide
2. Review environment variable configuration
3. Check web server and application logs
4. Verify database connectivity
