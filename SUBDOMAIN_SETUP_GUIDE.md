# Auto-Creating Subdomains for SaaS Application

## Overview

There are **two main approaches** to handle subdomains for a multi-tenant SaaS application:

1. **Wildcard DNS + Web Server Configuration** (Recommended)
2. **Dynamic DNS API** (Advanced, for custom domains)

For BillingTool, we'll use **Approach 1** which is simpler, faster, and more cost-effective.

---

## Approach 1: Wildcard DNS (Recommended)

### How It Works

Instead of creating individual DNS records for each subdomain, you create ONE wildcard DNS record that catches ALL subdomains automatically.

**Example:**
- You set up: `*.billingtool.com` → Your server IP
- Automatically works for:
  - `acme.billingtool.com`
  - `demo.billingtool.com`
  - `startup123.billingtool.com`
  - ANY subdomain!

### Step-by-Step Implementation

#### Step 1: Configure Wildcard DNS

**Option A: Using CloudFlare (Recommended)**

1. Log in to CloudFlare
2. Go to DNS settings for `billingtool.com`
3. Add an A record:
   ```
   Type: A
   Name: *
   IPv4 address: YOUR_SERVER_IP (e.g., 123.45.67.89)
   Proxy status: Proxied (orange cloud) ✅
   TTL: Auto
   ```

**Option B: Using Other DNS Providers**

For DigitalOcean, Namecheap, GoDaddy, etc.:
```
Type: A
Host: *
Value: YOUR_SERVER_IP
TTL: 3600
```

**Verification:**
```bash
# Test that wildcard DNS works
dig acme.billingtool.com
dig test123.billingtool.com
dig anything.billingtool.com

# All should resolve to your server IP
```

---

#### Step 2: Configure Web Server

**Option A: Nginx Configuration (Recommended)**

Create `/etc/nginx/sites-available/billingtool-saas`:

```nginx
# Main domain (marketing site)
server {
    listen 80;
    listen [::]:80;
    server_name billingtool.com www.billingtool.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name billingtool.com www.billingtool.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/billingtool.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billingtool.com/privkey.pem;
    
    root /var/www/billingtool/marketing;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}

# Wildcard subdomains (SaaS app)
server {
    listen 80;
    listen [::]:80;
    server_name *.billingtool.com;
    
    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name *.billingtool.com;
    
    # Wildcard SSL certificate
    ssl_certificate /etc/letsencrypt/live/billingtool.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billingtool.com/privkey.pem;
    
    root /var/www/billingtool/app/build;
    index index.html;
    
    # Frontend (React app)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable the configuration:**
```bash
sudo ln -s /etc/nginx/sites-available/billingtool-saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Option B: Apache Configuration**

Create `/etc/apache2/sites-available/billingtool-saas.conf`:

```apache
<VirtualHost *:80>
    ServerName billingtool.com
    ServerAlias *.billingtool.com
    
    DocumentRoot /var/www/billingtool/app/build
    
    <Directory /var/www/billingtool/app/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Proxy API requests
    ProxyPass /api http://localhost:8080/api
    ProxyPassReverse /api http://localhost:8080/api
    
    # Redirect to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName billingtool.com
    ServerAlias *.billingtool.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/billingtool.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/billingtool.com/privkey.pem
    
    DocumentRoot /var/www/billingtool/app/build
    
    <Directory /var/www/billingtool/app/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ProxyPass /api http://localhost:8080/api
    ProxyPassReverse /api http://localhost:8080/api
</VirtualHost>
```

**Enable:**
```bash
sudo a2enmod proxy proxy_http ssl rewrite
sudo a2ensite billingtool-saas
sudo systemctl reload apache2
```

---

#### Step 3: Get Wildcard SSL Certificate

**Using Let's Encrypt (Free):**

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get wildcard certificate (requires DNS validation)
sudo certbot certonly --manual --preferred-challenges dns \
  -d billingtool.com -d *.billingtool.com

# Follow the prompts to add TXT records to your DNS
# Add these to CloudFlare/your DNS provider:
# Type: TXT
# Name: _acme-challenge
# Value: (provided by certbot)

# After DNS propagation, press Enter to complete

# Auto-renewal
sudo certbot renew --dry-run
```

**Using CloudFlare (Easier):**

```bash
# Install CloudFlare plugin
sudo apt-get install python3-certbot-dns-cloudflare

# Create CloudFlare API token file
sudo nano /etc/letsencrypt/cloudflare.ini
# Add:
# dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN

sudo chmod 600 /etc/letsencrypt/cloudflare.ini

# Get certificate
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d billingtool.com -d *.billingtool.com

# Auto-renewal works automatically
```

---

#### Step 4: Backend Tenant Detection

**CodeIgniter 4 Implementation:**

```php
// api/app/Filters/TenantFilter.php
namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Models\TenantModel;

class TenantFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Get the full host
        $host = $request->getUri()->getHost();
        
        // Extract subdomain
        $subdomain = $this->extractSubdomain($host);
        
        // Skip for main domain
        if (in_array($subdomain, ['www', 'billingtool', ''])) {
            return; // Main marketing site
        }
        
        // Find tenant by subdomain
        $tenantModel = new TenantModel();
        $tenant = $tenantModel
            ->where('subdomain', $subdomain)
            ->where('status', 'active')
            ->first();
        
        if (!$tenant) {
            return Services::response()
                ->setJSON([
                    'error' => 'Tenant not found',
                    'subdomain' => $subdomain,
                    'message' => 'This account does not exist or has been suspended.'
                ])
                ->setStatusCode(404);
        }
        
        // Check if subscription is active
        if (!$this->hasActiveSubscription($tenant)) {
            return Services::response()
                ->setJSON([
                    'error' => 'Subscription inactive',
                    'message' => 'Please update your billing information.'
                ])
                ->setStatusCode(402); // Payment Required
        }
        
        // Store tenant in config for global access
        config('App')->currentTenant = $tenant;
        $request->tenant = $tenant;
        
        return null;
    }
    
    private function extractSubdomain(string $host): string
    {
        // Remove port if present
        $host = explode(':', $host)[0];
        
        // Split by dots
        $parts = explode('.', $host);
        
        // For localhost/IP testing
        if (count($parts) === 1 || filter_var($host, FILTER_VALIDATE_IP)) {
            return 'demo'; // Default for local development
        }
        
        // For billingtool.com -> subdomain.billingtool.com
        if (count($parts) >= 3) {
            return $parts[0]; // Return first part (subdomain)
        }
        
        return '';
    }
    
    private function hasActiveSubscription($tenant): bool
    {
        $subscriptionModel = new \App\Models\SubscriptionModel();
        $subscription = $subscriptionModel
            ->where('tenant_id', $tenant['id'])
            ->where('status', 'active')
            ->orWhere('status', 'trialing')
            ->first();
        
        return $subscription !== null;
    }
    
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nothing needed
    }
}
```

---

#### Step 5: Signup Flow (Auto-Create Tenant)

```php
// api/app/Controllers/Onboarding.php
namespace App\Controllers;

use App\Models\TenantModel;
use App\Models\UserModel;
use App\Models\SubscriptionModel;

class Onboarding extends BaseController
{
    public function signup()
    {
        $rules = [
            'company_name' => 'required|min_length[3]|max_length[100]',
            'subdomain' => 'required|min_length[3]|max_length[50]|alpha_dash|is_unique[tenants.subdomain]',
            'email' => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[8]',
        ];
        
        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }
        
        $db = \Config\Database::connect();
        $db->transStart();
        
        try {
            // 1. Create tenant
            $tenantModel = new TenantModel();
            $tenantId = $tenantModel->insert([
                'company_name' => $this->request->getPost('company_name'),
                'subdomain' => strtolower($this->request->getPost('subdomain')),
                'plan_id' => 1, // Default to Starter plan
                'status' => 'active',
                'trial_ends_at' => date('Y-m-d H:i:s', strtotime('+14 days'))
            ]);
            
            // 2. Create owner user
            $userModel = new UserModel();
            $userId = $userModel->insert([
                'tenant_id' => $tenantId,
                'email' => $this->request->getPost('email'),
                'password' => password_hash($this->request->getPost('password'), PASSWORD_BCRYPT),
                'role' => 'owner',
                'status' => 'active'
            ]);
            
            // 3. Create trial subscription
            $subscriptionModel = new SubscriptionModel();
            $subscriptionModel->insert([
                'tenant_id' => $tenantId,
                'plan_id' => 1,
                'status' => 'trialing',
                'current_period_start' => date('Y-m-d H:i:s'),
                'current_period_end' => date('Y-m-d H:i:s', strtotime('+14 days'))
            ]);
            
            $db->transComplete();
            
            if ($db->transStatus() === false) {
                throw new \Exception('Failed to create account');
            }
            
            // Send welcome email
            $this->sendWelcomeEmail($this->request->getPost('email'), $this->request->getPost('subdomain'));
            
            return $this->respond([
                'success' => true,
                'message' => 'Account created successfully!',
                'subdomain' => $this->request->getPost('subdomain'),
                'redirect_url' => 'https://' . $this->request->getPost('subdomain') . '.billingtool.com'
            ]);
            
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->fail('Failed to create account: ' . $e->getMessage());
        }
    }
    
    public function checkSubdomain()
    {
        $subdomain = $this->request->getGet('subdomain');
        
        // Validate format
        if (!preg_match('/^[a-z0-9-]+$/', $subdomain)) {
            return $this->respond([
                'available' => false,
                'message' => 'Subdomain can only contain lowercase letters, numbers, and hyphens'
            ]);
        }
        
        // Reserved subdomains
        $reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'help', 'support'];
        if (in_array($subdomain, $reserved)) {
            return $this->respond([
                'available' => false,
                'message' => 'This subdomain is reserved'
            ]);
        }
        
        // Check if exists
        $tenantModel = new TenantModel();
        $exists = $tenantModel->where('subdomain', $subdomain)->first();
        
        return $this->respond([
            'available' => !$exists,
            'message' => $exists ? 'This subdomain is already taken' : 'Subdomain is available!'
        ]);
    }
}
```

---

#### Step 6: Frontend Signup Form

```typescript
// src/pages/Signup.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Signup() {
  const [formData, setFormData] = useState({
    company_name: '',
    subdomain: '',
    email: '',
    password: ''
  });
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkSubdomain = async (subdomain: string) => {
    if (subdomain.length < 3) return;
    
    try {
      const response = await api.get(`/onboarding/check-subdomain?subdomain=${subdomain}`);
      setSubdomainAvailable(response.data.available);
    } catch (error) {
      console.error('Error checking subdomain:', error);
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, subdomain: value });
    
    // Debounce check
    setTimeout(() => checkSubdomain(value), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/onboarding/signup', formData);
      
      if (response.data.success) {
        // Redirect to new subdomain
        window.location.href = response.data.redirect_url;
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-600">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">Create Your Account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Choose Your Subdomain</label>
            <div className="flex items-center">
              <input
                type="text"
                value={formData.subdomain}
                onChange={handleSubdomainChange}
                className="flex-1 px-4 py-2 border rounded-l-lg"
                placeholder="yourcompany"
                required
              />
              <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-lg">
                .billingtool.com
              </span>
            </div>
            {subdomainAvailable === true && (
              <p className="text-green-600 text-sm mt-1">✓ Available!</p>
            )}
            {subdomainAvailable === false && (
              <p className="text-red-600 text-sm mt-1">✗ Already taken</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || subdomainAvailable === false}
            className="w-full bg-violet-600 text-white py-3 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Start Free Trial'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          14-day free trial • No credit card required
        </p>
      </div>
    </div>
  );
}
```

---

## Local Development Setup

For testing subdomains locally:

**1. Edit `/etc/hosts`:**
```bash
sudo nano /etc/hosts

# Add these lines:
127.0.0.1 billingtool.local
127.0.0.1 acme.billingtool.local
127.0.0.1 demo.billingtool.local
127.0.0.1 test.billingtool.local
```

**2. Update Nginx config for local:**
```nginx
server {
    listen 80;
    server_name *.billingtool.local;
    
    root /path/to/billingtool/build;
    
    location /api {
        proxy_pass http://localhost:8080;
    }
}
```

**3. Test:**
```
http://acme.billingtool.local
http://demo.billingtool.local
```

---

## Summary

✅ **No need to create subdomains manually!**  
✅ **Wildcard DNS catches ALL subdomains automatically**  
✅ **Web server routes all subdomains to your app**  
✅ **Backend detects tenant from subdomain**  
✅ **Signup creates tenant instantly**  

**The magic:** When a user signs up with subdomain "acme", they can immediately access `acme.billingtool.com` - no DNS changes needed!

---

**Next Steps:**
1. Set up wildcard DNS in CloudFlare
2. Configure Nginx with wildcard SSL
3. Implement TenantFilter in backend
4. Create signup flow
5. Test with multiple subdomains

**Questions? Check the SAAS_CONVERSION_PLAN.md for full implementation details!**
