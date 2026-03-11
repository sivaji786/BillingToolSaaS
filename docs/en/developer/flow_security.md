# Security & Isolation Data Flow

## 1. Overview
This document details the security architecture used to enforce Multi-Tenancy and RBAC (Role-Based Access Control).

## 2. Filter Pipeline
Every request passes through a series of filters defined in `app/Config/Filters.php`:

1.  **CorsFilter (`cors`)**: 
    *   Allows requests from approved origins.
    *   Handles Preflight `OPTIONS` requests.
2.  **UnifiedAuthFilter (`auth`)**: 
    *   **Crucial Step**: Handles both Tenancy identification and User Authentication.
    *   Source: JWT Token (`tenant_id`) > URL Path (`/portal/<uuid>`) > Host Subdomain.
    *   Action: Loads Tenant, validates JWT, and sets `currentTenant` global config.
3.  **RbacFilter (`rbac`)**:
    *   Checks if User has the specific permission (e.g., `invoices.read`).
    *   Bypasses for users with `role = 'admin'`.
    *   Safety Check: Verifies `User.tenant_id == CurrentTenant.id` (Workspace Mismatch).

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
