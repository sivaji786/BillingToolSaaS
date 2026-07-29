# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This project also inherits the global baseline at `~/.claude/CLAUDE.md` (security/data/AI/deployment principles distilled from `universemaster_v0_57_EN.md`, the "Golden Rules" master doc — also mirrored in `docs/en/Golden_rules/` and `docs/de/Golden_rules/` in this repo, though those copies are an older v0.9 and may be stale relative to the v0.57 file at the repo root; see `backup/changes.md` for what changed since the v0.44 edition this baseline was last re-derived from). Everything below is specific to this repo.

## What this is

A multi-tenant SaaS billing/invoicing platform (EN 16931 e-invoicing compliance — UBL 2.1/XML, Peppol BIS export) with a second, largely independent field-service module (**WorkHub**: tasks, time tracking, Kanban, German §16 ArbZG break-compliance automation) bolted onto the same tenant/auth system. Two codebases in one repo: a Vite/React frontend (`src/`) and a CodeIgniter 4 PHP backend (`api/`), deployed as separate artifacts (see Deployment Reality below).

## Commands

**Frontend** (repo root):
```bash
npm run dev              # Vite dev server, :3000
npm run build             # production build → dist/
npm test                  # vitest run (unit tests, src/tests/)
npm run test:watch         # vitest watch mode
npx tsc --noEmit -p tsconfig.json   # type-check (no separate lint script exists — this is the fast-fail check)
```

**Backend** (`api/`):
```bash
cd api && composer install
cd api && vendor/bin/phpunit                      # full suite
cd api && vendor/bin/phpunit --filter TaskControllerTest   # single test class
cd api && php -l app/Controllers/SomeFile.php     # syntax check a single file
```

**Full test suite** (isolated Docker test DB on :3307, never touches the dev DB on :3306):
```bash
npm run test:setup       # first time only — Docker + migrate + seed (~90s)
npm run test:dev          # everything: TS check → PHPUnit → Vitest → all Playwright projects
npm run test:dev:unit      # TS check + Vitest only, no servers (~30s) — use this for quick iteration
npm run test:dev:api       # Playwright API-contract tests only (~2 min), no browser
bash run-tests.sh --suite workhub   # one Playwright project (workhub | billing | a11y | smoke | visual)
npx playwright test --project=api -g "some test name"   # by name, any project
```
Full reference: `TESTING.md` (test accounts, seeded data, coverage gaps, troubleshooting).

## Architecture

### Multi-tenancy and auth are resolved together, in one filter
Tenant identity comes from the subdomain (`{tenant}.humpl.org`) resolved in `api/app/Filters/UnifiedAuthFilter.php`, which also does JWT validation (HS256, `firebase/php-jwt`) as a **global before-filter** — every request passes through it unless the URL matches an explicit allow-list (`isPublicRoute()`'s `$publicPatterns` array in that same file). When adding any new endpoint that must work for logged-out users (public CMS pages, the guest-facing Mockups browser, SSO callbacks), it must be added to that allow-list or it will 401 regardless of its own route filter config. Customer JWTs and Super-Admin (SA) JWTs carry a distinguishing `type` claim and are otherwise the same mechanism (`api/app/Helpers/JWTHelper.php`).

### RBAC is a role → rights model, and WorkHub has its own parallel one
Billing/admin roles use `RoleController` + `UserModel::getRights()`. WorkHub has a *separate* `wh_role` column (worker/planner/manager/finance/client) that fully overrides the billing role while inside WorkHub — a WorkHub worker with `wh_role=NULL` defaults to `'worker'`, never inherits a billing owner/admin role. This separation was a deliberate fix (see git history around the WorkHub module's introduction); don't assume the two role systems can be merged or that one implies the other.

### Frontend routing is hand-rolled hash routing, not react-router
`src/App.tsx` maintains a `Screen` union type and switches on `window.location.hash` manually. Adding a new top-level screen requires touching **four** separate places in that one file, all of which must stay in sync: the `Screen` union type, the initial-hash-to-screen allow-list, the hash-change event listener's allow-list, and the hash-write-back effect's allow-list. Missing one means the screen renders when navigated to programmatically but the URL hash never updates (or vice versa). Screens meant to work for both guests and logged-in users are rendered in the top-level block *before* the `if (!isAuthenticated)` branch (e.g. the `impressum`/`mockups` blocks) — screens rendered *inside* that branch (like `PackageComparison`) are only reachable while logged out.

### WorkHub's background automation lives in one hook, not in the widgets that display it
`src/hooks/useWorkhubTimerGuardian.ts` is the single owner of the ArbZG break-compliance auto-pause, the forgot-to-stop-timer / forgot-to-resume-from-break reminder ladders, and their auto-stop/auto-resume fallback actions. It's mounted once at `WorkHubLayout`'s root, deliberately *not* inside `TimerWidget` or `TimerPip` (both of which just render the current state) — an earlier version had this logic duplicated per-widget, which meant it silently stopped running whenever the user was on a tab that didn't render the timer widget. If you touch timer behavior, check this hook first, not the display components.

### i18n: one lead language, enforced parity
`src/translations/{en,de,fr,it,pl,ar}.ts`, consumed via `useLanguage()`. EN is the lead structure; `src/tests/i18n/coverage.test.ts` fails if any language is missing a key EN has. Always add new keys to all six files in the same commit — the test isn't optional CI decoration, it's the only thing preventing silent fallback-to-English in production.

### UI/UX gaps against the global design checklist (see global `CLAUDE.md` §3)
This repo has an existing audit trail for exactly this — don't re-derive it from scratch:
- **`backup/buttons.md`** (moved from repo root during a cleanup pass) is a full sweep of ~110 files for the accessibility/naming-consistency issues the global checklist's "Aria" concern maps to. The single most common finding: icon-only buttons with no `aria-label`/`title`, repeated across nearly every screen. It also found real bugs (dead buttons with no handler, a "Send Reminder" action that only shows a toast) — read it before assuming a button's label matches what it actually does.
- **Table/list build-form gaps**: WorkHub's `TaskList`/`KanbanBoard` still lack **saved/named filter views** and **clipboard-round-trip export**. `InvoiceList` gained both this cycle (`src/hooks/useSavedFilterViews.ts`, a localStorage-based saved-views dropdown, plus a corrected round-trippable CSV export); `LetterList` gained the export but not saved views yet. See `backup/ui_backlog.md` for the full page-by-page detail.
- Contrast ratios and the filter-bar-above-the-table placement rule are informally followed in most existing list views (shadcn/Tailwind defaults land close to 4.5:1), but haven't been formally checked against the 4.5:1 number anywhere.

### Public API surface follows one convention: `/api/public/...`
Guest-reachable endpoints (CMS page content/nav, invoice share links, the Mockups browser) are namespaced under `api/public/...` in `api/app/Config/Routes.php` and individually allow-listed in `UnifiedAuthFilter::isPublicRoute()`. Follow this pattern for any new guest-facing endpoint rather than inventing a new one; it's also mirrored on the frontend by axios calls that hit `${API_URL}/api/public/...` directly rather than through the authenticated `api`/`adminApi` axios instances in `src/services/`.

### Deployment reality: shared hosting, no terminal
Production runs on a shared host (LiveConfig control panel) with **FTP and phpMyAdmin only — no SSH/terminal, no Composer or npm on the server**. This shapes several things that would otherwise look like odd choices:
- Frontend deploys are a local `npm run build` with the resulting `dist/` uploaded wholesale via FTP — there is no way to deploy "just one changed file" for the frontend.
- Backend PHP files can be updated individually via FTP, but `vendor/` is built locally and uploaded, never installed on the server.
- Migrations/seeders can't run via interactive `php spark migrate` in production. The agreed approach (not yet built as of this writing) is small dedicated PHP entry files under `api/public/cron/` that each hardcode one `Services::commands()->run(...)` call, triggered via the host's cron-job UI — because that UI accepts a PHP file to run but arguments aren't guaranteed to pass through, so per-task files sidestep that entirely rather than trying to pass `spark migrate` as a cron argument.
- Don't suggest Docker for production deployment — it isn't an option on this hosting tier. (`docker-compose.test.yml` exists only for the local/CI test database, not production.)

### Noise directories at the repo root
`WorkHub_saas/`, `landing_page/`, `mn-hospitality-bundle/` are standalone single-file HTML mockup/spec deliverables (part of the mockup → approval → production workflow this team uses), not part of the running app and not wired into the Vite build. `scratch/` and `tobe_delete/` are gitignored scratch space. Don't try to import from or build these into the main app.

### `vite preview` proxies to production, not localhost
`vite.config.ts`'s `preview` block proxies `/api` and `/billing` to `https://humpl.org/` (production), not a local backend. Running `npm run preview` will talk to the real production API unless you know this — it's intentional for testing the production build's static assets, but easy to be surprised by.

### Two governance-master updates worth knowing before touching WorkHub or billing (v0.57, see `backup/changes.md`)
- **WorkHub's task/Kanban logic is explicitly named as a candidate for absorption into a generic, cross-app capability service** (universemaster §2 v0.52: "one base function = one switchable service", not a parallel per-app build). Not an instruction to refactor now — but a WorkHub task-system change made without this in mind deepens a divergence the master already flagged.
- **Billing/invoice data now has an explicit periodic-human-audit rule** (universemaster §2 v0.53), triggered directly by feedback from this project's own stakeholder ("don't rely 100% on automation for payments and billing"). This is on top of, not a substitute for, the still-open `backup/backlog_gaps.md` "Do first" finding that invoices remain editable/deletable after `sent`/`paid` with no correction workflow — fixing the ledger-integrity gap doesn't by itself satisfy the new rule; someone still needs to actually look at billing data by hand, periodically, witnessed.
