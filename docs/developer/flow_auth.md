# Authentication & Onboarding Data Flow

## 1. Overview
This document details the flow for User Signup, Tenant Creation, and Authentication.

## 2. Signup Flow (New Tenant)
**Endpoint**: `POST /api/auth/signup`
**Controller**: `Auth::signup` (and `Onboarding::signup` for SaaS flow)

```mermaid
sequenceDiagram
    participant Client
    participant API as API (Auth Controller)
    participant DB as Database

    Client->>API: POST /signup (Company, Email, Password, Plan)
    
    API->>API: Validate Input & Email Format
    API->>DB: Check if Email exists (Global Check)
    
    alt Email Exists
        API-->>Client: 400 Error: Email already registered
    else Email Unique
        API->>API: Generate UUID & Subdomain
        API->>DB: Insert into `tenants` (Active, Trial, UUID)
        API->>DB: Insert into `users` (Role: Owner, TenantID: New)
        API->>DB: Insert into `subscriptions` (Trialing)
        API->>DB: Assign Role ID 51 (User_Roles)
        API->>DB: Create Company Profile
        
        API-->>Client: 201 Created (Token + Tenant Info)
    end
```

### Key Logic
*   **Tenant Creation**: A new record in `tenants` is creating using the sanitized Company Name as the subdomain.
*   **User Association**: The new user is legally bound to this `tenant_id` immediately.
*   **Role Assignment**: Default `role_id = 51` is assigned for RBAC.

## 3. Login Flow
**Endpoint**: `POST /api/auth/login`
**Controller**: `Auth::login`

1.  **Scope Bypass**: The `Auth` controller uses `withoutTenant()` to search the `users` table globally by email.
2.  **Credentials**: `password_verify()` checks the hash.
3.  **Tenant Lookup**: Once the user is found, the system looks up their `tenant_id` to ensure the tenant exists and is active.
4.  **Token Generation**:
    *   **Payload**: User ID, Tenant ID, Email, Role.
    *   **Secret**: Signed with `JWT_SECRET`.

## 4. Client-Side Handling
*   **Storage**: The frontend stores the token and the `user` object (containing `tenant_id`) in `localStorage`.
*   **Subsequent Requests**: The logic in `api.ts` extracts the `user.tenant.subdomain` and sends it as the `X-Tenant-ID` header.
