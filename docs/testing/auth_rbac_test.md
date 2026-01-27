# Test Report: Authentication & RBAC
**Scope:** JWT, Sessions, Granular Rights, Portals

## 1. Functional Testing
- **Unit Testing:** 
    - `JWTHelper` token generation and expiry validation.
    - Status: ✅ **Passed**
- **Integration Testing:** 
    - `HybridAuthFilter` correctly identifying both Bearer tokens and Browser sessions.
    - Status: ✅ **Passed**
- **API Testing:** 
    - Login/Logout endpoints, invalid password error handling.
    - Status: ✅ **Passed**
- **Regression Testing:** 
    - Verified that fixing SA login didn't break regular user login (Lifecycle Test).
    - Status: ✅ **Passed**

## 2. Non-Functional Testing
- **Security Testing:** 
    - **XSS/CSRF Audit:** JWT is stored in HTTP-only cookies where applicable.
    - Result: No vulnerabilities detected in core auth flow.
    - Status: ✅ **Passed**
- **Usability & UX Testing:** 
    - Tested the "Session Expired" notification and redirect flow.
    - Status: 🟢 **Active**

## 3. Specialized Testing
- **Static Testing:** 
    - Peer review of `RbacFilter.php` logic to prevent permission escalation.
    - Status: ✅ **Passed**
- **Exploratory Testing:** 
    - Testing "Super Admin" actions within a regular "Tenant" portal (Correctly Denied).
    - Status: ✅ **Passed**
