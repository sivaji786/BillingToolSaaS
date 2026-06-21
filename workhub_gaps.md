# WorkHub Module — Gap Analysis
> Analysed: 2026-06-20  
> Scope: `/src/pages/WorkHub/`, `/src/components/screens/WorkHub/`, `workhubApi.ts`, timer/offline stores, tests

---

## 1. Missing Features & Dead Code

### 1.1 DoneReportModal — SMS/WhatsApp/Telegram Delivery Incomplete
- **File:** `src/components/screens/WorkHub/DoneReportModal.tsx`
- **Issue:** Step 7 UI presents 5 copy channels (email, SMS, WhatsApp, Telegram, none). `copy_channel` and `copy_recipient` fields are sent in the mutation payload, but backend integration for SMS/WhatsApp/Telegram is likely missing. Users can select these channels, but delivery silently fails.
- **Severity:** High

### 1.2 WorkHubSettings — No Per-Worker Hourly Rate Override UI
- **File:** `src/pages/WorkHub/WorkHubSettings.tsx`
- **Issue:** Comment in code says "Per-worker hourly rate overrides can be set in each worker's profile" but no UI exists. Only global default rate is configurable.
- **Severity:** Medium

### 1.3 NewTaskModal / TaskEditModal — Worker Role Not Shown in Selector
- **File:** `src/components/screens/WorkHub/NewTaskModal.tsx`
- **Issue:** Worker selector shows utilisation % and queue depth but never their WorkHub role (worker/planner/manager/client/finance). Risk of assigning a manager to execution-level work.
- **Severity:** Medium

### 1.4 TaskDetail — Completion Record Never Rendered
- **File:** `src/components/screens/WorkHub/TaskDetail.tsx`
- **Issue:** `WHCompletionRecord` type exists in `workhubApi.ts` and is part of `WHTask`, but TaskDetail never renders completion status, dual-signature state, or customer sign-off. Field is dead in the UI.
- **Severity:** Medium

### 1.5 KanbanBoard — External Integration Fields Not Displayed
- **File:** `src/components/screens/WorkHub/KanbanBoard.tsx`
- **Issue:** Cards never show `source_module`, `task_type`, `correlation_id`, or `pfe_ref_*` fields. TaskDetail renders these correctly, but the Kanban view loses all external-origin context.
- **Severity:** Low

### 1.6 TranslationToggle — Component Exists But Not Integrated
- **File:** `src/components/screens/WorkHub/TranslationToggle.tsx`
- **Issue:** File exists but is never imported or used in any screen.
- **Severity:** Low

### 1.7 UpgradePrompt — Component Exists But Not Wired Up
- **File:** `src/components/screens/WorkHub/UpgradePrompt.tsx`
- **Issue:** Component exists but is not rendered anywhere. WorkHubGate shows quota bars but no upgrade CTA in the active UI.
- **Severity:** Low

### 1.8 BatchLocationPanel — No Bulk Actions
- **File:** `src/components/screens/WorkHub/BatchLocationPanel.tsx`
- **Issue:** Shows related tasks at the same location but provides no bulk actions (e.g. "Assign all to same worker", "Move all to in_progress").
- **Severity:** Low

### 1.9 FinanceTable — Missing `total_price` Fallback
- **File:** `src/components/screens/WorkHub/FinanceTable.tsx`
- **Issue:** Materials total reads `m.total_price` directly. If backend does not pre-compute it, no `quantity * unit_price` fallback exists.
- **Severity:** Low

### 1.10 ProjectModal — No Validation When Customer Is Missing
- **File:** `src/components/screens/WorkHub/ProjectModal.tsx`
- **Issue:** `customerId` can be submitted as null without any UX warning, potentially orphaning projects with no customer link.
- **Severity:** Low

---

## 2. UX / Flow Gaps

### 2.1 §16 ArbZG — Break Compliance Not Enforced
- **File:** `src/components/screens/WorkHub/TimerWidget.tsx`
- **Issue:** Toast warns at 6 h and UI shows "Break required now", but the timer never auto-pauses or locks. Workers can accumulate unchecked ArbZG violations. **Legal liability risk.**
- **Severity:** Critical

### 2.2 Offline Sync — No Per-Item Progress Feedback
- **File:** `src/stores/workhubOfflineStore.ts`
- **Issue:** `flushOfflineQueue()` loops over all queued requests with no progress UI. For 50+ pending items the user sees a spinner for potentially 30+ seconds with no indication of what is syncing or failing.
- **Severity:** High

### 2.3 DoneReportModal — Photo Upload Has No Progress Bar
- **File:** `src/components/screens/WorkHub/DoneReportModal.tsx`
- **Issue:** Photos are uploaded via `fileService.upload()` but there is no visual progress indicator, upload speed, or cancel button.
- **Severity:** Medium

### 2.4 NewTaskModal — No Guidance When Project List Is Empty
- **File:** `src/components/screens/WorkHub/NewTaskModal.tsx`
- **Issue:** If no projects exist, the Project dropdown shows "None" with no "Create a project first" CTA. Users don't know why the field is empty.
- **Severity:** Medium

### 2.5 TaskList — Location Tag Search Is Case-Sensitive
- **File:** `src/components/screens/WorkHub/TaskList.tsx`
- **Issue:** Title search applies `.toLowerCase()`, but location_tag comparison may remain case-sensitive. Searching "berlin" will miss "Berlin-Nord-03".
- **Severity:** Medium

### 2.6 WorkHubProfile — No In-App Identity Photo Upload
- **File:** `src/pages/WorkHub/WorkHubProfile.tsx`
- **Issue:** Profile shows identity photo status but has no "Upload photo" button. Users are directed to "capture one during your next done report" with no proactive option.
- **Severity:** Medium

### 2.7 WorkHubTimesheet — Forward Week Button Disabled With No Explanation
- **File:** `src/pages/WorkHub/WorkHubTimesheet.tsx`
- **Issue:** The "next week" button is disabled with no tooltip or explanation. Users don't know why they can't navigate forward.
- **Severity:** Low

### 2.8 OfflineBanner — Ping Succeeds Even When Session Is Expired
- **File:** `src/components/screens/WorkHub/OfflineBanner.tsx`
- **Issue:** Banner pings `/ping` (a public endpoint). If session expires, ping succeeds and banner shows "online" but all data requests will fail with 401.
- **Severity:** Medium

### 2.9 Inbox — No Mark-All-Read on Mobile
- **File:** `src/pages/WorkHub/WorkHubInbox.tsx`
- **Issue:** Mark-all button is available on desktop but may be hidden or unreachable in narrow mobile layouts.
- **Severity:** Low

### 2.10 QuotaMeters — No Percentage Label
- **File:** `src/components/screens/WorkHub/QuotaMeters.tsx`
- **Issue:** Shows `used` and `limit` raw numbers but no calculated percentage badge. Users must do mental arithmetic.
- **Severity:** Low

---

## 3. Data / API Gaps

### 3.1 batchLocation Endpoint Never Called in UI
- **File:** `src/services/workhubApi.ts` (line ~186)
- **Issue:** `taskService.batchLocation()` is defined but no UI component calls it.
- **Severity:** Medium

### 3.2 `task_type` Field Has No UI Filter or Selector
- **File:** `src/services/workhubApi.ts`
- **Issue:** `WHTask.task_type` supports `'fault_resolution' | 'commissioning' | 'configuration' | 'investigation' | 'maintenance'` but NewTaskModal has no type selector, TaskList has no type filter, and KanbanBoard does not display it on cards.
- **Severity:** Medium

### 3.3 `consent_text_version` Hardcoded as `'v1'`
- **File:** `src/components/screens/WorkHub/DoneReportModal.tsx`
- **Issue:** GDPR consent version is hardcoded. If the backend changes consent text, old signatures get flagged non-compliant but users are never prompted to re-consent.
- **Severity:** High

### 3.4 `WHCompletionRecord.customer_name` — Type Contract Mismatch
- **File:** `src/services/workhubApi.ts`
- **Issue:** `customer_name` is optional on the type but DoneReportModal treats it as required. Backend may return null after customer signs, causing silent rendering failures.
- **Severity:** Medium

### 3.5 `free_from_date` Format Undocumented
- **File:** `src/services/workhubApi.ts` (`WHWorker.free_from_date?: string`)
- **Issue:** No format specified (ISO 8601? Unix timestamp?). Code calls `new Date(free_from_date)`, so if the backend changes format, dates silently produce `Invalid Date`.
- **Severity:** Medium

### 3.6 Sync Result Failures Never Displayed
- **File:** `src/services/workhubApi.ts` (`syncService.push()`)
- **Issue:** Returns `{ synced, skipped, failed }` arrays, but no UI component reads or renders failures. Users cannot know which offline edits failed to sync.
- **Severity:** High

### 3.7 Timer Service — No Debounce on Rapid Button Clicks
- **File:** `src/services/workhubApi.ts` (`timerService.start/pause/stop`)
- **Issue:** No request throttling. Mashing the Stop button sends multiple concurrent requests, potentially creating duplicate timer entries.
- **Severity:** Medium

### 3.8 `printService.generate()` — No Error Surfacing on PDF Failure
- **File:** `src/services/workhubApi.ts`
- **Issue:** Returns a Blob without checking for an error body. If backend PDF generation fails, user receives a corrupted download with no toast or message.
- **Severity:** Medium

### 3.9 Kanban Aggregate Endpoint — No Worker Filter
- **File:** `src/services/workhubApi.ts` (`aggregateService.kanban()`)
- **Issue:** Accepts `projectId` but not `worker_id`. KanbanBoard's worker filter dropdown filters tasks client-side only. For large datasets (500+ tasks), this is slow.
- **Severity:** Low

### 3.10 Profile Capacity Hours — No Min/Max Validation
- **File:** `src/pages/WorkHub/WorkHubProfile.tsx`
- **Issue:** `capacity_hours_per_week` is stored as a string, cast to `Number()` on submit, with no min (e.g. 1) or max (e.g. 168) guard.
- **Severity:** Low

---

## 4. Role / Permission Gaps

### 4.1 Client Role Can See Timer Button
- **File:** `src/pages/WorkHub/WorkHubLayout.tsx`
- **Issue:** The Timer sidebar button is not excluded for the `client` role. Clients should never time-track their own hours.
- **Severity:** High

### 4.2 Finance Role — Can Only See "Done" Tasks
- **File:** `src/components/screens/WorkHub/FinanceTable.tsx`
- **Issue:** FinanceTable only shows tasks with `status === 'done'`. Finance users cannot see `problem` tasks that may need rework before billing. No filter option.
- **Severity:** Medium

### 4.3 Worker Role — Worker Filter Dropdown Shows All Workers
- **File:** `src/components/screens/WorkHub/KanbanBoard.tsx`
- **Issue:** Worker-role users can open the worker filter and see all workers listed. Selecting another worker shows "no tasks" without explanation, causing confusion. Filter should be hidden or disabled for non-planner roles.
- **Severity:** Medium

### 4.4 Manager Role — No Team Capacity View
- **File:** `src/pages/WorkHub/WorkHubLayout.tsx`
- **Issue:** Managers see KanbanBoard and can move tasks, but have no view of worker capacity, queue depth, or estimated completion dates. Only the Settings page (planner/admin only) shows worker utilisation.
- **Severity:** Medium

### 4.5 Client Role — Sees Internal Task Fields (logged_hours, description)
- **File:** `src/components/screens/WorkHub/TaskDetail.tsx`
- **Issue:** When a client opens a task, they see `logged_hours`, `est_hours`, and the full internal `description`. Some of this may be confidential. No client-specific redacted view exists.
- **Severity:** Medium

### 4.6 Planner Role — No Approval/Sign-Off Workflow
- **File:** `src/components/screens/WorkHub/DoneReportModal.tsx`
- **Issue:** Planners can view done reports but have no "approve" or "reject" button. All sign-offs are self-service with no audit trail of reviewer actions.
- **Severity:** High

---

## 5. Mobile / Responsive Gaps

### 5.1 KanbanBoard — No Mobile Stack Layout
- **File:** `src/components/screens/WorkHub/KanbanBoard.tsx`
- **Issue:** 4 columns × 240 px min-width = 960 px. On 375 px mobile screens the board requires horizontal scrolling with no alternative single-column view.
- **Severity:** High

### 5.2 FinanceTable — 9 Columns Unusable on Mobile
- **File:** `src/components/screens/WorkHub/FinanceTable.tsx`
- **Issue:** Table has 9 columns (Task, Hours, Labour, Materials, Subtotal, VAT, Total, Status, Action). On mobile this is unusable without horizontal scroll and no card-based fallback exists.
- **Severity:** High

### 5.3 WorkHubTimesheet — No Responsive Column Collapse
- **File:** `src/pages/WorkHub/WorkHubTimesheet.tsx`
- **Issue:** 6-column table (Day, Task, Work, Break, Net, Status) has no responsive layout. Non-essential columns (Net, Status) are not hidden on small screens.
- **Severity:** Medium

### 5.4 DoneReportModal — Keyboard Covers Form Fields on Mobile
- **File:** `src/components/screens/WorkHub/DoneReportModal.tsx`
- **Issue:** Modal is not full-screen on mobile. When the soft keyboard opens, form fields are obscured by the keyboard with no scroll-into-view handling.
- **Severity:** Medium

### 5.5 TaskDetail — Photo Grid Hardcoded to 3 Columns
- **File:** `src/components/screens/WorkHub/TaskDetail.tsx`
- **Issue:** `grid-cols-3` is hardcoded. On 320 px mobile, each photo thumbnail is ~80 px — too small to review.
- **Severity:** Low

### 5.6 WorkHubSettings — 2-Column Grid May Wrap Awkwardly on Small Phones
- **File:** `src/pages/WorkHub/WorkHubSettings.tsx`
- **Issue:** Currency/hourly-rate inputs are in a `grid-cols-2` layout that may clip on very small screens (< 360 px).
- **Severity:** Low

### 5.7 WorkHubMobileNav — Settings Visibility Not Verified
- **File:** `src/components/screens/WorkHub/WorkHubMobileNav.tsx`
- **Issue:** Settings tab is gated by `canAccessSettings` (correct), but if the nav bar overflows and hides items on narrow screens, the tab may be unreachable.
- **Severity:** Low

---

## 6. State Management Gaps

### 6.1 workhubTimerStore — Offline Timer Start Not Synced on Reconnect
- **File:** `src/stores/workhubTimerStore.ts`
- **Issue:** If a user starts the timer offline, `activeTaskId` and `startedAt` are persisted locally but the `timerService.start()` API call never fires. When the user reconnects, the client timer continues but server has no corresponding entry. Logged hours are permanently out of sync.
- **Severity:** Critical

### 6.2 workhubOfflineStore — `isSyncing` Never Reset on Error
- **File:** `src/stores/workhubOfflineStore.ts`
- **Issue:** `setSyncing(false)` is called after the flush loop completes, but if a network exception is thrown inside the loop `isSyncing` stays `true` indefinitely, locking out future sync attempts.
- **Missing:** `try/finally` block around the flush loop.
- **Severity:** High

### 6.3 workhubOfflineStore — DoneReportModal Notes Not Auto-Saved
- **File:** `src/stores/workhubOfflineStore.ts` + `DoneReportModal.tsx`
- **Issue:** Offline store has a `draftNotes` map, but DoneReportModal uses its own isolated `note` state. If the user closes the modal mid-report or goes offline, the note is lost. Draft notes are never restored on re-open.
- **Severity:** Medium

### 6.4 workhubTimerStore — No Server-Side Reconciliation on Hydration
- **File:** `src/stores/workhubTimerStore.ts`
- **Issue:** `accumulatedSeconds` and `accumulatedBreakSeconds` are persisted to localStorage. If the server's timer state differs (e.g. after a force-refresh mid-session), local state is stale with no reconciliation step on mount.
- **Severity:** Medium

### 6.5 React Query — Overly Aggressive Cache Invalidation
- **File:** `src/pages/WorkHub/WorkHubLayout.tsx`
- **Issue:** Any task update invalidates the full `['wh-tasks']` query, refetching all tasks. Should use optimistic updates or selective invalidation by ID instead.
- **Severity:** Low

### 6.6 Sync Service — `SyncResult.failed` Items Not Retried
- **File:** `src/stores/workhubOfflineStore.ts`
- **Issue:** `syncService.push()` returns a `failed` array, but the flush function has no retry logic. Failed items are dropped silently.
- **Severity:** High

---

## 7. Test Coverage Gaps

### 7.1 DoneReportModal — No Tests for Full 7-Step Flow
- Full wizard (signature, photos, AI correction, materials, copy channel, GDPR consent) has no end-to-end or integration test.

### 7.2 KanbanBoard — No Tests for Status Transitions
- `STATUS_TRANSITIONS` map and the "Move to" button logic are untested.

### 7.3 TimerWidget — ArbZG Warning Not Tested
- Break warning at 6 h is not covered. No test verifies that toast fires at `WARN_MINUTES * 60` seconds.

### 7.4 WorkHubLayout — No Role-Based Rendering Tests
- No parametrised tests that verify worker → TaskList, finance → FinanceTable, client → read-only view, etc.

### 7.5 OfflineStore — `flushOfflineQueue` Not Tested
- Partial success (synced + failed), the `isSyncing` flag, and retry behaviour are all untested.

### 7.6 WorkHubSettings — Worker Add/Remove/Role-Change Not Tested
- Complex mutations with confirm-to-delete pattern and role changes have no coverage.

### 7.7 OfflineBanner — Ping Logic Not Tested
- Auth-expired-but-ping-succeeds scenario is not covered.

### 7.8 Quota Enforcement — Gate Not Tested
- No test verifies that users are blocked from creating tasks when their quota is exhausted.

### 7.9 TaskEditModal — Worker Re-Assignment Not Tested
- Mutation payload and success callback for re-assigning a task are untested.

### 7.10 DoneReportModal — AI Correction Field Not Tested
- `AICorrectField` API call, diff display, and user acceptance are all untested.

---

## 8. Design / Consistency Gaps

| Issue | Detail |
|---|---|
| Empty state inconsistency | TaskList has a CTA button; Inbox has an icon only; Settings workers list has guide text. No shared empty-state pattern. |
| Loading skeleton inconsistency | Timesheet and FinanceTable use `<Skeleton>`. TaskDetail uses raw `div`-based skeleton. |
| Badge styling inconsistency | Status badges use `bg-blue-100` in TaskList; priority uses different colours in KanbanBoard; utilisation uses different shades in Settings. |
| Button sizes inconsistent | Some buttons are `size="sm"`, others full-width, with no clear sizing guide. |
| Colour hierarchy | `#f08a3c` (orange) used for primary CTAs; `#2a8fbd` (teal) used for secondary — inconsistently applied across components. |

---

## 9. Accessibility Gaps

| Issue | File | Detail |
|---|---|---|
| Unread count badge not labelled | `WorkHubMobileNav.tsx` | Badge "9+" has no `aria-label`. Screen readers announce a bare number. |
| Kanban columns not semantic | `KanbanBoard.tsx` | Columns are `<div>` with no `aria-label` or `role`. |
| No description empty state | `TaskDetail.tsx` | If task has no description, section renders empty with no placeholder text. |
| DoneReportModal steps not labelled | `DoneReportModal.tsx` | Progress bar has no ARIA step information ("Step 3 of 7"). |
| Timer time not announced | `TimerWidget.tsx` | "01:23:45" has no `aria-label` with units (hours, minutes, seconds). |
| Help text not linked to inputs | `WorkHubProfile.tsx` | Help text lacks `aria-describedby` on its associated input. |
| Confirm-delete not live-announced | `WorkHubDesktopLayout.tsx` | Button text change "Click again to confirm" has no `aria-live` region. |

---

## 10. Performance Gaps

| Issue | File | Detail |
|---|---|---|
| Client-side search on every keystroke | `TaskList.tsx` | No debounce. For 500 tasks this runs a full filter on every character. |
| KanbanBoard re-renders all cards on any change | `KanbanBoard.tsx` | `KanbanCard` is not memoised. Any task update triggers full board re-render. |
| Timesheet table fully re-rendered on filter | `WorkHubTimesheet.tsx` | 7 days × N entries, no `React.memo` or virtualisation. |
| Inbox refetch interval too aggressive | `WorkHubLayout.tsx` | Unread count refetches every 60 s regardless of whether the user is looking at inbox. |
| PDF generation blocks main thread | `WorkHubTimesheet.tsx` | `printService.generate()` awaited synchronously. Large PDFs freeze the UI. |
| Zustand selectors not memoised | `WorkHubMobileNav.tsx` | Full store state subscribed; any store mutation triggers a re-render. |

---

## Priority Summary

| Priority | Items | Examples |
|---|---|---|
| **Critical** | 2 | §16 ArbZG timer not enforced; offline timer not synced on reconnect |
| **High** | 8 | Client can see Timer; no planner approval flow; `isSyncing` stuck on error; sync failures not displayed; consent version hardcoded; mobile Kanban/FinanceTable unusable |
| **Medium** | 30+ | Role gaps, API mismatches, UX flows, mobile layout, state reconciliation |
| **Low** | 40+ | Accessibility, performance, consistency, documentation |

---

## Recommended Next Steps

1. **Enforce ArbZG break** — auto-pause timer at 6 h; require explicit break acknowledgement to resume.
2. **Sync offline timer on reconnect** — call `timerService.start()` with `started_at` from persisted store when connectivity is restored.
3. **Fix `isSyncing` flag** — wrap flush loop in `try/finally`.
4. **Hide Timer from `client` role** — add `role !== 'client'` guard to Timer sidebar entry.
5. **Add planner approval workflow** — approve/reject done reports with comment.
6. **Mobile Kanban** — switch to vertical single-column view on `< md` breakpoints.
7. **Externalise consent text version** — fetch from settings API on DoneReportModal mount.
8. **Surface sync failures** — display `SyncResult.failed` items in a post-sync report modal.
9. **Per-worker hourly rate UI** — add rate override field in WorkHubSettings worker rows.
10. **Add role-based rendering tests** — parametrised tests for all 5 roles.
