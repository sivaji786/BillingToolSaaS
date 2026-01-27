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
Unlike traditional SaaS apps that use subdomains (e.g., `acme.app.com`), this application uses a **Single-Domain Architecture** (e.g., `app.billingtool.com`).

### Why Single Domain?
*   **SSL Simplicity**: No need for Wildcard SSL certificates.
*   **DNS Simplicity**: No complex CNAME records for customers.
*   **Privacy**: Customer paths use opaque UUIDs instead of company names.

### Tenant Resolution (The "Context" Filter)
How does the API know which company's data to show? The `TenantFilter` resolves the context in this priority order:

1.  **JWT Token (Primary)**: 
    *   **Context**: Logged-In User.
    *   **Logic**: The backend decodes the `Authorization: Bearer <token>` header. The token contains the `tenant_id`.
    *   **Usage**: 99% of API calls (Dashboard, Settings, secure operations).

2.  **UUID Path Segment (Public/Fallback)**:
    *   **Context**: Public User (e.g., Guest paying an invoice).
    *   **Logic**: The backend inspects the URL path for a UUID segment: `/portal/<uuid>/...`.
    *   **Usage**: Public pages where no user is logged in.

3.  **X-Tenant-ID Header (Override)**:
    *   **Context**: Debugging or specific Frontend overrides.
    *   **Logic**: Explicit instruction to switch context.

---

## 3. Security Architecture

### Fail-Closed Data Isolation (`TenantScope`)
We use a global model trait `TenantScope` to enforce isolation at the database level.
*   **Automatic Injection**: Every `SELECT`, `UPDATE`, `DELETE` automatically appends `WHERE tenant_id = X`.
*   **Fail-Closed**: If the `TenantFilter` cannot determine a valid tenant, the scope injects `WHERE 1=0`. This ensures that **no data is ever returned** if the context is ambiguous.

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
