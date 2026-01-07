# ❓ Does `npm run build` Create config.js?

## **Short Answer: YES and NO**

### ✅ **YES** - It copies the template
### ❌ **NO** - It doesn't generate the production URL

---

## 📋 **What Actually Happens:**

### **Step 1: You Run `npm run build`**

```bash
npm run build
```

**Vite does this:**
```
public/config.js (template with localhost)
    ↓ (copies to)
build/config.js (still has localhost URL)
```

**Result:** `build/config.js` exists but has the **template URL** (localhost)

---

### **Step 2: You Package for Deployment**

```bash
./create-deployment-package.sh
```

**Script does this:**
```
build/config.js (localhost URL)
    ↓ (packaged into)
billingtool.zip/config.js (still localhost URL)
```

**Result:** The zip file contains `config.js` with localhost URL

---

### **Step 3: Installer Runs on Server**

```php
// installer.php extracts zip
billingtool.zip → public_html/

// Then OVERWRITES config.js
$configJs = "window.APP_CONFIG = {
  API_BASE_URL: 'https://yourdomain.com/api/public/index.php'
};";

file_put_contents('config.js', $configJs);
```

**Result:** `config.js` now has **YOUR domain's URL** ✅

---

## 🎯 **Summary:**

| Stage | config.js Content | Created By |
|-------|------------------|------------|
| **Build** | `localhost:8080` | Vite (copied from public/) |
| **Package** | `localhost:8080` | Script (from build/) |
| **Deploy** | `yourdomain.com` | **Installer (overwrites)** |

---

## ✅ **What You Need to Know:**

1. **Build creates config.js** ✅
   - But it's just a template
   - Has localhost URL

2. **Installer replaces it** ✅
   - Overwrites with your domain
   - This is the important step

3. **You don't need to worry** ✅
   - Just run `npm run build`
   - The installer handles the rest

---

## 🧪 **Test It:**

### **After building locally:**
```bash
npm run build
cat build/config.js
```
**You'll see:**
```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'http://localhost:8080'
};
```

### **After installer runs:**
```bash
# On your server
cat public_html/config.js
```
**You'll see:**
```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'https://yourdomain.com/api/public/index.php'
};
```

---

## 📝 **The Flow:**

```
┌─────────────────────────────────────────┐
│ 1. npm run build                        │
│    Creates: build/config.js (localhost) │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. ./create-deployment-package.sh       │
│    Packages: config.js (still localhost)│
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. Upload billingtool.zip               │
│    Contains: config.js (localhost)      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. Run installer.php                    │
│    Overwrites: config.js (YOUR DOMAIN)  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 5. App loads                            │
│    Uses: YOUR DOMAIN ✅                 │
└─────────────────────────────────────────┘
```

---

## ⚠️ **Important:**

The `config.js` in your build is **temporary** and **will be replaced** by the installer.

**Don't worry about the localhost URL in the build** - it's just a placeholder!

---

## 🎉 **Bottom Line:**

**Question:** Does `npm run build` create config.js?

**Answer:** 
- ✅ Yes, it copies it from `public/` to `build/`
- ❌ But it's just a template with localhost
- ✅ The installer will replace it with your real domain

**You're good to go!** Just build and deploy as normal. 🚀
