# SaaS Architecture Documentation

## 1. System Overview
The Billing Tool SaaS is a **Single-Domain, Multi-Tenant** application built to provide secure invoicing and billing management for multiple companies within a shared infrastructure.

### Technology Stack
*   **Frontend**: React (Vite, TypeScript, Tailwind CSS)
*   **Backend**: PHP 8.1+ (CodeIgniter 4 REST API)
*   **Database**: MySQL (Shared Schema, Row-Level Security)
*   **Authentication**: JWT (JSON Web Tokens)

---

## 2. Multi-Tenancy Strategy
Unlike traditional SaaS apps that use subdomains (e.g., `acme.humpl.org`), this application uses a **Single-Domain Architecture** (e.g., `app.humpl.org`).

### Why Single Domain?
*   **SSL Simplicity**: No need for Wildcard SSL certificates.
*   **DNS Simplicity**: No complex CNAME records for customers.
*   **Privacy**: Customer paths use opaque UUIDs instead of company names.

### Tenant Resolution (The "Context" Filter)
How does the API know which company's data to show? The `UnifiedAuthFilter` resolves the context in this priority order:

1.  **JWT Token (Primary)**: 
    *   **Context**: Logged-In User.
    *   **Logic**: The backend decodes the `Authorization: Bearer <token>` header. The token contains the `tenant_id` (or `tid`).
    *   **Usage**: 99% of API calls (Dashboard, Settings, secure operations).

2.  **UUID Path Segment (Public/Fallback)**:
    *   **Context**: Public User (e.g., Guest paying an invoice or tracking a ticket).
    *   **Logic**: The backend inspects the URL path for a UUID segment: `/portal/<uuid>/...`.
    *   **Usage**: Public pages where no user is logged in.

3.  **Subdomain (Fallback)**:
    *   **Logic**: If no JWT or UUID is found, the system extracts the subdomain from the `Host` header.

4.  **X-Tenant-ID Header (Legacy Override)**:
    *   **Context**: Specific Frontend overrides.
    *   **Logic**: Explicit instruction to switch context (rarely used now).

---

## 3. Security Architecture

### Fail-Closed Data Isolation (`TenantScope`)
We use a global model trait `TenantScope` to enforce isolation at the database level.
*   **Automatic Injection**: Every `SELECT`, `UPDATE`, `DELETE` automatically appends `WHERE tenant_id = X`.
*   **Fail-Closed**: If the `UnifiedAuthFilter` cannot determine a valid tenant, the scope injects `WHERE 1=0`. This ensures that **no data is ever returned** if the context is ambiguous.

### Authentication Flow (`HybridAuth`)
*   **Sign Up**: Creates a Tenant, User, and UUID.
*   **Login**: Returns a JWT signed with `HS256`.
    *   **Token Payload**: standard `sub` (user_id) + custom `tenant_id`.
    *   The Frontend stores this token and sends it with every request.

---

## 4. Key Terminology
*   **Tenant**: A company or organization subscribing to the service. Identified by `id` (internal) and `uuid` (public).
*   **User**: An account belonging to a Tenant.
*   **Portal URL**: The public-facing entry point for a tenant, e.g., `/portal/550e8400-e29b-41d4-a716-446655440000/login`.

---

## 5. Plans and Usage Tracking

The system manages tenant growth and revenue through standardized subscription plans.

### Key Logic
- **Plan Types**: Plans can be **Public**, **Private**, or **Trailing** (Default).
- **Usage Enforcement**: Real-time blocking of actions (Storage, API) when limits are exceeded.
- **Maintenance Tasks**: Background CLI commands monitor usage and send threshold notifications.

For more details, see the [Plans and Usage System](file:///home/sivaji/Downloads/BillingTool/docs/PLAN_USAGE_SYSTEM.md) documentation.
