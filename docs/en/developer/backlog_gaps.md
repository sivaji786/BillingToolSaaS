# Governance Gap Backlog

Gap analysis of this codebase against the global development guidelines (`~/.claude/CLAUDE.md`, distilled from `universemaster_v0_44_EN.md`) and this project's own `CLAUDE.md`. Compiled 2026-07-16 via direct code inspection (file:line evidence throughout — nothing here is inferred from documentation alone unless stated).

**Severity legend:** 🔴 Critical (fix now) · 🟠 High (real risk, not urgent-today) · 🟡 Medium · 🟢 Low/backlog. Each item also carries the source rule's priority tag (`[HARD]`/`[STANDARD]`) from the guidelines.

**Verdict legend:** ✅ Compliant · 🟡 Partial · ❌ Gap.

---

## Do first

| # | Finding | Why it's first |
|---|---|---|
| 1 | **`/admin/*` API group has no server-side admin check at all** | `Routes.php:253` gates the entire SA-Admin surface with just `filter => 'auth'`. Any valid tenant-customer JWT passes through — no code anywhere checks the JWT's `type` claim before allowing user suspension, API-key mint/revoke, revenue data, CMS delete, ticket reassignment. Unconditionally exploitable today, not contingent on misconfiguration. |
| 2 | **WorkHub role self-escalation** | `PATCH /workhub/workers/{id}/role` (`WorkerController::setRole`, line 143) is gated by `rbac:workhub.task.view` — a right held by every WorkHub role including Worker and Client. No inline privilege check. Any WorkHub worker can PATCH their own `wh_role` to `manager`/`finance` and inherit task-delete/project-delete/billing rights. Also unconditionally exploitable today. |
| 3 | **Hardcoded JWT signing-key fallback**, repeated across 4+ files | If `JWT_SECRET` is ever unset in any environment, auth tokens become forgeable with a secret now sitting in git history. |
| 4 | **Invoices can be edited/deleted after `sent`/`paid`**, no correction mechanism | Financial/legal documents with no immutability — direct conflict with `[HARD]` ledger-integrity rule, and WorkHub already has the correct pattern to copy. |
| 5 | **Real personal data hardcoded in a deployable seeder** | `FullModuleTestSeeder.php:430-448` seeds live login accounts using the actual developer's real name/email (`sivaji@medianet-home.de`), not fabricated data — direct violation of "no real personal data, ever." Lives in `Database/Seeds/` (deployable), not `api/tests/`. |

Findings #1–#2 are new (route-guard sweep below). #3–#4 detail is in §2. #5 detail is in the new §10.

---

## 1. Security — injection protection `[HARD]`

**Verdict: 🟡 Partial.**

| Vector | Status | Evidence |
|---|---|---|
| SQL/ORM injection | 🟡 Partial | Query Builder/parameter binding used almost everywhere. One raw string-interpolated query: `api/app/Controllers/AdminWorkHub.php:52` (`WHERE tenant_id = {$tenantId}` inside `$db->query()`). Not currently exploitable ($tenantId is cast `(int)` at line 29) but violates the parameterized-query convention. 🟢 |
| Mass assignment | ✅ Compliant | Models use `protectFields = true` + explicit `$allowedFields` (`api/app/Models/InvoiceModel.php:14-15`, `AdminUserModel.php:14-15`). Controllers hand-build allowlisted update arrays instead of blind `$model->save($request->getJSON())` (`UserController.php:90-108`, `TicketController.php:449-451`). |
| XSS | ❌ Gap 🟠 | `dangerouslySetInnerHTML` used with tenant-controlled HTML, **no sanitizer library in the project at all** (no `dompurify`/`sanitize-html` in `package.json`): `src/components/screens/InvoicePreview.tsx:545,680,764`, `src/components/screens/LetterPreview.tsx:321,419,547`, `src/components/cms/InlineEditableRich.tsx:80,159`, `src/components/invoice/TemplateDesignLayout.tsx:443,449`. PHP email views also echo unescaped variables without `esc()`: `api/app/Views/emails/usage_alert.php:22,26,30,33`. |
| Prompt injection | ❌ Gap 🟠 | No sanitizer/parser precedes any LLM call — raw user text concatenated straight into system prompts. See §5 (AI governance) for full detail; evidence at `api/app/Controllers/AIInvoiceController.php:204,310` and `api/app/Controllers/WorkHub/AIController.php:53-69,135-172`. |
| Schema-row injection (bulk ops) | ✅ Compliant | `TicketController::bulkUpdate()` (`api/app/Controllers/TicketController.php:424-469`) validates status against an enum and builds an explicit `$fields` array. |

**Backlog items:**
- [ ] 🟠 Add a sanitizer (e.g. DOMPurify) wherever tenant-authored HTML is rendered via `dangerouslySetInnerHTML`, and `esc()` the PHP email view variables.
- [ ] 🟠 Add an escaping/delimiter step before user text enters any AI prompt (see §5).
- [ ] 🟢 Rewrite `AdminWorkHub.php:52` to use query-builder parameter binding instead of string interpolation, even though not currently exploitable.

---

## 2. Security — crypto over policy `[HARD]`, and financial ledger integrity `[HARD]`

**Verdict: 🟡 Partial / ❌ Gap (invoices).**

- **Passwords**: ✅ hashed via `password_hash`/`password_verify` (`api/app/Models/UserModel.php:49,74,88`).
- **SSO secrets (client_secret, sp_private_key)**: 🟡 genuinely AES-256-GCM encrypted at rest (`api/app/Models/TenantSsoConfigModel.php:44-73`) — **but** if `SSO_ENCRYPTION_KEY` is unset, `encryptValue`/`decryptValue` silently return the plaintext unchanged (lines 46, 63). Encryption degrades to no-op instead of failing closed.
- **🔴 JWT secret — hardcoded fallback literal**: the same secret value (`e88f7de29c95b084f1eb22e69093c3dafaa85f84eca6bbe0c8a94b8f4590df3e`) is hardcoded as a fallback in `api/app/Controllers/AdminAuth.php:130,163`, `api/app/Controllers/InvoiceController.php:229`, `api/app/Controllers/BusinessLetterController.php:123`, and `api/app/Filters/RbacFilter.php:42`. Also `api/app/Controllers/Database.php:165` falls back to the literal string `'your-secret-key-change-this-in-production'`, and `api/app/Controllers/QuickAccessAuth.php:379` falls back to `'fallback_secret'`. **If `JWT_SECRET` is ever unset in any environment, tokens become forgeable.** This should fail closed (refuse to issue/verify tokens), not fall back to a known value.
- **Audit log "signed" field**: `api/app/Traits/AuditTrait.php:70,110` writes `signed => 0/1` as a plain boolean — no actual cryptographic signature or hash chain is computed anywhere. "Signed" is naming, not a mechanism. (Immutability today exists only because `AuditLogController.php` never implements update/delete routes — by omission, not by DB-level enforcement.)
- **🔴 Invoice ledger mutability**: `InvoiceController::update()` (`api/app/Controllers/InvoiceController.php:260-316`) allows `sent→sent` and `paid→paid` "updates" (lines 274-284) and unconditionally deletes+reinserts all `invoice_lines` (295-301) regardless of status — no field lock once sent/paid. `delete()` (318-336) has **no status guard at all**: a `paid` invoice can be hard-deleted exactly like a draft. No credit-note/reversal workflow exists anywhere in `api/` (only a UI type-code at `src/types/invoice.ts:70`, never implemented). **Contrast with WorkHub, which does this correctly already**: `api/app/Controllers/WorkHub/TimeEntryController.php:9-14` states entries are "immutable per §16 ArbZG"; `correct()` (79-176) never mutates the original row, only inserts into `workhub_time_entry_corrections` (150) with a mandatory reason and before/after snapshot. **This is the pattern to copy for invoices.**

**Backlog items:**
- [ ] 🔴 Remove every hardcoded JWT/encryption-key fallback; fail closed (throw/500) if the env var is unset, in all 6 files listed above. Rotate `JWT_SECRET` in every environment once this ships, since the old fallback value is now effectively public.
- [ ] 🔴 Block `update()`/`delete()` on invoices once status is `sent`/`validated`/`paid`; add a genuine correction/credit-note workflow modeled on `workhub_time_entry_corrections`.
- [ ] 🟠 Make `SSO_ENCRYPTION_KEY` fail closed instead of silently degrading to plaintext.
- [ ] 🟡 Either implement real audit-log signing (hash chain) or rename the `signed` field so it stops implying a guarantee that doesn't exist.

---

## 3. Security — audit trail on every write `[HARD]`

**Verdict: 🟡 Partial, inconsistent.**

`AuditTrait` (`api/app/Traits/AuditTrait.php`) has a good schema (actor, tenant, action, before/after, IP, timestamp) and is used by: AdminAnalytics, AdminPackageServices, AdminPackages, AdminUsers, BuyerController, CompanyProfileController, InvoiceController, OidcController, SamlController, SsoController, SsoSettingsController, all `WorkHub/*` controllers.

**Sensitive write endpoints with zero audit logging:**
- `UserController::create()/update()` (`api/app/Controllers/UserController.php:37,79`)
- `RoleController::create()/update()/delete()` (`api/app/Controllers/RoleController.php:55,82,113`) — role/permission changes are unaudited
- `TicketController::create()/update()/bulkUpdate()` (`api/app/Controllers/TicketController.php:154,305,424`)
- `AdminSettings::updateProfile/changePassword/updateSystemSettings/generateApiKey/revokeApiKey` (`api/app/Controllers/AdminSettings.php:71,92,116,166,192`) — **password changes and API key generation/revocation are unaudited**
- `AdminWorkHub::toggleTenant()/overrideQuota()` (`api/app/Controllers/AdminWorkHub.php:96,136`)
- `AdminBilling` has its own private `logAction()` used only in `create()` (line 300); `show`/`downloadPdf`/`revenue` untouched (lower risk, read-only)
- No trait usage at all in: `AIInvoiceController`, `AdminAuth`, `AdminWiki`, `CmsController`, `CompanyTypeController`, `CountryController`, `Customer`, `InvoiceTemplateController`, `Onboarding`, `ProfileController`, `QuickAccessAuth`, `RightController`, `Webhooks`, `WorkspaceController`

**Backlog items:**
- [ ] 🟠 Add audit logging to `AdminSettings`'s password-change and API-key endpoints first — highest-sensitivity gap on the list.
- [ ] 🟠 Add audit logging to `RoleController` (permission changes) and `UserController` (user create/update).
- [ ] 🟡 Add audit logging to `TicketController`'s status/assignment changes.
- [ ] 🟢 Sweep the remaining unaudited controllers as time allows.

---

## 4. AI feature governance `[HARD]`

**Verdict: ❌ Gap (adapter, data-classification, provider allowlist) / 🟡 Partial (off-switch) / ✅ Compliant (human-confirms-before-commit, for the 2 flows checked).**

Four AI-touching backend features found, **each calling Gemini directly with no shared abstraction** — a violation of the "one source of truth" rule (§1) as much as the AI-adapter rule:
1. WorkHub "Correct with AI" / translate — `api/app/Controllers/WorkHub/AIController.php` (has a 3-model retry cascade: `gemini-2.5-flash`→`2.0-flash`→`2.0-flash-lite`, lines 181,190-226)
2. AI Invoice Assistant — `api/app/Controllers/AIInvoiceController.php` (three near-duplicate `callGeminiAPI*` methods, lines 115-237,242-333,495-554, each hardcodes only `gemini-2.5-flash`, **no retry/fallback** — inconsistent with #1)
3. Workspace "Ask AI" file search — `api/app/Controllers/WorkspaceController.php:678-830` (fourth independent inline call, also single-model, no fallback)
4. HelpChatBot (`src/components/HelpChatBot.tsx`) — confirmed **not** an AI feature, rule-based FAQ tree, no API calls.

- **AI behind an adapter**: ❌ Gap. `GEMINI_API_KEY` read independently via `env()` in all 3 real AI features; each constructs its own HTTP client and hardcodes the Gemini URL. No shared service/interface — swapping providers means editing 3+ files, and the inconsistent retry logic between #1 and #2/#3 is a direct symptom of the duplication.
- **Data-classification gate before external AI calls**: ❌ Gap. No redaction/PII filter anywhere. Customer name/address/email/phone go straight into the Gemini prompt via `json_encode()` at `AIInvoiceController.php:130,204,310`; task completion notes go in unfiltered at `AIController.php:64-65` (only length-capped, not content-filtered); the Workspace DB schema description and user's free-text query are sent as-is (`WorkspaceController.php:717-721`).
- **AI as accelerator, not load-bearing**: 🟡 Partial. No explicit admin on/off switch exists anywhere (confirmed no feature-flag pattern). Degradation is reactive-only (try/catch on missing-key/failed-call), and error quality is inconsistent — `AIInvoiceController.php:56` leaks the raw exception message to the client. That said, every AI feature does sit next to a fully independent manual/non-AI path (manual invoice editing, plain-text search toggle in Workspace, editable-without-AI completion notes), so the *app* doesn't break — there's just no proactive kill switch.
- **Human confirms before commit**: ✅ Compliant, for the 2 flows checked. WorkHub correct-with-AI has explicit per-change Accept/Reject (`AICorrectField.tsx:53-62,92-143`); the AI Invoice Assistant only updates in-memory editor state after an explicit "Use this invoice/letter" click, still requiring a further manual Save.
- **Provider approval/allowlist**: ❌ Gap, and notably there's **dead code for exactly this**: migration `api/app/Database/Migrations/2026-02-02-145807_AddAiSettingsToTenants.php:9-29` adds `tenants.ai_provider` ENUM(`gemini`,`openai`) + per-tenant key columns; `TenantModel.php:18` and `Customer.php:293-295` let a tenant admin configure it via API — but **none of the 4 AI call sites ever reads it**. They all call the global `env('GEMINI_API_KEY')` unconditionally, and no OpenAI code path exists despite the enum allowing it.

**Backlog items:**
- [ ] 🟠 Build one shared `AiService`/adapter that all 3 real AI features call through, with the retry cascade from `AIController.php` as the baseline behavior everywhere.
- [ ] 🟠 Either wire up the existing `tenants.ai_provider`/per-tenant-key columns to actually be read by that adapter, or remove the dead migration/columns — right now they imply a capability that doesn't exist.
- [ ] 🟠 Add a data-classification/redaction step before any tenant data enters a prompt — at minimum, strip customer PII (name/email/address/phone) from the invoice-assistant prompt before sending.
- [ ] 🟡 Add a real admin-facing AI on/off toggle (even a single global env-driven flag would satisfy the letter of the rule) rather than relying on incidental try/catch degradation.
- [ ] 🟢 Stop leaking raw exception text to the client in `AIInvoiceController.php:56`.

---

## 5. Task/ticket ownership & escalation `[HARD]`

**Verdict: ❌ Gap.**

- **Tickets**: `assigned_to` is nullable and not required at creation (`TicketController::create()`, `api/app/Controllers/TicketController.php:154-293`; `TicketModel::$validationRules`, `api/app/Models/TicketModel.php:30-36` has no owner requirement). `first_response_at`/`resolved_at` are stamped *after the fact*, not enforced as a due-by SLA — there's no deadline field checked against anything.
- **WorkHub tasks**: `assigned_worker_id` is in `allowedFields` but absent from validation rules (`WorkhubTaskModel.php:27-35`) — `TaskController::create()` only requires `title` (`api/app/Controllers/WorkHub/TaskController.php:217-219`); a task can be created and left unassigned indefinitely.
- **Escalation**: a repo-wide search for `escalat*` across `api/app` and `src` returns **zero hits**. None of the 5 scheduled Commands (`api/app/Commands/*.php`) checks "unassigned N days" or an SLA breach.
- **Cron caretaker/heartbeat**: `api/cron.sh` runs its 3 jobs with no verification beyond log redirection; a search for `heartbeat|last_run|monitor|watchdog|healthcheck` returns zero hits. Nothing detects a silently-stopped cron job, and no caretaker role is defined for noticing.

(Note: the timer-reminder-ladder work done earlier this cycle — `useWorkhubTimerGuardian.ts` — solves this exact problem for *forgotten timers/breaks* specifically. The gap here is that the same discipline was never generalized to plain ticket/task assignment or to cron-job health.)

**Backlog items:**
- [ ] 🟠 Require an assignee (or an explicit "unassigned, routed to triage queue" state with its own escalation) at ticket/task creation, or add a scheduled check that flags tickets/tasks unassigned past a threshold.
- [ ] 🟡 Add a last-run timestamp write at the end of each cron command, and a health-check endpoint/alert if it's stale.
- [ ] 🟢 Once the above exists, generalize the WorkHub timer-guardian pattern (reminder ladder → auto-action fallback) to ticket SLAs.

---

## 6. Release gates — rule-coverage evidence `[HARD]`

**Verdict: ❌ Gap, one narrow precedent to build from.**

No general mechanism maps completed features to governance rules anywhere in the repo. The closest analog is `docs/en/Modules/workhub-compliance.md` (referenced from `docs/en/Modules/workhub.md:292,341`), which maps WorkHub features to specific *legal* requirements (§16 ArbZG, eIDAS, GDPR, §257 HGB, BSI IT-Grundschutz) — a real, useful doc, but one-off, not enforced by CI, and not generalized to house governance rules (ownership/deadline/escalation, caretaker roles, deploy gates, the rules in this very backlog).

**Backlog items:**
- [ ] 🟢 Once a few items from this backlog ship, try turning `workhub-compliance.md`'s mapping-table format into a lightweight per-feature template (rule → implementation location → status) rather than building new tooling from zero.

---

## 7. Deployment & operations `[STANDARD]`/`[HARD]`

**Verdict: 🟡 Partial (docs exist, contradict real constraints) / ❌ Gap (no deploy pipeline, advisory-only compliance gate).**

- **Migration wrapper scripts**: confirmed still absent — `api/public/cron/` does not exist. (Known gap from the prior session's mail-reply discussion; this just re-confirms nothing has been built yet.)
- **Rollback documentation is inconsistent with the actual hosting target**: `docs/en/Modules/WorkHub_Gap_Analysis.md:566,594-596` describes `git reset --hard` and `php spark migrate:rollback` — both assume SSH/git/terminal access that doesn't exist on the production LiveConfig shared host. `backup/mailreply.md:105-144` has the *realistic* version (FTP re-upload of an archived previous `dist/`+`vendor/` build) but that's a proposal in a mail draft, not implemented tooling.
- **No deploy step exists in any CI workflow.** All three GitHub Actions workflows (`push-gate.yml`, `pr-full.yml`, `nightly.yml`) were checked for `deploy|ssh|ftp|scp|rsync|LiveConfig` — zero matches. They're test/CI gates only (`push-gate.yml` runs `php spark migrate --all` against an ephemeral CI database, not production); no artifact ever leaves GitHub Actions.
- **Go-live compliance gate is advisory only.** `CI_ENVIRONMENT` is CodeIgniter4's stock environment switch, read by the framework itself — nothing wraps it in a custom guard. Privacy Policy / Impressum are plain CMS rows seeded with placeholder text (`api/app/Database/Migrations/2026-04-18-000001_SeedCmsContent.php:23-24,53,91`); no code checks CMS content completeness before allowing `production` mode. A tenant could go live with empty/placeholder legal pages and nothing blocks it.

**Backlog items:**
- [ ] 🟠 Build the `api/public/cron/*.php` migration/seeder wrapper files (design already agreed, just not built — see project `CLAUDE.md` §Deployment reality).
- [ ] 🟡 Rewrite the rollback section of `WorkHub_Gap_Analysis.md` to match the real hosting constraint instead of assuming SSH/git access; point at the FTP-archive approach from `backup/mailreply.md` instead.
- [ ] 🟡 Add an actual go-live gate: block (or at minimum loudly warn) `CI_ENVIRONMENT=production` if mandatory CMS legal pages still contain seed/placeholder content.
- [ ] 🟢 Decide whether a real deploy step ever gets automated given the FTP-only hosting constraint, or whether the CI workflows stay test-gates-only by design — either is fine, but it should be a stated decision, not an accidental gap.

---

## 8. UI/UX design guidelines `[STANDARD]`/`[CONVENTION]` — full checklist re-audited 2026-07-16

**Verdict: ❌ Gap across most sub-rules.** The previous pass only cross-referenced `backup/buttons.md` (accessibility/button-behavior) plus 2 table-view gaps and left 5 more rules from the global checklist unchecked. All are now audited; the most surprising results are marked ⭐.

### 8a. Buttons/accessibility — see `backup/buttons.md` (not re-audited here, still current)
Icon-only buttons missing `aria-label`/`title` (most common finding), dead buttons with no handler, a "Send Reminder" that only toasts with no backing API call — the `[HARD]` "display ≠ gate" antipattern, inverted (looks actionable, isn't).

### 8b. Table/list baseline capability set + filter-bar placement
No table/list view anywhere supports user-driven column show/hide/reorder or true per-column filtering (only global dropdowns). Detail by view:

| View | Per-col sort | Search scope | Count = filtered rows? | Truncation | Empty state |
|---|---|---|---|---|---|
| InvoiceList / LetterList | ❌ global dropdown only | ✅ multi-field, backend-matched | ✅ accurate ("X to Y of Z"), unbounded `findAll()` | None | ✅ specific |
| Admin `SATickets` | ✅ real header-click sort | ✅ multi-field | ✅ accurate | None | ✅ specific |
| **WorkHub `TaskList`/`KanbanBoard`/`FinanceTable`** | ❌ | 🟡 client-side only, searches just the fetched page | **❌ lies** — shown count is the truncated page size, not the true total | **⭐🟠 Yes, confirmed**: `WorkHubLayout.tsx:76-87` calls `taskService.list()` with no `per_page`; backend defaults to 20 (`TaskController.php:47`); `pagination.total` is computed server-side but **never read anywhere in the frontend** (verified: zero matches for `pagination` in any WorkHub component). `FinanceTable.tsx:53` hardcodes `per_page: 100` with the same blind spot at a higher ceiling. | 🟡 generic, doesn't distinguish filtered-empty from truly-empty |
| Admin `UserList` | ❌ | ❌ none | ❌ no counter | None (small dataset) | **⭐❌ None at all** — `UserList.tsx:61-85` maps over `users` with no zero-length branch; an empty result renders a blank `<tbody>`, not a message |
| Admin `RoleList`/`CompanyTypeList` | ❌ | ❌ | ❌ | None | 🟡/✅ |

This is more than cosmetic: a manager filtering WorkHub tasks by worker/date sees a task count that can silently omit real tasks beyond page 1, with nothing on screen suggesting more exist — directly contradicts the "12,944 of 1,304,328 stays visible" rule and could cause a manager to under-assign or miss overdue work.

### 8c. Locale-aware time display — ❌ Gap
Zero timezone-aware logic exists anywhere in the frontend (`Intl.DateTimeFormat`/`timeZone`/`date-fns-tz`/`luxon`/`moment-timezone` — all zero matches, repo-wide). Shared, multi-user surfaces pairing a name with a time render both as raw local strings with no timezone context: `WorkHub/TaskDetail.tsx:108,134` (assignee + due date), `KanbanBoard.tsx:531` (due date via `format()`, no TZ), `WorkHubTimesheet.tsx:419,447` (sign-off time + worker name), `WorkHubInbox.tsx:176,208` (sender + timestamp). `ActivityLog.tsx:47-59` (the audit trail itself) hardcodes `toLocaleDateString('en-US', ...)` — not even locale-correct for non-US viewers, on top of having no timezone indicator.

### 8d. Language auto-switch reversibility — N/A, rule doesn't apply
`LanguageContext.tsx:14` hardcodes `useState<Language>('en')` as the initial value; no `navigator.language`/geolocation-based auto-detection exists anywhere. Language only changes via explicit manual `LanguageSwitcher` action. Since no automatic locale decision is ever made, the "trapped after an auto-switch" scenario this rule guards against cannot occur.

### 8e. Persistent chrome stays persistent — ❌ Gap (contradicts its own code comments)
- `FloatingDock` container is genuinely global (`App.tsx:1256`, mounted outside the screen switch). ✅
- **⭐ But `TicketingWidget` — commented "order 1 = Support Ticket (always visible)" (`FloatingDock.tsx:10-12`) — is only mounted at `App.tsx:1236`, past the `if (!isAuthenticated)` early return at line 910.** Verified directly: every logged-out screen (landing, login, signup, legal pages, mockups, shared-invoice, quick-access) never renders it, contradicting its own comment.
- **⭐ `WorkHubQuickActions.tsx`** — built per its own doc-comment as a persistent dock launcher (WH-074) — is dead code. Verified: `grep -rn "WorkHubQuickActions" src/` finds only its own definition, zero consumers anywhere in the app.

### 8f. "Prove it, don't claim it" — ❌ Gap, one clear worst offender
Most landing-page capability claims (custom templates, "bank-grade security," PDF export, API access, advanced analytics) are copy with zero visual backing — no screenshot, no embed, no interactive widget. The **worst finding**: the About-Us section's product visual (`LandingPage.tsx:532-571`) is not a screenshot at all — it's hand-coded CSS divs simulating a dashboard (fake chart bars, fake list rows), presented as if it were the real product. That's worse than a static screenshot: a fabricated visual claiming to be proof. The one genuine compliant example: the multi-language/RTL claim is proven live via the always-present `LanguageSwitcher`, which actually re-renders the page and flips direction on click (`LanguageContext.tsx:20`).

### 8g. Formal contrast measurement — ⭐ ❌ Gap, and it's a known-and-abandoned gap, not an oversight
`@axe-core/playwright` is installed and wired into `e2e/a11y/accessibility.spec.ts`, but **`color-contrast` is explicitly disabled in all 3 places that suite runs** (`accessibility.spec.ts:45,109,143`), each with the same comment: `// checked separately via computed style tests`. That separate test **does not exist anywhere in the repo** — verified via a repo-wide search for `getComputedStyle`/`contrast` across `e2e/` and `src/tests/`, which turns up no such test. The team clearly intended a formal contrast check, wired the exclusion for it, and then never built the replacement — so contrast today is checked nowhere at all, automated or manual, despite looking like it's covered.

**Backlog items:**
- [ ] 🟠 Fix WorkHub's count-lies-about-truncation: either pass `per_page`/pagination controls through `TaskList`/`KanbanBoard`/`FinanceTable` and surface `pagination.total`, or explicitly cap and say so ("showing first 20 of N — refine filters").
- [ ] 🟡 Add a real empty-state branch to `UserList.tsx`.
- [ ] 🟡 Either build the promised computed-style contrast test (`accessibility.spec.ts`'s own comment describes exactly what's missing) or re-enable the axe `color-contrast` rule if a dedicated test isn't going to happen.
- [ ] 🟡 Mount `TicketingWidget` (or an equivalent guest-support entry point) outside the `isAuthenticated` gate if it's meant to be reachable by logged-out visitors too — or update its own comment/scope if "always visible" was only ever meant to mean "always visible once logged in."
- [ ] 🟢 Delete `WorkHubQuickActions.tsx` (confirmed dead code) or actually wire it into `FloatingDock` if the feature is still wanted.
- [ ] 🟢 Replace the fake CSS-mockup dashboard visual in `LandingPage.tsx:532-571` with a real screenshot or a live embed.
- [ ] 🟢 Add basic timezone display (viewer-vs-actor) to WorkHub's timesheet/task-detail/inbox views — lowest urgency since the whole team appears to be single-timezone today, but the rule is unconditional.
- [ ] 🟢 Saved/named filter views + clipboard-round-trip export remain unimplemented anywhere (carried over from the prior pass).

See `backup/buttons.md` directly for the full per-file button/accessibility list (8a).

---

## 9. Documentation & knowledge `[STANDARD]`

**Verdict: ❌ Gap.**

- No systematic as-of-date/review-interval marking exists across `docs/` — freshness is informal (filenames sometimes carry a date, e.g. the product-manager status reports, but that's a convention for one doc type, not a general mechanism).
- `README.md:11` links to `CONSOLIDATED_DOCUMENTATION.md`, which **does not exist** in the repo — a stale reference discovered while researching this backlog, not previously reported anywhere. Anyone following the README's own instructions hits a dead link on their first click.

**Backlog items:**
- [ ] 🟢 Fix or remove the `CONSOLIDATED_DOCUMENTATION.md` link in `README.md`.
- [ ] 🟢 No urgency on a general staleness-marking mechanism — revisit if the docs volume grows enough that "which of these is still true" becomes a real problem.

---

## 10. Visibility ≠ security — dedicated route-guard sweep `[STANDARD]`

**Verdict: ❌ Gap — 2 critical, 1 high.** (Re-audited 2026-07-16; the prior pass explicitly skipped this. Both critical rows below were independently confirmed by reading the actual controller/filter source, not just agent-reported.)

| Capability | UI gate | Backend endpoint | Server-side check? | Verdict |
|---|---|---|---|---|
| SA-Admin: suspend/activate users, API key gen/revoke, revenue, ticket assignment, CMS/wiki write, company-type mutation | `src/App.tsx:1279,1306,1315` (`useAdminStore().isAuthenticated`, client-side only) | `AdminUsers.php`, `AdminSettings.php:310-311`, `AdminBilling.php`, `TicketController.php:303`, `AdminWiki.php`, `CmsController.php`, `CompanyTypeController.php` (all under `Routes.php:253` group, filter `auth` only) | **N** — confirmed: `UnifiedAuthFilter.php:136` sets `$request->userType` from the JWT's `type` claim but never checks it anywhere; the file explicitly skips the tenant requirement for `/admin/` (line 113) and adds nothing in its place. Controllers extend plain `ResourceController`/`BaseController`, no admin check added. | 🔴 **CRITICAL** |
| WorkHub worker role assignment (privilege escalation) | `Settings.tsx:124-126` (`seesWhSettings`) | `WorkerController::setRole/store/destroy` (`Routes.php:433-435`, filter `rbac:workhub.task.view`) | **N** — confirmed: `workhub.task.view` is granted to every WorkHub role including Worker and Client (`WorkHubRightsSeeder.php:20,52`); `setRole()` body (`WorkerController.php:143-167`) only validates the role-name enum, no privilege check before the `update()` call at line 164. | 🔴 **CRITICAL** |
| SSO/SAML config (client_secret, sso_only, IdP URLs) | `Settings.tsx:114,698` (`isAdmin`) | `SsoSettingsController::update` (`Routes.php:164`, filter `auth` only) | **N** — no role check despite the route's own comment calling it "tenant admin" (`SsoSettingsController.php:69-99`) | 🟠 HIGH |
| WorkHub settings (hourly rate/currency) | `Settings.tsx:124-126` | `SettingsController::update` (`Routes.php:486`) | **Y** — `isPrivilegedUser()` re-checks wh_role/super-admin server-side (`SettingsController.php:28-50,86-88`) | ✅ PASS |
| WorkHub task/project delete | `TaskDetail.tsx:83`, `WorkHubLayout.tsx:208` | `TaskController::delete`, `ProjectController::delete` (`rbac:workhub.task.delete`/`workhub.project.manage`) | **Y** — rights correctly scoped to Manager only | ✅ PASS |
| Tenant role/user management, invoice delete/status override | Admin screens | `RoleController`, `UserController`, `InvoiceController` (dedicated `rbac:*` filters) | **Y** | ✅ PASS |

The pass/fail split shows the pattern (`isPrivilegedUser()`-style server-side re-check) is known and used correctly in several places — `WorkerController` and the `/admin/*` group are inconsistent exceptions, not evidence the team doesn't know the rule.

**Backlog items:**
- [ ] 🔴 Add an inline check in `UnifiedAuthFilter.php` (or a dedicated `admin` filter) that rejects any `/admin/*` request unless the JWT's `type` claim is the admin type — this is the single highest-severity item in this entire document, above even the JWT-secret fallback, because it requires no misconfiguration to exploit.
- [ ] 🔴 Add a privileged-role check to `WorkerController::setRole/store/destroy` mirroring `SettingsController::isPrivilegedUser()` before any `wh_role` mutation.
- [ ] 🟠 Add a tenant-admin/owner check to `SsoSettingsController::update`.

---

## 11. Data & content — demo/sample data labeling `[STANDARD]`, translation completeness `[STANDARD]`

**Translation completeness: ✅ Re-verified 2026-07-16.** `npx vitest run src/tests/i18n/coverage.test.ts` → 6/6 passing. No regression since the prior session's claim; this one genuinely held up.

**Demo/sample data labeling: ❌ Gap — refutes the prior session's recalled claim.** The earlier note ("WorkHub already shows a visible 'DEMO MODE' banner... likely compliant") was checked directly and is **wrong as stated**: no such banner exists anywhere in WorkHub's own code (`src/pages/WorkHub/*`, `src/components/screens/WorkHub/*` — exhaustive grep for `DEMO`/`banner`/`isDemo` finds only unrelated offline/ArbZG/signoff banners). The actual "DEMO MODE" system found lives inside one uploaded static client-mockup HTML file (`api/public/uploads/mockups/Staufenberg_Mockup_2026-07-09_0747.html:88`) — a real, well-built example (fictional-data note, "DEMO · Max Mustermann" watermark) but unrelated to WorkHub and not a general mechanism.

Real gaps found at the seeder level (all in `api/app/Database/Seeds/`, which is deployable, not `api/tests/`):
- 🔴 `FullModuleTestSeeder.php:430-448` hardcodes the actual developer's real name/email (`sivaji@medianet-home.de`, `sivaji@digitalks.in`) as login credentials — genuine personal data, not fabricated. Direct "no real personal data, ever" violation (listed in "Do first" above).
- ❌ `MainSeeder.php:283-337` seeds 12 realistic fake tenants/admins (e.g. "Nexus Quantum AI", `alex.rivera@nexus.ai`) with no DEMO marking anywhere a user/admin would see them in the UI — indistinguishable from real customers in the tenant list.
- 🟡 `MainSeeder.php:384,407` — invoice buyer/line-items are prefixed "Demo", but the seller/company name on the same invoice (from the unlabeled tenant above) isn't — half-labeled.
- 🟡 `WorkHubTestSeeder.php` — task titles prefixed "E2E ...", attached to the same unlabeled tenant.
- ✅ `BuyerSeeder.php:16-81` and the guest quick-access demo flow (`InlineQuickAccess.tsx:124-182`) are done correctly — obviously fictional company names / explicit "Demo mode" toast.

**Backlog items:**
- [ ] 🔴 Remove or replace the real personal data in `FullModuleTestSeeder.php:430-448` with fabricated credentials before this seeder is ever run against anything beyond a throwaway local DB.
- [ ] 🟠 Prefix seeded tenant/company/admin names in `MainSeeder.php` with a clear "Demo"/"Sample" marker, or move the seeder's output behind a visible sandbox banner shown wherever that data renders.
- [ ] 🟢 Fix the half-labeled invoice seller name in `MainSeeder.php:283-337` to match the already-labeled buyer/line-items.

---

## What wasn't (re-)audited here

- **Section 1 rules** (spec-before-code, disclosed assumptions, one-source-of-truth in general) are process rules, not statically checkable from code — not covered except where a concrete violation surfaced incidentally (the 3 duplicated AI call sites, §4). This one remains genuinely out of scope for a code audit, not a skipped check.
- Everything else previously listed here (visibility-vs-security route guards, demo-data labeling, translation completeness) has now been re-audited — see §10 and §11 above.
