# WorkHub Help Guide

**Module:** M-08 WorkHub Field-Service Work Management  
**Version:** Sprint 6 · 2026-05-27

---

## Table of Contents

1. [Getting Started by Role](#1-getting-started-by-role)
2. [Managing Tasks](#2-managing-tasks)
3. [Using the Timer](#3-using-the-timer)
4. [Completing a Job — Done Report](#4-completing-a-job--done-report)
5. [Exporting PDFs](#5-exporting-pdfs)
6. [AI Features](#6-ai-features)
7. [Working Offline](#7-working-offline)
8. [Worker Profile & Language Settings](#8-worker-profile--language-settings)
9. [Plan Limits & Quotas](#9-plan-limits--quotas)
10. [Compliance Notes for Workers](#10-compliance-notes-for-workers)

---

## 1. Getting Started by Role

### Worker

You can see and start tasks assigned to you, run the timer, and complete done reports.

1. Navigate to **WorkHub** from the main menu or use the floating quick-action launcher.
2. Your open tasks appear in the **Tasks** tab.
3. Tap a task to open the detail panel, then tap **Start Timer** to begin working.

### Planner

You create tasks, assign workers using the capacity card grid, and monitor progress.

1. Click **+ New Task** to open the task creation form.
2. In Step 1, fill in the title, project, priority, and estimated hours.
3. In Step 2, the **Worker Capacity Grid** shows all available workers with their current utilisation percentage (green ≤70%, amber ≤90%, red >90%). Select the most suitable worker.
4. Click **Create Task** to save and send an inbox notification to the assigned worker.

### Manager

You have full visibility: all tasks, all workers, time reports, compliance report, invoice links.

### Finance / Client

Finance can view reports and invoices. Clients can view tasks and completion records for their own projects.

---

## 2. Managing Tasks

### Viewing Tasks

- **All Tasks** lists everything for your tenant (managers) or your assigned tasks (workers).
- Use the filter chips at the top to show: **All · Open · In Progress · Done · Problem**
- Click any task row to open the **Task Detail Panel** on the right (desktop) or navigate to the full task view (mobile).

### Creating a Task

1. Click **+ New Task** (top right, or from the FloatingDock launcher).
2. **Step 1 — Basic Info:**
   - Title (required)
   - Project, Priority, Estimated Hours, Location Tag, Due Date, Description
3. **Step 2 — Assign Worker:**
   - Capacity cards show all workers. Click a card to select.
   - The card shows utilisation %, queue depth (open tasks count), and when they're next free.
   - Selecting a worker sends an inbox notification automatically.

### Task Statuses

| Status | Meaning |
|--------|---------|
| **Open** | Created, not yet started |
| **In Progress** | Timer running or manually set |
| **Done** | Completion report submitted and signed |
| **Problem** | Worker flagged an issue — requires planner attention |

### Editing a Task

Open the task detail panel and click **Edit**. You can change title, description, priority, due date, and location tag. Status can be changed via the status dropdown.

### "Also at This Location" Panel

If a task has a **Location Tag**, a collapsible panel appears in the detail view listing all other open tasks at the same location. Use **"Take this too"** to self-assign a nearby task without leaving the site.

---

## 3. Using the Timer

The timer tracks your work and break time per task, which feeds into the timesheet and invoice generation.

### Starting the Timer

1. Open the task detail.
2. Click **Start Timer**.
3. The task automatically moves to **In Progress**.

### Taking a Break

- Click **Pause** (or **Break**) to stop the work timer and start a break.
- The break duration is recorded separately.
- You will see a **⚠ 6-hour reminder** when you have worked 6 hours without a registered break (§16 ArbZG).

### Resuming After a Break

- Click **Resume** to end the break and resume work.

### Stopping the Timer

- Click **Stop** when the work is done.
- The timer calculates net work hours and updates `logged_hours` on the task.
- A compliance summary is shown: total work time, break time, and whether breaks meet §16 ArbZG requirements.

### Timer Pip (Floating Indicator)

If you navigate away from a running task, a floating **Timer Pip** appears in the bottom-right corner (desktop) or top of screen (mobile) showing elapsed time. Click it to return to the task, or stop the timer directly from the pip.

### Timesheet View

The **Reports** tab shows your weekly timesheet:
- Day-by-day grid with tasks and hours
- Overtime highlighted in amber
- **Download PDF** button to export a signed timesheet

---

## 4. Completing a Job — Done Report

When all work is done, submit a **Done Report** (6-step modal). This records everything needed for billing and legal compliance.

### Opening the Done Report

From the task detail, click **Done Report** (or **Complete**). The task must be In Progress or Open.

### Step 1 — Completion Note

Write a summary of the work completed (minimum 20 characters). Be specific — this appears on the customer-facing Completion Certificate.

**AI Correction:** Click **Correct with AI** to fix spelling and grammar. A diff view shows changes in red (removed) and green (added). Accept all or review change by change.

### Step 2 — Materials

Add materials used:
- Material name, quantity, unit (pcs / m / kg / h / …), unit price
- Total is calculated automatically
- These items become invoice line items

### Step 3 — Photos

Upload jobsite photos (up to 10). On mobile, you can use the camera directly. At least one jobsite photo is required before submission.

**Identity Photo:** If you haven't uploaded an identity photo yet, you can do so here. This is stored once and reused for future jobs.

### Step 4 — Your Signature

Sign in the signature pad with your finger (mobile) or mouse (desktop). Click **Done** when satisfied with your signature. This is your **Simple Electronic Signature** under eIDAS.

### Step 5 — GDPR Consent & Customer Signature

1. Show the customer the consent notice (or print the consent form PDF).
2. Tick the GDPR consent checkbox.
3. Enter the customer's name.
4. Have the customer sign in the second signature pad.

### Step 6 — Review & Submit

Review the summary. Click **Submit Done Report** to save.

**What happens next:**
- Task status changes to **Done**
- A draft invoice is automatically created with materials + labour line items
- The completion record is flagged as **dual-signed**
- A 10-year retention lock is placed on the record (§257 HGB)

---

## 5. Exporting PDFs

### From the Documents Tab

Open a task detail and click the **Documents** tab (next to Details, Timeline). Six document types are available:

| Document | When available |
|----------|----------------|
| Work Order | Any task |
| Completion Certificate | After done report submitted |
| Timesheet | Any time (covers current week) |
| Project Status | Any task in a project |
| Invoice | After customer signature |
| Consent Form | Any task |

Click **Generate** to create the PDF, then **Download** to save it. Already-generated documents show a **Re-generate** button.

### PDF Language

PDFs are generated in your configured **Export Language** (set in your profile). Languages: English, Deutsch, Polski, Français, Italiano.

---

## 6. AI Features

### AI Text Correction

Available in the Done Report modal (Step 1). Corrects spelling, grammar, and punctuation in the completion note. The Anthropic Claude Sonnet model is used. Your API credits are consumed from the tenant plan.

### Content Translation

Available in task descriptions and completion records. A language selector chip appears at the top of the text field:
- Select a target language to request a translation
- A skeleton placeholder shows while loading
- Translated text is cached for 7 days — subsequent loads are instant
- Click **Show original** at any time to switch back

### Rate Limits

AI features are rate-limited to prevent abuse: 60 calls/minute per organisation, 10 calls/minute per user. If you hit the limit, a message shows how long to wait.

---

## 7. Working Offline

WorkHub can work with limited functionality when you lose internet connectivity.

### What works offline

- **Viewing tasks** — the last 50 tasks are cached and available
- **Timer** — the timer continues running and state is persisted in local storage
- **Draft notes** — completion notes are saved as drafts locally

### What requires connectivity

- Creating or updating tasks
- Submitting done reports
- Uploading photos
- AI correction and translation

### Offline Banner

When offline, an orange banner appears at the top of WorkHub: **"Offline — changes will sync when reconnected."**

When connectivity returns, the banner changes to green and your queued actions sync automatically.

---

## 8. Worker Profile & Language Settings

Navigate to the **Profile** tab (last icon in the bottom nav on mobile, or via the WorkHub sidebar).

### Editable Fields

| Field | Description |
|-------|-------------|
| Hours per week | Your capacity (used for utilisation calculation) |
| Skills | Comma-separated list (e.g. "electrical, solar, plumbing") |
| UI language | Language for the WorkHub interface |
| Export language | Language for PDF documents |

### Identity Photo

The profile shows whether you have an identity photo on file. This photo is used on Completion Certificates. Upload it in the Done Report modal (Step 3) or via the profile page.

---

## 9. Plan Limits & Quotas

WorkHub enforces plan-based limits to prevent over-usage. When a limit is hit, a **402 upgrade prompt** appears.

### Quota Meters

The **QuotaMeters** panel (visible in the WorkHub sidebar) shows:
- Tasks created this month vs. limit
- Storage used (MB)
- AI calls used this month

### Plan Tiers

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|-----------|
| Workers | 5 | 25 | Unlimited |
| Tasks/month | 100 | 1,000 | Unlimited |
| Storage | 500 MB | 5 GB | 50 GB |
| AI calls/month | 0 | 500 | 5,000 |
| PDF exports | 50 | Unlimited | Unlimited |

To upgrade, click **Upgrade Plan** in the prompt or navigate to **Billing**.

---

## 10. Compliance Notes for Workers

### Working Time Records

Your time entries are legally required under §16 ArbZG (German Working Hours Act). Always:
- Start the timer when you begin work on-site
- Take a proper break (use the Pause button) after 6 hours
- Stop the timer when you leave the site

The system will remind you at 6 hours if no break has been recorded.

### Electronic Signatures

When you sign a done report:
- Your signature is a **Simple Electronic Signature** under eIDAS Regulation 910/2014
- The system records your IP address, device information, the timestamp, and a hash of the consent text you agreed to
- This data cannot be changed after submission

### Customer Signature

The customer signature confirms the work was completed as described. Once the customer signs:
- The record is **dual-signed** and locked for 10 years
- An invoice is automatically created
- Neither party can modify the completion record

### Your Data Rights

You have the right to request an export of all WorkHub data relating to you (GDPR Art. 15). Contact your administrator or use the account settings page to request a data export ZIP file.

---

*For technical issues, contact your system administrator or submit a support ticket via the Help menu.*  
*Document: WH-087 · Last updated: 2026-05-27*
