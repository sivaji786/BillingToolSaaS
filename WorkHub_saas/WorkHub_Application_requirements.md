# WorkHub Application — Functional Requirements

**Source:** `WorkHub_Application.html` (UI prototype — WorkHub SCLAN M-08, [mn]medianet)

---

## 1. Overview

WorkHub is a field-service work management application for [mn]medianet's SCLAN platform. It targets electricians, field technicians, planners, managers, clients, and finance staff. The UI is mobile-first with a responsive desktop 3-panel layout and supports five simultaneous user roles.

---

## 2. Role Definitions

| Role | Primary Use |
|------|-------------|
| Worker | Execute tasks, log time, submit reports, add materials |
| Planner | Create/assign tasks, view all records, manage projects |
| Manager | Kanban board overview, capacity monitoring |
| Client | Read-only project status view |
| Finance | Billable time and materials, invoice generation |

---

## 3. Navigation & Layout

### 3.1 Mobile Layout
- Bottom navigation bar with 5 tabs: **Today**, **Projects**, **Inbox**, **Timesheet**, **Profile**
- Full-screen modals slide up from bottom (sheet pattern)
- Safe-area inset support for iOS notch / Android bottom bar
- Offline indicator banner (dismissible) at top

### 3.2 Desktop Layout
- Left sidebar: role-selection tabs (Worker / Planner / Manager / Client / Finance), project list with task counts, worker capacity indicator
- Centre panel: role-specific main view (list/kanban/finance table)
- Right panel: ingest sources (email, calendar, API) + export options
- Top bar: role tabs, live timer indicator, language dropdown

---

## 4. Task Management

### 4.1 Task Data Model
Each task carries: `id`, `title`, `project`, `client`, `status`, `priority`, `due`, `est` (hours), `logged` (hours), `assignee`, `desc`, `steps[]`, `step` (current step index).

Tasks linked to SCLAN PFE/PC-13 may also carry: `pfe_ref_type`, `pfe_ref_id`, `pfe_node_id`, `pfe_segment_id`.

### 4.2 Task Statuses
- `open` → `in progress` → `done`
- `problem` (flagged via report modal)

### 4.3 Priority Levels
High / Medium / Low — colour-coded (red / amber / blue)

### 4.4 Task Card (Mobile)
- Coloured accent bar matching project colour
- Project name, priority badge, "Due today" badge, live timer badge
- Title (auto-translated if UI language differs from stored language)
- Client name
- Status / estimate / logged badges
- Progress bar (logged / estimate %)
- Timer bar with Start / Break / Stop buttons
- Quick action row: Done / Problem / Note

### 4.5 Task Detail View (Mobile)
- Full-screen overlay with sticky header
- Project label, title, client, status/priority badges
- Step progress indicator (node + connector timeline)
- Description card
- Estimated / Logged / Due fields with progress bar
- Action buttons: Start, Problem, Note, Mark as done
- "Also at this location" section — other open tasks at same client/project, with direct Start button

### 4.6 Task Detail Panel (Desktop)
- Same data as mobile detail view, rendered in right half of centre panel
- Inline action buttons: Done / Problem / Note / Start timer

---

## 5. New Task Creation

### 5.1 Two-Step Modal Flow

**Step 1 — Task basics**
- Title (required, minimum 1 character to advance)
- Description (optional)
- Priority selector: High / Medium / Low
- Due date (date picker, optional)
- Estimated hours (numeric, min 0.5, step 0.5)

**Step 2 — Project, Customer, Assignee**
- Select existing project (chips) or create new project
  - New project requires: name, customer selection or new customer
  - New customer fields: company name, contact person, phone, email
- Worker selection via **Worker Capacity Cards**:
  - Shows avatar, role, weekly capacity
  - Queue depth label ("Available now", "3 working days ahead", etc.)
  - Metrics: this week / this month / next 30 days (hours + %)
  - Capacity bar with colour coding (green/amber/red at 70%/90%)
  - After-assignment preview (shows how adding this task would change %)
  - Overloaded workers visually dimmed with warning

### 5.2 Task Creation Outcome
- Appended to top of TASKS array
- Title seeded into translation cache for current language
- Toast notification shown

---

## 6. Time Tracking

### 6.1 Timer
- One active timer at a time per session
- Starting a new timer auto-stops the previous
- States: **Idle**, **Running** (live elapsed counter), **Break** (paused, elapsed preserved)
- Elapsed time displayed in `HH:MM:SS` / `Xh MMm` format
- Live counter updates every second via `setInterval`
- Timer state visible in topbar on desktop (`⏱ 01:23`)
- Break button suspends clock without ending the session

### 6.2 Time Entries
Each entry stores: `taskId`, `worker`, `start` (ISO 8601), `end`, `duration` (seconds), `type` (work/break), `note`

### 6.3 Legal Compliance
- After ≥ 8h worked in a day, app displays "30 min break required by law" (§ 16 ArbZG)
- Timesheet sign-off button per day
- Records retained minimum 2 years (EuGH C-55/18, § 16 ArbZG)

---

## 7. Done Report / Completion Modal

Triggered by Done / Problem / Note buttons or automatically on timer stop.

### 7.1 Report Types
- **Done**: full completion form (materials, signature, photos, copy)
- **Problem**: free-text with photo option
- **Note**: free-text only

### 7.2 AI Text Correction
- Non-trivial text (> 8 chars) is sent to Anthropic API (`claude-sonnet-4-20250514`) for spell/grammar correction and language normalisation
- Runs in parallel for completion note and delay reason
- If correction differs from original: **correction review panel** shown with side-by-side comparison
  - Accept: corrected version stored, original preserved as `completionNoteOriginal`
  - Reject: original stored as-is
- AI-corrected records show "✎ original" link in Finance view

### 7.3 Overrun Reason
- Shown automatically when `logged > est && est > 0`
- Free-text field labelled with delta (e.g. "+2.0h over estimate")

### 7.4 Materials Section (Done only)
- Add material rows: name, quantity, unit (pcs/m/m²/h/kg/set), unit price, billing comment
- Delete rows
- Running total displayed
- Entries become invoice line items

### 7.5 Photo Capture
- Multiple photos via file/camera input
- Thumbnail grid with lightbox viewer and per-photo delete
- Photos stored as base64 data URLs, attached to completion record

### 7.6 Customer Signature (Done only)
- Canvas-based finger/mouse signature pad
- Touch and mouse events, pressure-responsive (via `lineTo`)
- Clear button
- Status: "unsigned" / "✓ signed"
- eIDAS (EU) 910/2014 simple electronic signature
- Signer name and role fields (optional)
- Acknowledgment text auto-updates with signer name when typed

### 7.7 Alternative: Paper Signature
- "Print consent form" button opens PDF consent form
- Camera capture of signed paper form
- Preview with delete option

### 7.8 GDPR Data Protection Notice (Done only)
- Collapsible legal text block explaining:
  - What is collected (name, signature, ID photos)
  - Legal basis: GDPR Art. 6(1)(b)
  - Storage: EU servers, encrypted, 10 years (§ 257 HGB / § 147 AO)
  - GDPR rights (Art. 15–22)
  - Standards: GDPR, eIDAS, BSI IT-Grundschutz

### 7.9 Identity Photos (Optional)
- Camera or file input for customer ID card, badge, QR code, or person photo
- Separate `idPhotos[]` array, displayed in completion record

### 7.10 Copy to Customer
- Toggle to send copy of completion record to customer
- Channel selector: Email / SMS / WhatsApp / Telegram
- Email validation (regex) or phone number validation (≥ 7 chars)
- Copy contains: work order, completion note, materials, photos, signature

### 7.11 Completion Record Storage
Fields: `taskId`, `completionNote`, `completionNoteOriginal`, `delayReason`, `delayReasonOriginal`, `billComment`, `materials[]`, `photos[]`, `signature` (base64 PNG), `signatureName`, `signatureRole`, `signatureIdPhotos[]`, `signedAt`, `copyEmailRequested`, `copyEmail`, `copyChannel`, `paperSignaturePhoto`, `timestamp`, `worker`, `lang`, `aiCorrected`

---

## 8. Print / PDF Engine

Triggered via `openPrintPreview(docType, id)`. Renders HTML into a print overlay (A4 paper-style) with browser Print/PDF button.

### Document Types

| Type | Description |
|------|-------------|
| Work Order | Task details, checklist, dual signature lines |
| Completion Certificate | Completion details, note, time records, materials, photos, signature block |
| Timesheet | Daily records grouped by date, totals, dual sign-off lines, ArbZG notice |
| Project Status Report | 4-metric summary tiles, task overview table, materials summary |
| Invoice | Labour + materials line items per completed task, delivery confirmations with signatures |
| Customer Consent Form | GDPR data protection notice, service details, signature area, paper instructions |

All documents carry: header with [mn]medianet logo + document type + reference number + date, footer with GDPR/legal notice, generation timestamp.

Reference numbers: `WO-YYYY-XXXX`, `CC-YYYY-XXXX`, `TS-YYYY-XXXX`, `PS-YYYY-X`, `INV-YYYY-X`, `CF-YYYY-XXXX`

Invoice labels are localised to the **export language** (EN/DE/PL/FR/IT), independent of UI language.

---

## 9. Language & Translation

### 9.1 UI Language
- 5 supported languages: EN, DE, PL, FR, IT
- Language dropdown in top bar (mobile + desktop)
- All static labels, buttons, navigation items translated via `T[LANG]` lookup table
- Available as flag + code selector

### 9.2 Content Translation
- Task titles, descriptions, completion notes translated on demand via Anthropic API
- `autoTr(text, trid)` — synchronous with async DOM update; renders skeleton placeholder while loading
- Translation cache keyed `hash(text)::lang` to avoid duplicate API calls
- Pending deduplication: parallel calls for same key share one in-flight request
- Cache cleared on language change

### 9.3 Fallback Language
- Per-user setting; used when translation API is offline or fails
- Configurable in Profile tab and Settings

### 9.4 Export Language
- Separate from UI language
- Controls invoice, work order, timesheet headers only
- A Polish worker can generate a German-language invoice

### 9.5 AI Text Correction
- Translates user-typed text to UI language and fixes spelling/grammar
- Preserves: names, addresses, product codes, numbers, units, dates

---

## 10. Capacity Planning

### 10.1 Worker Workload Calculation
- Per-worker: total open hours (remaining = est − logged), week/month/30-day windows
- Queue depth: total remaining hours ÷ daily capacity → working days ahead
- "Free from" date: calculated by adding working days to today (skipping weekends)
- Queue labels: "Available now", "Xh remaining today", "X working days ahead", "X weeks ahead", "X months ahead"

### 10.2 Capacity Colours
- Green: < 70% utilisation
- Amber: 70–89%
- Red: ≥ 90% (overloaded)

### 10.3 Profile / Capacity Tiles (Mobile)
- Queue depth headline
- Total open hours + "free from" date
- Open task count
- Tiles: This week / This month / Next 30 days (hours, %, capacity bar)

---

## 11. Views by Role

| Role | Desktop Main View |
|------|-------------------|
| Worker | Two-column: task list + detail panel |
| Planner | Search + all records list + detail panel |
| Manager | Kanban board (Open / In Progress / Done / Problem columns) |
| Client | Project status cards (progress bars, task checklist) |
| Finance | Time & Finance table (labour + materials per project, invoice totals) |

---

## 12. Inbox

- Messages from: Planner, Client, System
- Unread indicator (amber dot + left border)
- Tap to navigate to linked task
- Available on mobile (tab) and desktop (sidebar view)

---

## 13. Project Management

- Projects: id, name, client, colour
- Project list in left sidebar (desktop) and mobile Projects tab
- Per-project: open task count, progress bar (done/total), colour accent
- New project creation inline in New Task flow

---

## 14. Test Avatar

- Built-in automated test runner (floating `⚡ TEST` button)
- 30+ TAP-style test cases covering: data integrity, DOM presence, render functions, timer, reports, materials, new task, language switching, desktop views, capacity
- Progress bar, pass/fail log, copy-to-clipboard and .txt download of results
- Non-destructive (state restored after tests)

---

## 15. Data Models Summary

| Entity | Key Fields |
|--------|-----------|
| TASK | id, title, project, client, status, priority, due, est, logged, assignee, desc, steps, step |
| PROJECT | id, name, client, color |
| CUSTOMER | id, name, contact, email, phone |
| WORKER | id, name, role, capacity (h/week) |
| TIME_ENTRY | id, taskId, worker, start, end, duration, type, note |
| MATERIAL_ENTRY | id, taskId, worker, name, qty, unit, unitPrice, billComment, timestamp |
| COMPLETION_NOTE | taskId, completionNote, photos, signature, materials, lang, aiCorrected, … |
| INBOX | id, from, subject, time, unread, taskId |

---

## 16. Legal & Compliance Requirements

| Standard | Requirement |
|----------|------------|
| GDPR Art. 6(1)(b) | Lawful basis for processing name/signature at service delivery |
| GDPR Art. 15–22 | Data subject rights disclosure in consent form |
| eIDAS (EU) 910/2014 | Digital signature validity for service confirmations |
| § 16 ArbZG | Working time recording; 30-min break warning at ≥ 8h |
| EuGH C-55/18 (2019) | Systematic time recording obligation |
| § 257 HGB / § 147 AO | 10-year document retention |
| § 127 BGB | Digital sign-off as legal signature |
| BSI IT-Grundschutz | Referenced in consent form |
| DSGVO (DE) | German implementation of GDPR |
| NDA 5.0 | Document confidentiality footer |

---

## 17. Integration Points

| System | How |
|--------|-----|
| Anthropic API (claude-sonnet-4) | Content translation + AI text correction (client-side fetch to `api.anthropic.com/v1/messages`) |
| SCLAN PFE | Tasks carry `pfe_ref_type`, `pfe_ref_id`, `pfe_node_id`, `pfe_segment_id` references |
| PC-13 | Fault tasks created from PC-13 anomaly alerts |
| Backend email service | Copy of completion record to customer (email/SMS/WhatsApp/Telegram) |
| Print/PDF | Browser native `window.print()` with A4-optimised HTML |

---

## 18. Non-Functional Requirements

- Mobile-first, responsive to desktop at 768px breakpoint
- Safe-area insets for modern mobile devices
- Offline indicator (network status monitoring)
- No page reloads — full SPA pattern with DOM mutation
- Hard refresh / cache clear required after tailwind config changes in dev
- Touch events for signature canvas (passive: false to prevent scroll)
- Tap-to-dismiss tooltips (no hover)
- Toast notifications auto-dismiss after 2.5 seconds
