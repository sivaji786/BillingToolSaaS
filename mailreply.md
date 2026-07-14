# Re: Standard tech stack & API architecture for AI-generated apps

**To:** [Stakeholder]
**From:** [You]
**Re:** Binding technical standard for new apps under the humpl.org ecosystem

---

Thanks for putting this together — this is the right moment to write it down, before we have five apps with five different conventions instead of one. Short answer to your closing question first, then the detail.

## TL;DR recommendation

**Standardize on what's already running under humpl.org today** (this codebase — CodeIgniter 4 + React/Vite — is a real, working example of the target architecture, not a proposal), formalize the parts that are currently implicit (API versioning, error format, OpenAPI docs), and adapt the deployment process to the one hard constraint that overrides everything else below:

> **We're on shared hosting with no terminal access — FTP and phpMyAdmin only.**

That rules out Docker and rules out `composer`/`npm` running on the server — confirmed, since neither is available on our LiveConfig account. It does **not** rule out scheduled jobs: LiveConfig gives us real cron job creation, it just points at a PHP file rather than a full shell command with arguments — solved with a handful of small dedicated wrapper files rather than depending on an uncertain hosting feature (§7). Everything below now reflects your confirmed server details rather than an assumption.

---

## Part A — Platform standard

### 1. Standard production tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend framework | **PHP + CodeIgniter 4** | Already the framework of this codebase; lightweight enough to run on shared hosting via plain Apache/mod_php or PHP-FPM, no Node runtime required server-side. |
| Frontend | **React 18 + TypeScript + Vite (build) + Tailwind CSS** | Already in use; Vite produces a static `dist/` bundle — the server only needs to host static files, no Node process required in production. |
| Database | **MySQL / MariaDB via MySQLi** | Matches current `Database.php` config; universally supported on shared hosting + phpMyAdmin. |
| Auth | **JWT (HS256) for API calls**, session-cookie fallback where already used, **OAuth2/OIDC/SAML for SSO** | Already implemented (`firebase/php-jwt`, `league/oauth2-*`, `onelogin/php-saml`, `jumbojett/openid-connect-php`). |
| PDF/export | **dompdf** | Already in use for invoices/letters. |
| Payments | **Stripe** | Already integrated. |
| Notifications | **Telegram Bot API** (internal/ops), **SMTP** (transactional email) | Already in use. |

New apps should be built on this exact stack unless there's a specific reason not to (e.g. a workload that genuinely needs something CodeIgniter/PHP can't do) — not because it's the only good stack, but because a shared, boring, well-understood stack is what makes "communicate securely with existing apps" (your other requirement) actually achievable. Two stacks means two auth systems, two API conventions, two deployment pipelines.

### 2. Required versions

Pinned from this repo's actual `composer.json` / `package.json` (i.e., what's already running, not a future wishlist):

| Component | Minimum | Recommended | Confirmed on our server |
|---|---|---|---|
| PHP | 8.1 | **8.2 or 8.3** | **8.4.21** — newer than we've tested this codebase against; CI4 4.6.x supports 8.4, but worth a quick smoke test for deprecation warnings before first deploy |
| CodeIgniter | 4.x | **4.6.x** (currently pinned) | — |
| MySQL/MariaDB | 5.7 / MariaDB 10.3 | **MySQL 8.0** or **MariaDB 10.6+** | mysqlnd 8.4.21 (client) — fine |
| Node.js (build machine only, not the server) | 18 LTS | **20 LTS** | n/a — confirmed not available server-side, see §3/§10 |
| React | 18.x | **18.3.x** (currently pinned) | — |
| Vite | 5.x | **6.x** (currently pinned) | — |
| Tailwind CSS | 3.x | **3.4.x** (currently pinned) | — |

Server info you shared confirms `mysqli`, `curl`, `mbstring`, `sodium` are enabled — that covers our DB layer, HTTP calls (OAuth/SAML/Stripe/Telegram), and multi-byte string handling. **Still need to verify**: `gd` or `imagick` (dompdf can render without it but image-heavy PDFs benefit from it), `dom`/`libxml` (required by `onelogin/php-saml`'s XML signing), `zip`, `fileinfo`, `intl`, `opcache`. Easiest way to check: a one-off `phpinfo()` page or the extension list in LiveConfig's PHP settings.

Important nuance given our hosting: **Node/npm and Composer only need to exist on the developer's/CI's build machine, never on the production server** — confirmed necessary, not just a recommendation, since neither is available on this account. The server receives pre-built artifacts (a `dist/` folder of static HTML/CSS/JS, and a `vendor/` folder of PHP dependencies) via FTP. See §10 for the exact checklist.

### 3. Docker vs. conventional install

**Conventional install — Docker is not an option for our current hosting**, and shouldn't be a company-wide binding standard right now regardless, since it only works where we control the OS. Concretely:

- Backend: PHP files + `vendor/` uploaded via FTP, served by whatever Apache/PHP-FPM the shared host already runs (this is exactly what `api/public/.htaccess` already assumes).
- Frontend: `npm run build` locally → upload the resulting static `dist/` folder via FTP.
- No containers, no orchestration, no server-side build step.

If a future client/project *does* give us a VPS or dedicated server with terminal access, Docker becomes reasonable there — but it should be treated as a per-project exception, not the default, until our hosting situation changes.

### 4. Standard repository & directory structure

Formalize what this repo already does:

```
/                       ← frontend (Vite + React root)
  src/                  ← React app source
  public/               ← static assets + config.js (runtime API base URL)
  api/                  ← PHP/CodeIgniter4 backend, self-contained
    app/
      Controllers/
      Models/
      Filters/          ← auth, RBAC, CORS, rate-limiting
      Config/            ← Routes.php, Database.php, Filters.php
      Database/Migrations/
      Database/Seeds/
    public/              ← PHP front controller + .htaccess (this is the actual web root for the API)
    tests/
  docs/                  ← per-module docs, multi-language
```

New apps should follow the same split: **one frontend Vite project + one `api/` CodeIgniter project, in the same repo**, not spread across unrelated repos. This is what makes a consistent deployment checklist possible.

### 5. Dev / staging / production environments

- **Development**: local machine, `vite dev` (frontend) + PHP built-in server or local Apache (backend), local MySQL. `CI_ENVIRONMENT=development` in `.env`.
- **Staging**: a **staging subdomain** (e.g. `staging.humpl.org` or `staging-<app>.humpl.org`) pointed at a separate directory + separate database on the same shared account, with `CI_ENVIRONMENT=testing` — confirmed workable now that we know subdomains + wildcard DNS are already in place, and we can create scoped FTP accounts per app/subdomain to keep staging credentials separate from production.
- **Production**: `humpl.org` and tenant subdomains (`{tenant}.humpl.org`), `CI_ENVIRONMENT=production`, `app.forceGlobalSecureRequests=true`, debug/error display off, SSL on (confirmed available via LiveConfig — worth double-checking new subdomains get a cert automatically vs. needing a manual request each time).

### 6. `.env` and secrets management

Already the right pattern in this repo — keep it as the standard:

- One `.env` per environment, **never committed** (already gitignored here).
- All secrets (`JWT_SECRET`, DB credentials, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, `STRIPE_*`, `TELEGRAM_BOT_TOKEN`, SMTP password) live only in `.env`, read via CodeIgniter's `env()`.
- **New binding rule to add**: no duplicate/conflicting keys in one `.env` file (we hit exactly this bug recently — two `FRONTEND_DOMAIN` entries in one file caused a wrong redirect that took a while to track down). One key, one value, one place.
- Since we can't use a secrets vault on shared hosting, the practical safeguard is: `.env` is uploaded via FTP directly to the server (never through git, never through a public folder), and file permissions are set as restrictively as the host allows.
- Rotate `JWT_SECRET`/OAuth secrets on a schedule (recommend yearly, or immediately if anyone with FTP access leaves).
- **New binding rule, now that we know LiveConfig supports it**: each app/subdomain gets its **own scoped FTP account**, not one shared account for everything. Limits the blast radius if a single credential leaks, and means we can revoke access to one app without touching the others.

### 7. Migrations, seeders, backups, rollback

Now fully resolved — including the cron/`spark` question below, which turned out to need one small code addition rather than depending on an uncertain hosting feature:

- **The cron nuance**: you mentioned LiveConfig cron jobs "point to a php file" and you're not sure whether they can pass arguments (like `spark migrate` vs `spark cleanup:logs`). Rather than gambling on that, the robust fix is a **one-time addition** to the codebase: a small dedicated PHP entry file *per task* (e.g. `api/public/cron/migrate.php`, `api/public/cron/cleanup-logs.php`, `api/public/cron/usage-check.php`, `api/public/cron/mark-overdue.php`), each of which just bootstraps CodeIgniter and calls that one hardcoded command internally via `Config\Services::commands()->run('cleanup:logs', [])` — no CLI arguments needed at all, since the command name is baked into the file, not passed in. Each LiveConfig cron entry then just points at one of these files, no ambiguity. This works regardless of whether LiveConfig turns out to support arguments or not, so there's no need to spend time testing that first — I'd rather build the 4 small files than lose a afternoon to trial-and-error on a hosting panel's exact cron semantics.
- **Migrations**: same mechanism — `api/public/cron/migrate.php` wraps `Services::commands()->run('migrate', [])`, triggered via LiveConfig's "run now" (if available) or by briefly scheduling it a minute out. Fallback if we ever need a migration applied faster than a cron cycle allows: export the new migration's SQL by hand and run it via phpMyAdmin's SQL tab (works, but loses CodeIgniter's automatic "what's been applied" tracking — exception, not the rule).
- **Seeders**: same wrapper pattern, one file per seeder that needs to run outside local dev.
- **Backups**: confirmed included in our hosting plan — that's the safety net for routine operation. Still worth doing a manual export via phpMyAdmin (or a `mysqldump` wrapper script, same pattern as above) immediately before any risky schema migration, as a fast point-in-time rollback target rather than waiting on the host's backup cycle.
- **Rollback**: CodeIgniter migrations support `down()` methods — keep writing them even though we may not exercise them often, since the whole point is not to be stuck. For app code rollback, FTP re-upload of the previous build is the realistic mechanism (which is also why keeping every production build as a tagged, retrievable artifact matters — see §10).

One security note on the wrapper files: they live under `api/public/`, which is web-accessible, so they should check they're being invoked from CLI (`php_sapi_name() === 'cli'`) and refuse to run over HTTP — otherwise anyone who finds the URL could trigger a migration.

### 8. Authentication, user management, roles & permissions

Already the standard, formalize it:

- **Customer/tenant users**: JWT (HS256, 1 hour expiry currently), issued on login, tenant identified by subdomain (`{tenant}.humpl.org`) and/or `tenant_id` embedded in the token.
- **Admin/SaaS-operator users**: separate auth path (`SALogin`), same JWT mechanism, distinct `type` claim.
- **SSO**: Google/GitHub/Microsoft OAuth2, SAML 2.0, and generic OIDC are all already implemented and should be the menu we offer any client that needs SSO, rather than building a new provider integration per app.
- **RBAC**: role → rights model already exists (`RoleController`, `UserModel::getRights()`) — new apps should consume the *same* roles/rights tables/service rather than inventing per-app permission systems, so a user's permissions mean the same thing everywhere.

### 9. Logging, monitoring, scheduled jobs, queues, error reporting

- **Logging**: CodeIgniter's built-in logger (`writable/logs/`) plus the existing `AuditTrait`/audit-log table for user-facing actions. Standard going forward: every write action that matters for compliance goes through the audit log, not just the file log.
- **Scheduled jobs**: currently a `cron.sh` calling `php spark cleanup:logs` / `usage:check` / `invoices:mark-overdue`. Since LiveConfig cron jobs point at a PHP file (arguments not guaranteed), we're replacing the shell-script-with-arguments approach with the small per-task wrapper files described in §7 — one LiveConfig cron entry per wrapper file, no shell script, no argument-passing dependency.
- **Queues**: nothing async/queued exists yet in this codebase (everything runs inline on the request). If a future app needs background processing, on shared hosting without a persistent worker process, the realistic pattern is "a DB table of pending jobs + a cron/HTTP-triggered runner," not a real message queue (Redis/RabbitMQ) — those need a process we're not able to run here.
- **Error reporting**: currently local file logs. Worth adding a hosted error-tracking service (e.g. Sentry's free/low tier) since we can't tail server logs live without terminal access — this is a real gap on our current hosting and worth prioritizing.

### 10. Exact install & update process for our real server

Now confirmed end-to-end — composer/npm aren't available on the server, so this is the only path, not a fallback:

1. **Build locally** (or on a CI machine): `npm run build` (frontend) → static `dist/`; `composer install --no-dev --optimize-autoloader` (backend) → `vendor/`.
2. **Create a scoped FTP account** for the target app/subdomain if one doesn't already exist (LiveConfig supports this per app — keeps credentials isolated).
3. **Upload via FTP**: frontend static `dist/` contents to that subdomain's web root; `api/` (including the locally-built `vendor/`) to its own directory alongside it.
4. **Upload/update `.env`** for that environment directly via FTP (never through git) — one clean file, no duplicate keys (see §6).
5. **Run migrations/seeders** by triggering the relevant `api/public/cron/*.php` wrapper file (§7) via its LiveConfig cron entry.
6. **Smoke-test on the staging subdomain first, always** — never deploy straight to a tenant-facing production domain.
7. Only once staging checks out, repeat steps 2–5 against the production subdomain/domain.
8. Keep the just-deployed `dist/`+`vendor/` build archived locally (e.g. zipped, dated) so a rollback is "re-upload the previous archive via FTP," not "reconstruct it from git history under pressure."

This is now a real, repeatable checklist — worth turning into its own short internal doc (`DEPLOY.md`) rather than staying buried in an email, once we've run it for real once or twice and know it holds up.

---

## Part B — Binding API standard

Agreed that new apps must not become isolated systems. Here's the standard I'd propose, again grounded in what's partially already true of this codebase, formalized and made explicit:

- **REST conventions**: resource-based URLs (`/tasks/:id`, `/invoices/:id`), HTTP verbs map to actions (GET/POST/PUT/PATCH/DELETE), plural nouns for collections. Already the pattern in `Routes.php`.
- **Versioning**: **this is a gap today** — current routes are unversioned (`/api/...`, `/workhub/...`). New binding rule: **all new endpoints go under `/api/v1/...`**, and existing unversioned routes are treated as an implicit v1 that we don't break, rather than retrofitting URLs (too risky to rewrite silently-relied-upon paths). Any breaking change to an endpoint gets a `/api/v2/...` sibling, old version kept running until all consumers migrate.
- **Request/response format**: JSON in, JSON out, always. Standard success envelope should be `{ "data": ..., "meta": {...} }` for collections (pagination info in `meta`), bare `{ "data": {...} }` for single resources — this matches most of the existing controllers already.
- **Standard error format** — needs to be formalized as one shape used everywhere, e.g.:
  ```json
  { "success": false, "error": "validation_failed", "message": "Human-readable message", "errors": { "field": ["reason"] } }
  ```
  with consistent HTTP status codes (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 422 unprocessable, 429 rate-limited, 500 server error). Several controllers already return shapes close to this — the new rule is just: no more inventing a new shape per controller.
- **Auth between users/apps/services**:
  - User-facing: JWT bearer token, as already implemented.
  - **App-to-app / service-to-service (new)**: needs a service-account style credential — recommend **API keys issued per integrating app**, sent as `Authorization: Bearer <key>` or a dedicated `X-API-Key` header, mapped server-side to a service identity with its own scoped rights (reusing the existing RBAC rights table rather than inventing a parallel permission system).
  - OAuth2 client-credentials grant is the "more correct" long-term answer for service-to-service, but adds real complexity (token endpoint, refresh handling) — I'd start with scoped API keys for internal humpl.org-to-humpl.org communication and reserve full OAuth2 for when we expose APIs to genuinely external third parties.
- **Role/permission exchange**: when App B calls App A on behalf of a logged-in user, forward the user's JWT (it already carries `tenant_id`/role claims) rather than re-authenticating — App A validates the same JWT using a shared `JWT_SECRET` (or, better, moves to asymmetric RS256 once more than one app needs to *verify* tokens it didn't issue, so the secret doesn't have to be shared everywhere).
- **Tenant/org identification**: continue the existing subdomain convention (`{tenant}.humpl.org`) as the primary signal, with `tenant_id` embedded in the JWT as the authoritative source once authenticated — new apps should resolve tenant the same way, not invent a new header.
- **Pagination/filtering/sorting/search**: standardize on query params — `?page=1&per_page=20`, `?sort=field&order=asc`, `?filter[status]=open`, `?q=search term` — mirroring the pattern already used in `TaskController::index()` (`page`, `per_page`, `date_from`/`date_to` etc.).
- **Webhooks/event exchange**: for app-to-app events (e.g. "invoice paid" needing to notify another module), standardize on: a webhook registration table (target URL + secret per subscriber), HMAC-signed payloads (`X-Signature` header, same pattern already used for `workhub/files/proxy`'s presigned URLs), and a documented retry policy (e.g. 3 retries with backoff, then mark failed for manual review).
- **Idempotency**: for POST endpoints that create resources (payments, invoice generation), require an `Idempotency-Key` header, store recently-seen keys briefly, and return the original response for a repeat request instead of creating a duplicate — not yet standard in this codebase, worth adding for anything money-related first.
- **Rate limiting**: a rate-limit filter already exists for WorkHub (`WorkHubRateLimitFilter`) — extend that pattern to be the app-wide default rather than a one-off, with sensible per-endpoint limits and a standard `429` + `Retry-After` response.
- **CORS/CSRF**: `CorsFilter` already exists and allow-lists `*.humpl.org` plus localhost for dev — keep that as the standard, extended per new subdomain as needed. CSRF matters for cookie-session flows; since our API auth is bearer-token based, CSRF risk is lower, but any cookie-based session flow (e.g. classic admin login) should keep CSRF tokens as CodeIgniter provides by default.
- **File upload/download**: multipart form-data for uploads, size limits enforced both client- and server-side, presigned/signed URLs (already the pattern for WorkHub file proxying) for anything that shouldn't be a raw public path.
- **Audit logging & trace IDs**: every request should carry (or be assigned) a request/trace ID, logged alongside the existing audit trail, so a support issue spanning two apps can be followed end-to-end. This is a gap today — no trace ID propagation exists yet between modules — worth adding as new apps come online rather than retrofitting everything at once.
- **OpenAPI/Swagger**: none exists yet — recommend generating one per app (hand-written or generated from route annotations) and publishing it internally, since "future modules must integrate" is only realistic if they can discover our endpoints without reading PHP source.
- **API tests & compatibility**: PHPUnit backend tests and Vitest frontend tests already exist and run — extend the same pattern to any new API surface, and treat "does this break an existing consumer" as a required check before merging a breaking change, which is exactly what the `/api/v1/` versioning rule above is meant to prevent us from needing in a panic.
- **Discovering existing humpl.org services**: for now, a simple internal registry document (base URL + version + auth method per service) is enough — we don't have enough services yet to justify a service-mesh/discovery system, and building one prematurely would cost more than it saves.

---

## Part C — Your intended workflow

**Confirmed, this is the right shape**: single-file HTML mockup → review/approval → production build → API integration → staging test → deployment. The one thing I'd add explicitly: the mockup review step should also gate what data model / API endpoints are needed — deciding auth, tenant scoping, and roles *before* wiring the mockup to a real backend prevents the awkward retrofits (e.g. adding proper tenant isolation after the fact) that are expensive to fix later. So a small addition: **mockup approval → data/API design sign-off → build against real backend → staging → deploy**, rather than jumping straight from approved mockup to backend work.

---

## Confirmed server configuration

Thanks for the detail — this resolves almost everything from the previous version of this doc:

| Item | Confirmed |
|---|---|
| Control panel | LiveConfig (custom) — FTP account creation, DB creation, PHP version management, cron jobs all self-service |
| Web server | Apache 2.4.68 (Debian) |
| PHP | 8.4.21, with `mysqli`, `curl`, `mbstring`, `sodium` confirmed enabled |
| Database | MySQL/MariaDB via mysqlnd 8.4.21 |
| Subdomains + wildcard DNS | Already available and pointed — no per-tenant DNS work needed |
| SSL on new subdomains | Automatic |
| Backups | Included in the hosting plan |
| Composer/npm on server | **Not available** — confirms build-locally-and-FTP-upload is the only deployment path (§10) |
| Cron jobs | Available via LiveConfig, points at a PHP file (arguments not guaranteed) — solved with dedicated per-task wrapper files, see §7/§9 |
| PHP extensions | `gd`/`imagick`, `dom`/`libxml`, `zip`, `fileinfo`, `intl`, `opcache` all enabled, alongside the previously-confirmed `mysqli`/`curl`/`mbstring`/`sodium` |
| Email | Keep existing SMTP (`mn-ssl.de`) for all new apps |
| FTP access model | Scoped FTP accounts per app/subdomain — now the binding rule (§6) |

Everything that was open is resolved — nothing left blocking us from treating this as the binding standard. The only actual code work this adds beyond "business as usual" is the small set of `api/public/cron/*.php` wrapper files (§7), which I can write once we agree on naming/location. After that, this document doubles as our internal onboarding doc for any new app: same stack, same versions, same deployment checklist, same API conventions.

Happy to walk through any of this on a call if that's faster than back-and-forth over email.
