# Security & Isolation Data Flow

## 1. Overview
This document details the security architecture used to enforce Multi-Tenancy and RBAC (Role-Based Access Control).

## 2. Filter Pipeline
Every request passes through a series of filters defined in `app/Config/Filters.php`:

1.  **CorsFilter (`cors`)**: 
    *   Allows requests from approved origins (`*.humpl.org`, `localhost`).
    *   Handles Preflight `OPTIONS` requests.
2.  **TenantFilter (`tenant`)**: 
    *   **Crucial Step**: Identifies *which* workspace is being accessed.
    *   Source: `X-Tenant-ID` Header > Subdomain.
    *   Action: Loads Tenant from DB and sets `currentTenant` global config.
3.  **Authentication (`hybridauth`)**: 
    *   Validates Bearer Token.
    *   Sets Session User ID.
4.  **RbacFilter (`rbac:permission`)**:
    *   Checks if User has the specific permission (e.g., `invoices.read`).
    *   **Safety Check**: Verifies `User.tenant_id == CurrentTenant.id`.

## 3. Database Scoping (TenantScope)
The `TenantScope` trait is the final line of defense.

### Logic Flow
```php
protected function beforeFind(array $data) {
    $tenant = config('App')->currentTenant;

    if ($tenant) {
        // Normal Operation
        $this->where('tenant_id', $tenant->id);
    } else {
        // FAIL-CLOSED SECURITY
        // No tenant identified? Block all access.
        $this->where('1=0');
    }
    return $data;
}
```

### Bypass Mechanism
For global operations (like Login), developers must explicitly bypass this scope:
```php
$userModel->withoutTenant()->find($id);
```
This ensures that "leaking" data is an intentional, explicit action, not a default behavior.
