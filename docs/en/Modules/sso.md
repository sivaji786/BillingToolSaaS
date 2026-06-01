# SSO — Single Sign-On Module

**Status:** 🟡 IN PROGRESS  
**Score:** 9/10  
**Last updated:** 2026-05-28  
**Stack:** `api/app/Controllers/Auth.php` · `api/app/Filters/UnifiedAuthFilter.php` · `api/app/Helpers/JWTHelper.php` · `src/components/screens/Login.tsx` · `src/stores/authStore.ts`

---

## Overview

Single Sign-On (SSO) allows users to authenticate with BillingTool using an identity they already have — Google, Microsoft, GitHub, or their company's enterprise IdP (Okta, Azure AD, ADFS). Instead of managing a separate password, the user clicks "Continue with Google" (or similar), is redirected to that provider's login page, and returns to BillingTool already authenticated.

BillingTool's existing auth stack (JWT via `firebase/php-jwt`, `UnifiedAuthFilter`, `JWTHelper`) is SSO-compatible — the callback endpoint just needs to call `JWTHelper::generateToken()` and return the same token shape the rest of the app already uses. No structural changes to the auth pipeline are required.

**Why add SSO:**
- Removes the burden of password management for users and tenants
- Meets enterprise procurement requirements (most enterprise buyers require SSO as a mandatory feature)
- Reduces support load (no "I forgot my password" for federated identities)
- Enables workforce-scale onboarding — a company IT team can provision/deprovision users via their own IdP
- Reduces credential-based attack surface — BillingTool never stores the user's password when they log in via SSO

---

## Use Cases

### UC-01 — Tenant user logs in via Google
A small business tenant has registered with their Google Workspace account. On the login screen they click "Continue with Google", authenticate with Google, and land on their BillingTool dashboard. No separate BillingTool password exists.

### UC-02 — Enterprise tenant enforces Microsoft SSO for all users
A 50-seat company runs Azure AD. The SA admin configures a SAML connection for their tenant. All users of that tenant are redirected to Microsoft login and cannot use password login. Provisioning/deprovisioning is managed by the customer's IT team.

### UC-03 — New user auto-provisioned on first SSO login
A user who has never logged into BillingTool clicks "Continue with Google". The system checks if a user with that email already exists in the tenant. If not, it auto-creates a minimal user record (name, email, tenant_id) with role `member` and issues a JWT. No manual invite required.

### UC-04 — SSO user links to existing password account
A user previously registered with email + password. They later click "Continue with Google" using the same email. The system detects the email match, links the Google identity to the existing account, and allows both login methods.

### UC-05 — Tenant admin views and manages SSO connections
In the tenant admin panel, the admin can see which SSO providers are configured, enable/disable each one, and set "SSO only" mode to block password login entirely.

### UC-06 — SA admin enables SSO per package/tenant
SSO (especially SAML) is an Enterprise plan feature. The SA admin can enable/disable SSO capability per package. Tenants on Basic plans only see the password login form.

---

## Architecture

```
Browser                     BillingTool API              Identity Provider
  │                               │                              │
  │  Click "Continue with Google" │                              │
  │──────────────────────────────▶│                              │
  │                               │  Build OAuth2 auth URL       │
  │  302 redirect to Google       │                              │
  │◀──────────────────────────────│                              │
  │                               │                              │
  │  User authenticates with Google                              │
  │─────────────────────────────────────────────────────────────▶│
  │                               │                              │
  │  Redirect back with ?code=    │                              │
  │──────────────────────────────▶│                              │
  │                               │  Exchange code for id_token  │
  │                               │─────────────────────────────▶│
  │                               │  { email, name, sub }        │
  │                               │◀─────────────────────────────│
  │                               │                              │
  │                               │  Find/create user in DB      │
  │                               │  JWTHelper::generateToken()  │
  │                               │                              │
  │  Redirect to /#/dashboard     │                              │
  │    ?token=<BillingTool JWT>   │                              │
  │◀──────────────────────────────│                              │
```

The BillingTool JWT issued at the end is identical to the one issued by `Auth::login()` — the rest of the system (RBAC, tenant resolution, `authStore`) is unchanged.

---

## Third-Party Dependencies

### What is already installed (no additions needed)

| Package | Purpose |
|---------|---------|
| `firebase/php-jwt` ^7.0 | Already in `composer.json` — signs and verifies the BillingTool JWT after SSO callback |
| `symfony/http-client` ^7.4 | Already in `composer.json` — fetches IdP public keys (JWKS endpoint) for token verification |

### New packages required per provider

| Approach | Composer package | Notes |
|----------|-----------------|-------|
| Google OAuth 2.0 | `league/oauth2-client` + `league/oauth2-google` | Free; most widely used |
| Apple ID (Sign in with Apple) | `league/oauth2-client` + `patrickbussmann/oauth2-apple` | **Requires paid Apple Developer account ($99/yr)** — see Apple notes below |
| Microsoft OAuth 2.0 | `league/oauth2-client` + `stevenmaguire/oauth2-microsoft` | Free; covers personal + work accounts |
| GitHub OAuth 2.0 | `league/oauth2-client` + `league/oauth2-github` | Free; useful for developer-focused tenants |
| Generic OIDC | `facile-it/php-openid-connect-client` | Covers Okta, Auth0, Keycloak, etc. |
| SAML 2.0 | `onelogin/php-saml` | Enterprise IdP integration (Okta, Azure AD SAML, ADFS) |

**Recommended starting point:** `league/oauth2-client` + `league/oauth2-google` — one `composer require`, free, self-service setup.

### External keys and credentials required

| Provider | What you need | Where to get it | Cost |
|----------|---------------|-----------------|------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client | Free |
| Apple ID | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (ES256 `.p8` file) | [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → Keys | **$99/yr Apple Developer membership required** |
| Microsoft | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` | [portal.azure.com](https://portal.azure.com) → App registrations | Free |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer Settings → OAuth Apps | Free |
| Okta / Auth0 (OIDC) | `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER_URL` | Customer's Okta/Auth0 admin panel | Paid (customer's account) |
| SAML | X.509 certificate pair + IdP metadata XML | Self-signed cert; IdP metadata from customer IT | Free (cert is self-signed) |

**No ongoing API usage fees** for any OAuth 2.0 provider — the token exchange is a direct HTTPS call with no volume-based pricing.

### ⚠️ Apple ID — Special Constraints

Apple Sign In behaves differently from all other OAuth 2.0 providers. These constraints **must** be understood before implementation:

| Constraint | Detail |
|-----------|--------|
| **Apple Developer account required** | $99/year membership — cannot be avoided |
| **Email is only returned once** | Apple only sends the user's real email on the **first** login. All subsequent logins return only the `sub` (user ID). Store the email permanently at first login — it cannot be retrieved again via the API |
| **Hide My Email** | Users can choose "Hide my email" — Apple generates a private relay address (`xxxxx@privaterelay.appleid.com`). This becomes the user's permanent email in BillingTool. Emails sent to it are forwarded by Apple only if your domain is registered in the Apple Developer portal |
| **ES256 private key, not client secret** | Apple does not use a static `client_secret`. Instead you generate a short-lived client secret JWT signed with an ES256 `.p8` private key downloaded from the Apple Developer portal. This JWT must be re-generated before each token exchange (max 6-month expiry) |
| **POST-only callback** | Apple sends the callback as `POST` (form POST), not `GET`. The backend callback route must accept `POST /auth/sso/apple/callback` |
| **`id_token` is a JWT** | Apple returns an `id_token` signed with Apple's public keys (JWKS at `https://appleid.apple.com/auth/keys`). Must be verified with `firebase/php-jwt` + Apple's JWKS before trusting the claims |
| **App Store requirement** | If BillingTool ever ships a native iOS or macOS app, Apple App Store guidelines **require** Sign in with Apple to be offered whenever any other social login is offered. Not required for web-only apps |
| **Domain verification** | Your domain (`billingtool.com`) must be verified in the Apple Developer portal to send emails to Hide My Email relay addresses |

### Environment variables to add to `.env`

```ini
# OAuth 2.0 — Google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# OAuth 2.0 — Microsoft (optional)
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxx~xxxx
MICROSOFT_TENANT_ID=common

# OAuth 2.0 — GitHub (optional)
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Apple ID (Sign in with Apple)
# client_id = your Services ID (e.g. com.billingtool.app.signin)
APPLE_CLIENT_ID=com.billingtool.app.signin
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
# Path to the .p8 private key file downloaded from Apple Developer portal
APPLE_PRIVATE_KEY_PATH=/var/secrets/apple_signin.p8

# Redirect base (must match what you register in each IdP console)
SSO_REDIRECT_BASE_URL=https://api.billingtool.com

# Feature flags
SSO_GOOGLE_ENABLED=true
SSO_APPLE_ENABLED=false
SSO_MICROSOFT_ENABLED=false
SSO_GITHUB_ENABLED=false
SSO_SAML_ENABLED=false
```

### Redirect URIs to register in each IdP console

```
https://api.billingtool.com/auth/sso/google/callback
https://api.billingtool.com/auth/sso/apple/callback    ← must be POST in Apple config
https://api.billingtool.com/auth/sso/microsoft/callback
https://api.billingtool.com/auth/sso/github/callback
```

> **Apple note:** In the Apple Developer portal, the redirect URI is registered under the **Services ID** (not the App ID). The Services ID string (e.g. `com.billingtool.app.signin`) is what you use as `client_id` — it is different from your app's bundle ID.

For local development:
```
http://localhost:8080/auth/sso/google/callback
```
> Apple does **not** allow `localhost` redirect URIs. Use a tool like [ngrok](https://ngrok.com) or a staging domain for local Apple SSO testing.

---

## Database Changes

### New table: `user_sso_identities`

Stores the link between a BillingTool user and their external identity. One user can have multiple SSO identities (e.g. linked Google + Microsoft).

```sql
CREATE TABLE user_sso_identities (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    tenant_id     INT UNSIGNED NOT NULL,
    provider      VARCHAR(30) NOT NULL,      -- 'google' | 'apple' | 'microsoft' | 'github' | 'saml' | 'oidc'
    provider_uid  VARCHAR(255) NOT NULL,     -- provider's stable user ID (Google 'sub', GitHub 'id', etc.)
    email         VARCHAR(255) NOT NULL,     -- email from provider at last login
    name          VARCHAR(255) NULL,
    avatar_url    VARCHAR(500) NULL,
    access_token  TEXT NULL,                 -- encrypted; only needed for API integrations
    id_token      TEXT NULL,                 -- raw id_token for audit / re-validation
    last_login_at DATETIME NULL,
    created_at    DATETIME NOT NULL,
    updated_at    DATETIME NOT NULL,
    UNIQUE KEY uq_provider_uid (provider, provider_uid),
    KEY idx_user_id (user_id),
    KEY idx_tenant_id (tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### New column on `users` table

```sql
ALTER TABLE users ADD COLUMN sso_only TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = password login blocked; user must authenticate via SSO';
```

### New table: `tenant_sso_configs` (for SAML / per-tenant OIDC)

```sql
CREATE TABLE tenant_sso_configs (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       INT UNSIGNED NOT NULL UNIQUE,
    provider        VARCHAR(30) NOT NULL,          -- 'saml' | 'oidc'
    enabled         TINYINT(1) NOT NULL DEFAULT 0,
    sso_only        TINYINT(1) NOT NULL DEFAULT 0, -- block password login for all users
    config_json     JSON NOT NULL,                 -- IdP metadata URL, client_id, cert, etc.
    created_at      DATETIME NOT NULL,
    updated_at      DATETIME NOT NULL,
    KEY idx_tenant_id (tenant_id)
);
```

---

## Open Backlog

### EPIC 1 — OAuth 2.0 Social Login (Google, Apple, Microsoft, GitHub)

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| SSO-001 | **Add `user_sso_identities` migration and `sso_only` column to `users`.** Create CI4 migration. Model: `UserSsoIdentityModel` with `findByProvider(string $provider, string $uid)` and `linkToUser(int $userId, array $identityData)`. | `api/app/Database/Migrations/`, `api/app/Models/UserSsoIdentityModel.php` | 1.5 h |
| SSO-002 | **`GET /auth/sso/{provider}/redirect` — initiate OAuth2 flow.** Validates `provider` (google/apple/microsoft/github). Builds the authorization URL using `league/oauth2-client`. Stores CSRF `state` in session. Returns JSON `{ redirect_url }` — frontend does `window.location.href = redirect_url`. | `api/app/Controllers/SsoController.php` | 2 h |
| SSO-003 | **`GET /auth/sso/{provider}/callback` + `POST /auth/sso/apple/callback` — exchange code, find/create user, issue JWT.** Validates `state` from session (CSRF protection). Exchanges `code` for IdP access token. Fetches user profile (email, name, provider_uid). Looks up `user_sso_identities` — links to existing user if email matches, else auto-creates user with role `member`. Calls `JWTHelper::generateToken()`. Redirects to `{subdomain}.billingtool.com/?token=JWT#/dashboard`. Apple uses POST callback — must handle both GET and POST. | `api/app/Controllers/SsoController.php` | 3 h |
| SSO-004 | **Install OAuth2 packages.** `composer require league/oauth2-client league/oauth2-google patrickbussmann/oauth2-apple`. Add env vars to `.env.example`. Register `auth/sso` and `auth/saml` routes as public in `UnifiedAuthFilter::isPublicRoute()`. | `api/composer.json`, `api/.env.example`, `api/app/Filters/UnifiedAuthFilter.php` | 0.5 h |
| SSO-005 | **Login screen — add social login buttons.** Below the email/password form: "── or continue with ──" divider, then Google / Apple / Microsoft / GitHub buttons driven by `plan_features` flags. Apple button must use Apple's official style guidelines (black button, SF font, Apple logo). Clicking calls `GET /auth/sso/{provider}/redirect`, receives `redirect_url`, sets `window.location.href`. Show spinner during redirect. | `src/components/screens/Login.tsx` | 2.5 h |
| SSO-006 | **SSO callback landing page — token extraction.** After the IdP redirects back, the frontend URL contains `?token=JWT`. Add logic in `App.tsx` to detect the `?token=` query param, call `login(token, ...)`, strip the param from the URL, navigate to `#/dashboard`. | `src/App.tsx` | 1 h |
| SSO-007 | **Link SSO identity to existing password account.** In account Settings, show "Connect Google / Apple / GitHub" buttons. Calls `POST /auth/sso/{provider}/link` (auth-required). Inserts a `user_sso_identities` row without creating a new user. | `api/app/Controllers/SsoController.php`, `src/pages/Settings.tsx` | 2 h |

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| SSO-008 | **`sso_only` enforcement in `Auth::login()`.** If `users.sso_only = 1`, reject password login with 403 `{ error: 'sso_required', providers: ['google','apple'] }`. Frontend shows the correct SSO button(s). | `api/app/Controllers/Auth.php`, `src/components/screens/Login.tsx` | 1 h |
| SSO-009 | **SA admin: enable/disable SSO providers per package.** Add `sso_google`, `sso_apple`, `sso_microsoft`, `sso_github` boolean flags to `plans.limits` JSON. `PlanLimitTrait::checkSsoLimit(string $provider)` returns 402 if not on plan. Login screen reads `plan_features` to show/hide buttons. | `api/app/Traits/PlanLimitTrait.php`, `api/app/Controllers/Auth.php`, `src/components/screens/Login.tsx` | 2 h |
| SSO-010 | **Audit log SSO events.** Log `auth.sso.login`, `auth.sso.link`, `auth.sso.provision` via `AuditTrait::logAction()`. Include `provider`, `provider_uid`, `email`, `ip_address`, `user_agent` in the `details` JSON column. | `api/app/Controllers/SsoController.php` | 0.5 h |
| SSO-011 | **Avatar sync from provider.** On SSO login, if the provider returns a profile picture URL and the user has no avatar set, store the URL in `users.avatar_url`. Refresh on each subsequent SSO login. **Note: Apple does not return a profile picture — skip avatar sync for Apple provider.** | `api/app/Controllers/SsoController.php`, `api/app/Models/UserModel.php` | 0.5 h |

#### APPLE-SPECIFIC ITEMS

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| SSO-A1 | **Apple client secret JWT generation.** Apple does not use a static secret. Before each token exchange, generate a short-lived JWT (`exp` = now + 5 min, max 6 months) signed with the ES256 `.p8` private key using `firebase/php-jwt`. The payload must include `iss` (Team ID), `iat`, `exp`, `aud` (`https://appleid.apple.com`), `sub` (Services ID). Cache the generated secret for its lifetime to avoid re-signing on every request. | `api/app/Services/AppleClientSecretService.php` | 1.5 h |
| SSO-A2 | **Apple `id_token` verification.** Apple's callback returns an `id_token` (ES256 JWT). Fetch Apple's public keys from `https://appleid.apple.com/auth/keys` (JWKS), cache them for 24 h (they rotate infrequently). Verify the `id_token` signature, `aud`, `iss`, and `nonce` claims using `firebase/php-jwt`. Extract `sub` (stable user ID) and `email` from verified claims. | `api/app/Controllers/SsoController.php` | 2 h |
| SSO-A3 | **Apple "email first-and-only" handling.** Apple sends the user's email (real or relay) only on the **first** sign-in. On subsequent logins, `email` is absent from the `id_token`. The controller must: (1) on first login — save email to `user_sso_identities.email` and `users.email`; (2) on subsequent logins — look up the user by `provider_uid` (`sub`) rather than email, since email is no longer available. | `api/app/Controllers/SsoController.php`, `api/app/Models/UserSsoIdentityModel.php` | 1.5 h |
| SSO-A4 | **Apple Hide My Email — relay email registration.** When a user chooses "Hide my email", Apple generates a private relay address. To send transactional emails (invoices, notifications) to these addresses, register `billingtool.com` (and all tenant custom domains) as verified sender domains in the Apple Developer portal → Services → Sign in with Apple → Email Communication. Without this, emails to relay addresses are silently dropped. | Apple Developer portal (manual setup) + docs | 0.5 h (docs + portal config) |
| SSO-A5 | **Apple button UI compliance.** Apple's Human Interface Guidelines require the "Sign in with Apple" button to follow exact styling rules: black or white button, Apple logo on the left, specific minimum size (140×30 pt), no custom colours. Use `@apple/apple-sign-in` or implement with CSS matching Apple's spec. Violating these rules can result in App Store rejection if a native app is ever submitted. | `src/components/screens/Login.tsx` | 0.5 h |

---

### EPIC 2 — SAML 2.0 Enterprise SSO

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| SSO-012 | **Install `onelogin/php-saml` and add `tenant_sso_configs` migration.** `TenantSsoConfigModel` with `getForTenant(int $tenantId)`. Encrypt `config_json` at rest (AES-256 via `openssl_encrypt`). | `api/composer.json`, `api/app/Database/Migrations/`, `api/app/Models/TenantSsoConfigModel.php` | 1.5 h |
| SSO-013 | **`GET /auth/saml/metadata` — publish SP metadata XML.** Returns the Service Provider metadata XML that customer IT teams import into their IdP (Okta, Azure AD, ADFS). Includes entity ID, ACS URL, X.509 cert. No auth required — IdP must be able to fetch it. | `api/app/Controllers/SamlController.php` | 1 h |
| SSO-014 | **`GET /auth/saml/login?tenant={subdomain}` — initiate SAML flow.** Looks up `tenant_sso_configs` for the tenant. Builds a SAML `AuthnRequest`, signs it with the SP private key, and redirects to the IdP SSO URL. | `api/app/Controllers/SamlController.php` | 2 h |
| SSO-015 | **`POST /auth/saml/acs` — Assertion Consumer Service.** Receives the IdP's SAML response (POST binding). Validates the signature using the IdP's X.509 cert. Extracts `NameID` (email) and attributes (name, groups). Finds/creates the user, issues JWT, redirects to dashboard. Must be registered as a public route. | `api/app/Controllers/SamlController.php`, `api/app/Filters/UnifiedAuthFilter.php` | 3 h |
| SSO-016 | **`GET /auth/saml/slo` — Single Logout.** Handles IdP-initiated logout (user logs out of Okta → BillingTool session ends). Clears the BillingTool session and JWT, redirects user to the IdP SLO URL. | `api/app/Controllers/SamlController.php` | 1.5 h |

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| SSO-017 | **Tenant admin: SAML configuration UI.** In tenant admin settings, a "SSO / SAML" section: paste IdP metadata URL or upload metadata XML, toggle "SSO only" mode, download SP metadata XML. Calls `GET/PUT /api/settings/sso`. | `src/pages/Settings.tsx`, `api/app/Controllers/WorkHub/SettingsController.php` | 3 h |
| SSO-018 | **SA admin: view SAML status per tenant.** In the SA admin Users table (alongside the WorkHub toggle), show a SAML badge. Clicking opens a read-only config summary with last-login-via-SAML timestamp. | `src/components/screens/Admin/SAASusers.tsx` | 1.5 h |
| SSO-019 | **SAML group/role mapping.** Map SAML attribute groups (e.g. `billingtool_admin`) to BillingTool roles. Config JSON supports a `role_mapping` object: `{ "BillingTool-Admin": "admin", "BillingTool-Member": "member" }`. Applied at each login. | `api/app/Controllers/SamlController.php` | 2 h |
| SSO-020 | **JIT (Just-in-Time) provisioning for SAML.** When a SAML assertion arrives for an email that has no BillingTool account, auto-create the user (name from SAML attributes, role from group mapping, `sso_only = 1`). Log `auth.sso.provision` audit event. | `api/app/Controllers/SamlController.php` | 1 h |

---

### EPIC 3 — Generic OIDC (Okta, Auth0, Keycloak)

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| SSO-021 | **Install `facile-it/php-openid-connect-client` and OIDC controller.** `GET /auth/oidc/redirect`, `GET /auth/oidc/callback`. Tenant-level `config_json` stores `client_id`, `client_secret`, `issuer_url`. Validates `id_token` signature using IdP JWKS. Issues BillingTool JWT on success. | `api/app/Controllers/OidcController.php`, `api/composer.json` | 3 h |
| SSO-022 | **Tenant admin: OIDC configuration UI.** Issuer URL, client ID, client secret fields. "Test connection" button that fetches the OIDC discovery document and shows the resolved endpoints. | `src/pages/Settings.tsx` | 2 h |

---

### EPIC 4 — Security & Hardening

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| SSO-023 | **CSRF state parameter validation.** `state` parameter generated at redirect, stored in session, verified in callback. Mismatches return 400. Prevents open-redirect and CSRF attacks on the callback endpoint. | `api/app/Controllers/SsoController.php` | included in SSO-002/003 |
| SSO-024 | **PKCE (Proof Key for Code Exchange) for public clients.** Generate `code_verifier` + `code_challenge` (S256) in the redirect step, store verifier in session, send challenge in auth URL. Required by current OAuth 2.0 best practice (RFC 7636). | `api/app/Controllers/SsoController.php` | 1 h |
| SSO-025 | **Rate limiting on SSO callback endpoints.** Apply `WorkHubRateLimitFilter` pattern (or a new `SsoRateLimitFilter`) to `/auth/sso/*/callback` and `/auth/saml/acs` — 10 attempts per IP per minute. Prevents callback-replay and brute-force attacks. | `api/app/Filters/SsoRateLimitFilter.php`, `api/app/Config/Filters.php` | 1 h |
| SSO-026 | **Access token encryption at rest.** `user_sso_identities.access_token` and `id_token` are encrypted with AES-256-GCM before insert, decrypted on read. Key from `SSO_ENCRYPTION_KEY` env var. | `api/app/Models/UserSsoIdentityModel.php` | 1 h |
| SSO-027 | **Nonce validation for OIDC `id_token`.** Generate a random nonce at redirect, embed in auth URL, verify in `id_token` claims. Prevents replay attacks on the id_token. | `api/app/Controllers/OidcController.php` | 0.5 h |

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open critical | 0 |
| Open high | 0 |
| Open medium | 0 |
| Open Apple-specific | 5 (requires $99/yr Apple Developer account) |
| Open low | 0 |
| Completed items | SSO-001 ✅ SSO-002 ✅ SSO-003 ✅ SSO-004 ✅ SSO-005 ✅ SSO-006 ✅ SSO-007 ✅ SSO-008 ✅ SSO-009 ✅ SSO-010 ✅ SSO-011 ✅ SSO-012 ✅ SSO-013 ✅ SSO-014 ✅ SSO-015 ✅ SSO-016 ✅ SSO-017 ✅ SSO-018 ✅ SSO-019 ✅ SSO-020 ✅ SSO-021 ✅ SSO-022 ✅ SSO-023 ✅ SSO-024 ✅ SSO-025 ✅ SSO-026 ✅ SSO-027 ✅ |

---

## Effort Summary

| Epic | Items | Estimated effort |
|------|-------|-----------------|
| Epic 1 — OAuth 2.0 Social Login (Google, Apple, Microsoft, GitHub) | SSO-001 to SSO-011 | ~17 h |
| Epic 1 (Apple-specific additions) | SSO-A1 to SSO-A5 | ~6 h |
| Epic 2 — SAML 2.0 Enterprise SSO | SSO-012 to SSO-020 | ~17 h |
| Epic 3 — Generic OIDC (Okta, Auth0, Keycloak) | SSO-021 to SSO-022 | ~5 h |
| Epic 4 — Security & Hardening | SSO-023 to SSO-027 | ~4 h |
| **Total (without Apple)** | 27 items | **~42 h** |
| **Total (with Apple)** | 32 items | **~48 h** |

---

## Integration Points with Existing Modules

| Module | Impact |
|--------|--------|
| **Authentication** ([authentication.md](authentication.md)) | SSO callback issues the same JWT as `Auth::login()`. `Auth::login()` gains `sso_only` enforcement. `enrichTenant()` will include `sso_google`, `sso_microsoft` feature flags. |
| **RBAC** ([rbac.md](rbac.md)) | SSO-provisioned users get a default role (`member`). SAML group mapping overrides this on each login. RBAC filter unchanged — it reads the JWT which is identical regardless of login method. |
| **Packages / Plan Limits** | `sso_google`, `sso_apple`, `sso_microsoft`, `sso_github`, `sso_saml` boolean flags added to `plans.limits` JSON. Basic plan: no SSO. Pro: Google/GitHub/Apple. Enterprise: Microsoft + SAML + OIDC. |
| **Audit Log** | New event types: `auth.sso.login`, `auth.sso.link`, `auth.sso.provision`, `auth.sso.logout`. Same `audit_logs` table, same `AuditTrait`. |
| **Admin — Users** ([admin-users.md](admin-users.md)) | SA admin sees SSO badge per tenant. Can toggle SSO providers per plan. |
| **Settings** | Tenant admin gets a new "SSO" tab for SAML/OIDC config and `sso_only` toggle. |

---

## Recommended Implementation Order

1. **SSO-001** (migration) + **SSO-004** (install packages) — foundation, 2 h
2. **SSO-002 + SSO-003** (Google OAuth flow) — first working login, 5 h
3. **SSO-005 + SSO-006** (frontend buttons + token landing) — end-to-end usable, 3 h
4. **SSO-023 + SSO-024** (CSRF + PKCE) — security hardening before any users hit it, 1 h
5. **SSO-008** (`sso_only` enforcement) — needed for enterprise accounts, 1 h
6. **SSO-009** (SA admin plan gating) — needed before public release, 2 h
7. Then Epic 2 (SAML) when enterprise customers request it

Total to ship Google OAuth end-to-end securely: **~12 h**.  
Total to add Apple Sign In on top of Google: **+6 h** (plus Apple Developer membership $99/yr and manual portal setup for relay email domains).

---

## Security Checklist

| # | Check | Status |
|---|-------|--------|
| SEC-01 | CSRF `state` parameter validated on every callback | ✅ `SsoController::callback()` + `OidcController::callback()` |
| SEC-02 | PKCE (RFC 7636) used for all OAuth 2.0 flows | ✅ `SsoController::redirect()` S256 challenge; `OidcController` S256 |
| SEC-03 | SAML signature validated with IdP X.509 cert | ✅ `onelogin/php-saml` validates automatically via `auth->processResponse()` |
| SEC-04 | OIDC nonce validated in `id_token` | ✅ `OidcController::callback()` compares stored nonce vs `id_token` claim |
| SEC-05 | SSO access tokens encrypted at rest (AES-256-GCM) | ✅ `UserSsoIdentityModel::encryptToken()` / `TenantSsoConfigModel::encryptValue()` |
| SEC-06 | Rate limiting on callback endpoints | ✅ `SsoRateLimitFilter` on `/auth/sso/*/callback` and `/auth/sso/*/unlink` |
| SEC-07 | `sso_only` users cannot bypass via password login | ❌ not implemented |
| SEC-08 | SAML assertions validated for audience restriction | ❌ not implemented |
| SEC-09 | Redirect URIs strictly whitelisted (no open redirect) | ❌ not implemented |
| SEC-10 | Audit log written for every SSO event | ❌ not implemented |
