# Role-Based Access Control (RBAC) System

This document provides a deep dive into the RBAC (Role-Based Access Control) system used in the BillingTool SaaS platform. It explains how roles and rights are structured, stored, and enforced across the application.

## 1. Architectural Overview

The RBAC system follows the standard **User -> Role -> Right** hierarchy. A user is assigned one or more roles, and each role is granted a set of rights (permissions).

### Core Components
- **Rights**: The discrete actions that can be performed (e.g., `invoices.read`, `workspace.upload`).
- **Roles**: Logical groupings of rights (e.g., `Admin`, `Technician`, `Accountant`).
- **Permissions**: The bridge between Roles and Rights.
- **Enforcement**: Middleware (Filters) that check if a user has the necessary right before allowing an action.

---

## 2. Database Schema

The RBAC system is powered by four primary tables:

### `rights`
Defines the atomic actions available in the system.
- `id`: Primary key.
- `module`: The feature area (e.g., `invoices`, `tickets`).
- `action`: The verb (e.g., `read`, `create`, `update`, `delete`).
- `code`: The unique identifier used in code (e.g., `invoices.read`).
- `description`: Human-readable explanation.

### `roles`
Defines the roles available. Roles can be global (for all tenants) or specific to a tenant.
- `id`: Primary key.
- `tenant_id`: (Nullable) Link to a specific tenant.
- `name`: Role name (e.g., `Admin`).
- `is_super_admin`: Boolean flag. If true, the role bypasses all right checks.

### `role_rights` (Pivot)
Maps roles to their respective rights.
- `role_id`: FK to `roles`.
- `right_id`: FK to `rights`.

### `user_roles` (Pivot)
Assigns roles to users.
- `user_id`: FK to `users`.
- `role_id`: FK to `roles`.

---

## 3. Backend Implementation

### Enforcement via Filters
The primary enforcement mechanism is the `RbacFilter` (`app/Filters/RbacFilter.php`).

In `app/Config/Routes.php`, you apply the filter to route groups like this:

```php
// Enforce read access on a group of routes
$routes->group('invoices', ['filter' => 'rbac:invoices.read'], function($routes) {
    $routes->get('', 'InvoiceController::index');
    $routes->get('(:segment)', 'InvoiceController::show/$1');
});
```

The filter works by:
1. Extracting the `userId` from the authenticated context (JWT or Session).
2. Checking if the user's `role` column is set to `admin` (global bypass).
3. If not, it calls `UserModel::hasRight($userId, 'invoices.read')`.

### `UserModel` Logic
The `UserModel` contains the core permission check logic:

1. **Owner/Admin Bypass**: If a user has the `owner` or `admin` role directly in the `users` table, they have full access.
2. **Super Admin Role**: If the user is assigned a role where `is_super_admin = 1`, they have full access.
3. **Specific Right Check**: A JOIN query across `user_roles`, `roles`, `role_rights`, and `rights` verifies if the specific code exists for that user.

---

## 4. Applying Rights in the Customer Portal

The Customer Portal utilizes the RBAC system to provide a tailored experience based on user permissions.

### API Protection
Every API endpoint in the customer portal is protected by the `rbac` filter in `Routes.php`. This ensures that even if a user knows an API endpoint, they cannot execute it without the correct background permission.

### Frontend Integration
When a user logs in, their available rights are often returned in the `auth/me` endpoint. The frontend uses these rights to:
- **Hide/Show Menu Items**: If a user doesn't have `invoices.read`, the Invoices link is hidden.
- **Toggle Action Buttons**: If a user has `workspace.read` but not `workspace.delete`, the delete buttons are disabled or hidden in the UI.
- **Conditional Routing**: Preventing navigation to pages for which the user lacks access.

---

## 5. Adding New Rights

To add a new right to the system:

1. **Migration**: Create a migration to insert the new right into the `rights` table.
   ```php
   $this->db->table('rights')->insert([
       'module' => 'new_feature',
       'action' => 'manage',
       'code'   => 'new_feature.manage',
       'description' => 'Full access to new feature'
   ]);
   ```
2. **Routes**: Add the `rbac` filter to your new routes.
   ```php
   $routes->group('new-feature', ['filter' => 'rbac:new_feature.manage'], ...);
   ```
3. **Seeding**: Update `MainSeeder.php` to include the new right in the default roles heuristic.

## 6. Multi-Tenancy Considerations

RBAC is tightly integrated with Multi-Tenancy. The `RbacFilter` and `UserModel` operations are scoped to the current tenant. This prevents a user from leveraging a role from Tenant A to access data in Tenant B.
