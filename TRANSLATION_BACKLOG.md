# Translation / i18n Backlog

**Audit date:** 2026-06-18  
**i18n system:** Custom Context API (`src/utils/i18n.ts` + `src/contexts/LanguageContext.tsx`)  
**Hook:** `useLanguage()` → `t(key, values?)`  
**Supported languages:** EN ✅ · DE ✅ · AR ✅ (RTL) · PL ✅ · **FR ⚠️ ~4%** · **IT ⚠️ ~4%**

---

## Coverage Summary

| Area | Components | Using `t()` | Coverage |
|---|---|---|---|
| Invoice / Editor | 14 | 14 | ~95% |
| Tenant Home | 7 | 7 | ~90% |
| Auth (Login, Signup, Reset) | 3 | 2 | ~70% |
| Legal pages | 5 | 5 | 100% |
| App shell / Sidebar | 4 | 4 | 100% |
| Admin screens | 22 | 8 | **36%** |
| WorkHub module | 25 | 0 | **0%** |
| CMS components | 6 | 0 | **0%** |
| Standalone screens | 10 | 6 | **60%** |
| TicketingWidget | 1 | 0 | **0%** |
| SharedInvoiceView | 1 | 0 | **0%** |
| **TOTAL** | **~243** | **~59** | **~24%** |

---

## Locale File Status

| Locale | File | Lines | Est. key coverage |
|---|---|---|---|
| English | `src/translations/en.ts` | 1 582 | 100% (source) |
| German | `src/translations/de.ts` | 1 580 | ~99% |
| Arabic | `src/translations/ar.ts` | 1 413 | ~89% |
| Polish | `src/translations/pl.ts` | 1 497 | ~95% |
| French | `src/translations/fr.ts` | 68 | **~4% — stub** |
| Italian | `src/translations/it.ts` | 68 | **~4% — stub** |

---

## Backlog Items

Items are grouped by module and sorted **P1 → P3** (P1 = customer-facing / revenue-critical).

---

### BL-T001 · WorkHub module — full translation pass  
**Priority:** P1 · **Effort:** L  
**Files (25 components, 0% coverage):**

| Component | Notable hardcoded strings |
|---|---|
| `TaskList.tsx` | "No tasks", "Assign", filter labels, sort labels |
| `TaskDetail.tsx` | All section headers, field labels, tab names |
| `TaskEditModal.tsx` | "Edit Task", all form field labels & placeholders |
| `NewTaskModal.tsx` | "Create Task", validation messages |
| `KanbanBoard.tsx` | Column headers (Open / In Progress / Done / Problem), toolbar, drag hints |
| `TimerWidget.tsx` | Timer controls, session labels, "Start", "Pause", "Stop" |
| `TimerPip.tsx` | Floating timer labels |
| `ProjectModal.tsx` | "New Project" / "Edit Project", all field labels |
| `TaskDocumentsTab.tsx` | Upload area, file type labels |
| `PhotoUploadGrid.tsx` | "Upload Photo", "Add Caption" |
| `SignaturePad.tsx` | "Draw signature here", "Clear" |
| `MaterialsTable.tsx` | Column headers, empty state |
| `FinanceTable.tsx` | Column headers, totals row labels |
| `BatchLocationPanel.tsx` | All labels |
| `AICorrectField.tsx` | AI suggestion prompt strings |
| `DoneReportModal.tsx` | All labels |
| `QuotaMeters.tsx` | Meter labels, "of" connector |
| `CapacityCard.tsx` | Capacity labels |
| `UpgradePrompt.tsx` | Upgrade CTA strings |
| `WorkHubGate.tsx` | Permission / locked state messages |
| `WorkHubDesktopLayout.tsx` | "Projects", "All Tasks", nav item labels |
| `WorkHubMobileNav.tsx` | All nav labels |
| `WorkHubQuickActions.tsx` | Action button labels |
| `OfflineBanner.tsx` | "You are offline" message |
| `TranslationToggle.tsx` | Internal dev tool — skip |

**Required new translation keys** (add under `workhub.*`):
- `workhub.kanban.*` — column headers, drag hints
- `workhub.taskForm.*` — all modal field labels
- `workhub.materials.*` — materials table
- `workhub.finance.*` — finance table
- `workhub.timer.*` — timer controls (partially exists in en.ts)
- `workhub.documents.*` — documents tab
- `workhub.signature.*` — signature pad
- `workhub.offline` — offline banner

---

### BL-T002 · TicketingWidget — full translation pass  
**Priority:** P1 · **Effort:** M  
**File:** `src/components/TicketingWidget.tsx` (1 file, 0% coverage)

Hardcoded strings inventory:

| Location | String |
|---|---|
| Line 429 | `"Support Ticket"` |
| Line 388 | `"Report issue (Alt+Shift+S)"` |
| Line 480 | `"Drag to move toolbar"` |
| Line 570-573 | Category options: `"Bug"`, `"Feature Request"`, `"Billing Question"`, `"Other"` |
| Line 586 | placeholder `"Brief summary of the issue"` |
| Line 607 | placeholder `"Detailed explanation of the issue..."` |
| Line 624-627 | Priority labels: `"Low"`, `"Medium"`, `"High"`, `"Critical"` |
| Line 331 | toast `"Ticket submitted successfully!"` |
| Line 337 | toast `"Failed to submit ticket. Please try again."` |
| Various | File attachment labels, "Attach files", "Max 5 files" |

**Required new keys** (add under `ticket.*`):
- `ticket.title`, `ticket.reportIssue`, `ticket.dragHint`
- `ticket.category.*` — bug, feature, billing, other
- `ticket.priority.*` — low, medium, high, critical
- `ticket.subject.placeholder`, `ticket.body.placeholder`
- `ticket.submit.success`, `ticket.submit.error`
- `ticket.attachment.*`

---

### BL-T003 · SharedInvoiceView — full translation pass  
**Priority:** P1 · **Effort:** M  
**File:** `src/components/screens/SharedInvoiceView.tsx` (0% coverage)

This is the **public invoice sharing page** — accessible without login, always shows English regardless of viewer's locale.

| Location | String |
|---|---|
| Line 131 | `"Link not found"` |
| Line 52 | toast `"Failed to generate PDF"` |
| Line 104 | toast `"Downloaded"` |
| Line 106 | toast `"Failed to generate pixel-perfect PDF"` |
| Line 204 | `"From"` |
| Line 219 | `"To"` |
| Line 238 | `"Items"` |
| Line 243-247 | `"Description"`, `"Qty"`, `"Unit price"`, `"Amount"` |
| Line 273 | `"Subtotal"` |
| Line 279 | `"Tax"` |
| Line 284 | `"Total"` |
| Various | Download button, PDF button, expiry message |

**Note:** The shared link language should follow the *sender's* company locale setting or a URL param (`?lang=de`).

**Required new keys:** add under `sharedInvoice.*` and reuse existing `editor.*` invoice labels where they overlap.

---

### BL-T004 · CMS components — full translation pass  
**Priority:** P2 · **Effort:** M  
**Files (6 components, 0% coverage):**

| Component | Hardcoded strings |
|---|---|
| `EditModeBar.tsx` | "Edit Mode", "Create New Page", "Save", "Discard", "Preview" |
| `InlineEditableText.tsx` | "Click to edit", tooltip text |
| `InlineEditableRich.tsx` | "Click to edit", rich-text toolbar tooltips |
| `InlineImagePicker.tsx` | "Replace image", "Upload image", "Pick from library" |
| `CmsMediaLibrary.tsx` | "Media Library", "Upload", filter labels, "No media found" |
| `CmsVersionPanel.tsx` | "Version history", "Restore", "Published", "Draft" timestamp labels |

**Required new keys:** add under `cms.*`

---

### BL-T005 · Admin panel — missing 14 screens  
**Priority:** P2 · **Effort:** XL  
**Files (14 components with 0% coverage):**

| Component | Key hardcoded areas |
|---|---|
| `SALogin.tsx` | Login form labels, error messages |
| `SAdashboard.tsx` | All metric card labels, chart labels |
| `SAbilling.tsx` | Invoice table headers, status labels, action buttons |
| `SAusage.tsx` | All usage metric labels and chart axes |
| `SAASusers.tsx` | Table headers, status badges, action buttons |
| `SAUserDetails.tsx` | All section headers and field labels |
| `SApackages.tsx` | Table headers, feature list labels |
| `SAPackageForm.tsx` | All form field labels and placeholders |
| `SAPackageServices.tsx` | All service type labels |
| `SAInvoiceForm.tsx` | All form labels |
| `SAPages.tsx` | Page section titles, edit CTA strings |
| `SAsettings.tsx` | All settings section headers and labels |
| `CompanyTypeList.tsx` | "Edit Company Type", "New Company Type", table headers |
| `SAMenus.tsx` | Menu management labels |

**Strategy:** Admin panel is used only by super-admins — English-only fallback is acceptable short-term. Wrap strings in `t()` with English as fallback key so they compile correctly before locale files catch up.

---

### BL-T006 · Workspace screen — toast + empty states  
**Priority:** P2 · **Effort:** S  
**File:** `src/components/screens/Workspace.tsx`  
(Hook already present but many strings remain hardcoded)

| String | Location |
|---|---|
| `"Failed to load workspace"` | ~line 93 |
| `"Folder created"` | ~line 188 |
| `"Deleted successfully"` | ~line 201 |
| `"Files uploaded successfully"` | ~line 173 |
| `"This folder is empty"` | ~line 583 |
| `"Upload files or create a new folder to get started"` | ~line 584 |
| `"Create New Folder"` (dialog title) | ~various |
| `"Rename Item"` (dialog title) | ~various |
| `"Manage your project files and folders"` | ~line 387 |

**Required new keys:** extend existing `workspace.*` namespace.

---

### BL-T007 · GlobalAIAssistant — voice / mic strings  
**Priority:** P2 · **Effort:** S  
**File:** `src/components/GlobalAIAssistant.tsx`  
(Hook present but voice-specific strings hardcoded)

| String | Location |
|---|---|
| `"Microphone access denied"` | ~line 70 |
| `"Voice input activated"` | ~line 105 |
| `"Platform templates cannot be edited directly."` | App.tsx ~756 |
| `"Platform templates cannot be deleted."` | App.tsx ~794 |
| `"Failed to save template"` | App.tsx ~781 |
| `"Failed to load invoice data"` | App.tsx ~308, 321 |

**Required new keys:** extend `ai.*` and `editor.*` namespaces.

---

### BL-T008 · ActivityLog, AIHistory, ResetPassword  
**Priority:** P2 · **Effort:** S  
**Files (0% or partial coverage):**

| File | Hardcoded strings |
|---|---|
| `ActivityLog.tsx` | Table headers, filter labels, empty state text |
| `AIHistory.tsx` | "AI History", session labels, empty state text |
| `ResetPassword.tsx` | Form labels, success/error messages (Login.tsx has translations but Reset does not) |

---

### BL-T009 · French (fr) and Italian (it) locales — complete to 100%  
**Priority:** P3 · **Effort:** XL  
**Files:** `src/translations/fr.ts` (68 lines), `src/translations/it.ts` (68 lines)

Both files contain only ~60 keys (WorkHub block + 3 header keys). The English source has **1 582 lines / ~500 keys**.

Current FR/IT coverage includes:
- `appName`, `appSubtitle`, `logout`
- `workhub.*` (task statuses, priorities, timer controls)

Missing from FR/IT: all invoice, editor, dashboard, buyer, settings, auth, legal, AI assistant, billing, workspace keys.

**Approach:**
1. Generate FR/IT translations from the EN source (machine-translate → human review)
2. Validate RTL is not needed (both LTR)
3. Wire up locale switcher UI to show FR and IT as selectable options (currently they may be hidden or fallback silently)

---

### BL-T010 · Arabic locale — gap fill (~11%)  
**Priority:** P3 · **Effort:** M  
**File:** `src/translations/ar.ts` (1 413 lines vs 1 582 in EN)

~169 keys present in EN but missing in AR. Likely new keys added after initial Arabic translation. Run a key-diff script to identify the exact missing keys and send to translator.

---

### BL-T011 · Hardcoded placeholders and aria-labels across forms  
**Priority:** P3 · **Effort:** M  

Across the entire app, `placeholder="..."` and `aria-label="..."` attributes are largely hardcoded. Examples:

| Component | Hardcoded attribute |
|---|---|
| Most search inputs | `placeholder="Search..."` |
| Invoice editor | various `placeholder="Enter..."` fields |
| Admin forms | `placeholder="e.g., Professional Plan"` |
| Buttons with icons only | Missing `aria-label` entirely |

These don't break UX but are inaccessible in non-English languages and fail screen-reader expectations for localized users.

---

### BL-T012 · Inconsistent `t(key) \|\| 'fallback'` pattern  
**Priority:** P3 · **Effort:** S  

~40+ places use `t('key') || 'English fallback'`. This silently masks missing keys — a missing key returns `undefined` which evaluates as falsy, showing the hardcoded fallback. The custom `t()` function should be updated to:
1. Return the key path itself (e.g., `"editor.save"`) when a key is missing, and
2. Log a console warning in development.

This makes missing translations immediately visible during development without requiring runtime errors.

**File to modify:** `src/utils/i18n.ts`

---

## Recommended Delivery Order

```
Sprint 1  BL-T001 WorkHub (0% → 100%)      — largest user-facing gap
          BL-T002 TicketingWidget           — customer support flow
          BL-T003 SharedInvoiceView         — public page, always English now

Sprint 2  BL-T006 Workspace toasts          — easy wins
          BL-T007 GlobalAI voice strings    — easy wins
          BL-T008 ActivityLog/AIHistory/Reset
          BL-T012 Fix t() missing-key behavior

Sprint 3  BL-T004 CMS components           
          BL-T005 Admin panel (14 screens)  — low user count, English-only acceptable

Sprint 4  BL-T009 FR + IT to 100%
          BL-T010 AR gap fill
          BL-T011 Placeholder/aria-label pass
```

---

## Key Naming Conventions (for new keys)

Follow the existing pattern in `en.ts`:

```typescript
// Namespace.subkey (flat or one level deep)
workhub: {
  kanban: {
    columnOpen: 'Open',
    columnInProgress: 'In Progress',
    columnDone: 'Done',
    columnProblem: 'Problem',
    dragHint: 'Drag to reorder',
  },
  taskForm: {
    title: 'Task Title',
    assignee: 'Assignee',
    dueDate: 'Due Date',
    // ...
  },
}

// Toast messages: use common.* or module.toast.*
ticket: {
  toast: {
    submitSuccess: 'Ticket submitted successfully!',
    submitError: 'Failed to submit ticket. Please try again.',
  }
}
```

Do **not** add bare top-level string keys (e.g., `ticketSubmitSuccess: '...'`). Always nest under a module namespace.
