# WorkHub API Reference

**Base path:** `/api/workhub`  
**Auth:** Bearer JWT (`Authorization: Bearer <token>`)  
**Tenant:** Resolved from JWT `tenant_id` claim  
**Stack:** CodeIgniter 4 · PHP 8.1 · MySQL

---

## Authentication

All endpoints require a valid JWT. The auth filter (`UnifiedAuthFilter`) validates the token and injects `tenant_id` + `user_id` into the request context. RBAC rights are enforced per endpoint via `RbacFilter`.

---

## Tasks

### `GET /api/workhub/tasks`

List tasks for the current tenant.

**Right required:** `workhub.task.view`

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status: `open`, `in_progress`, `done`, `problem` |
| `priority` | string | Filter: `low`, `medium`, `high`, `urgent` |
| `project_id` | int | Filter by project |
| `assigned_worker_id` | int | Filter by worker |
| `location_tag` | string | Filter by location |
| `page` | int | Page number (default 1, 20 per page) |

**Response 200:**

```json
{
  "data": [
    {
      "id": 42,
      "tenant_id": 1,
      "title": "Install circuit breaker",
      "status": "open",
      "priority": "high",
      "project_id": 7,
      "assigned_worker_id": 3,
      "location_tag": "Building-7-Floor-2",
      "est_hours": 3.0,
      "logged_hours": 0.0,
      "due_date": "2026-06-15",
      "created_at": "2026-05-27T10:00:00Z",
      "updated_at": "2026-05-27T10:00:00Z"
    }
  ],
  "total": 1,
  "unread_inbox_count": 2
}
```

---

### `POST /api/workhub/tasks`

Create a task.

**Right required:** `workhub.task.create`  
**Plan limit:** `checkWorkhubTaskLimit()` — 402 on monthly breach

**Request body:**

```json
{
  "title": "Install circuit breaker",
  "description": "Replace MCB on circuit 3B",
  "priority": "high",
  "project_id": 7,
  "assigned_worker_id": 3,
  "location_tag": "Building-7-Floor-2",
  "est_hours": 3.0,
  "due_date": "2026-06-15"
}
```

**Response 201:** Full task object in `{ "data": { ... } }`

---

### `GET /api/workhub/tasks/{id}`

Get full task detail including time entries, completion record, materials, photos.

**Right required:** `workhub.task.view`

**Response 200:** Task object with nested `completion_record`, `materials[]`, `photos[]`

---

### `PUT /api/workhub/tasks/{id}`

Update a task. Status transitions validated: `open → in_progress → done/problem`.

**Right required:** `workhub.task.edit`

---

### `DELETE /api/workhub/tasks/{id}`

Soft-delete a task. **Blocked (409)** if the task has a dual-signed completion record (§257 HGB retention guard).

**Right required:** `workhub.task.delete`

---

### `GET /api/workhub/tasks/batch-location`

Get all tasks at a location tag.

**Query:** `location_tag=Building-7-Floor-2`

**Response 200:** `{ "data": [ ...tasks... ] }`

---

## Timer

### `POST /api/workhub/tasks/{id}/timer/start`

Start the work timer. Creates a `work` time entry. Sets task status to `in_progress`.

**Right required:** `workhub.timer.start`

Returns **409** if a timer is already running for this task.

---

### `POST /api/workhub/tasks/{id}/timer/pause`

Pause (start break). Closes the open `work` entry, opens a `break` entry. Emits §16 ArbZG warning if work has reached 6 hours without a break.

---

### `POST /api/workhub/tasks/{id}/timer/stop`

Stop the timer. Closes all open entries, recalculates `logged_hours`. Returns §16 ArbZG compliance status.

---

## Timesheet

### `GET /api/workhub/timesheet`

Return the timesheet for the current worker (or a specific worker for managers).

**Query params:** `worker_id`, `week` (ISO date, e.g. `2026-05-26`), `month` (e.g. `2026-05`)

**Response 200:**

```json
{
  "worker_id": 3,
  "week": "2026-05-26",
  "days": [
    {
      "date": "2026-05-26",
      "entries": [
        { "task_id": 42, "task_title": "Install breaker", "work_minutes": 120, "break_minutes": 30 }
      ],
      "net_minutes": 90,
      "overtime_flag": false
    }
  ],
  "totals": { "work_minutes": 2160, "break_minutes": 210, "net_days": 5, "overtime_days": 0 }
}
```

---

### `GET /api/workhub/timesheet/export`

Return data payload for PDF rendering. Checks `workhub_pdf_exports` plan limit.

---

## Completion Records

### `POST /api/workhub/tasks/{id}/completion`

Submit a done report (worker-signed). Sets task status to `done`.

**Right required:** `workhub.completion.submit`

**Request body:**

```json
{
  "completion_note": "Installation completed per spec. All circuits tested.",
  "completion_note_original": "Optional — original before AI correction",
  "worker_signature_data": "data:image/svg+xml;base64,...",
  "gdpr_consent_given": true,
  "consent_text": "Full text of consent shown to user — SHA-256 stored as eIDAS metadata",
  "materials": [
    { "material_name": "Cable 2.5mm", "quantity": 15, "unit": "m", "unit_price": 1.85 }
  ]
}
```

**Validations:**
- `completion_note`: 20–2000 characters
- `worker_signature_data`: required, non-empty base64 SVG
- `gdpr_consent_given`: must be `true`
- At least one jobsite photo must exist

**Response 201:**

```json
{ "completion_id": 88, "task_id": 42, "message": "Done report submitted. Awaiting customer signature." }
```

**eIDAS metadata stored:** `signed_ip`, `signed_user_agent`, `signed_at`, `consent_text_version` (SHA-256 of `consent_text` if provided)

---

### `POST /api/workhub/completions/{id}/customer-signature`

Capture customer signature. Sets `is_dual_signed = true`, triggers invoice auto-generation (WH-059).

**Request body:**

```json
{
  "customer_signature_data": "data:image/svg+xml;base64,...",
  "customer_name": "Hans Mustermann",
  "gdpr_consent_given": true,
  "consent_text_version": "v1"
}
```

**Response 200:**

```json
{ "completion_id": 88, "customer_name": "Hans Mustermann", "customer_signed_at": "2026-05-27T14:30:00Z", "dual_signed": true }
```

---

### `GET /api/workhub/completions/{id}`

Get completion record with materials, photos, dual-sign status.

---

## AI Services

> **Rate limit:** 60 req/min per tenant · 10 req/min per user (WH-080). Returns 429 with `Retry-After` header on breach.

### `POST /api/workhub/ai/correct`

Grammar and spelling correction.

**Plan limit:** `checkWorkhubAiCallLimit()`

**Request:** `{ "text": "Insatllation compleat..." }`

**Response 200:**

```json
{
  "original": "Insatllation compleat...",
  "corrected": "Installation complete...",
  "changes": [
    { "type": "spelling", "text": "Insatllation", "replacement": "Installation" }
  ],
  "identical": false
}
```

---

### `POST /api/workhub/ai/translate`

Translate text to target language. Cached for 7 days.

**Request:** `{ "text": "...", "target_lang": "de", "source_lang": "auto" }`

**Response 200:**

```json
{ "translated": "...", "detected_source_lang": "en", "from_cache": false }
```

**Supported languages:** `en`, `de`, `pl`, `fr`, `it`

---

## Files

### `POST /api/workhub/files/upload`

Upload a photo (jobsite or identity).

**Right required:** `workhub.completion.submit`  
**Plan limit:** `checkWorkhubStorageLimit($bytes)`

**Form data:** `file` (JPEG/PNG/HEIC, max 10 MB), `task_id`, `photo_type` (`jobsite` | `identity`)

**Validation:** MIME type validated server-side via `finfo` (libmagic), not extension.

**Response 201:**

```json
{ "photo_id": 15, "url": "https://s3.eu-central-1.amazonaws.com/...?X-Amz-Expires=900&..." }
```

URLs are pre-signed with 15-minute expiry (WH-081).

---

## PDF Generation

### `GET /api/workhub/print/{type}/{id}`

Generate a PDF document.

**Right required:** `workhub.reports.export`  
**Plan limit:** `checkWorkhubPdfLimit()`

**Types:**

| Type | Description |
|------|-------------|
| `work-order` | Task details, worker, location, est hours |
| `completion-certificate` | Signatures, materials, photos, eIDAS evidence |
| `timesheet` | Weekly breakdown, §16 ArbZG disclaimer |
| `project-status` | Project progress, task table |
| `invoice` | Materials + labour line items |
| `consent-form` | GDPR Art. 6 printable consent form |

**Query:** `week=2026-05-26` (required for timesheet type)

**Response:** `application/pdf` binary (or 402 on plan limit)

---

## Workers

### `GET /api/workhub/workers`

List workers with computed capacity metrics.

**Right required:** `workhub.task.view`

**Response 200:**

```json
{
  "data": [
    {
      "id": 3, "user_id": 12, "name": "Anna Schmidt", "role": "Electrician",
      "capacity_hours_per_week": 40,
      "utilisation_pct": 65,
      "queue_depth": 3,
      "free_from_date": "2026-06-02"
    }
  ]
}
```

Colour thresholds: ≤70% green · ≤90% amber · >90% red.

---

## Projects

### `GET /api/workhub/projects`

List projects with task count, progress %, customer name.

### `POST /api/workhub/projects`
### `PUT /api/workhub/projects/{id}`
### `DELETE /api/workhub/projects/{id}`

**Right required:** `workhub.project.manage` (write operations)

---

## Inbox

### `GET /api/workhub/inbox/messages`

List inbox messages for the current user (unread first).

### `PUT /api/workhub/inbox/messages/{id}/read`

Mark a message as read.

### `GET /api/workhub/inbox/unread-count`

**Response:** `{ "count": 3 }`

---

## Settings

### `GET /api/workhub/settings`
### `PUT /api/workhub/settings`

Tenant-level WorkHub settings: `default_hourly_rate`, `currency`, `tax_percent`, `pdf_language`.

### `GET /api/workhub/usage`

Current month usage against plan limits: tasks, AI calls, PDF exports, storage bytes.

---

## Worker Profile

### `GET /api/workhub/profile`
### `PATCH /api/workhub/profile`

Worker's own profile. Editable fields: `capacity_hours_per_week`, `skills`, `ui_language`, `export_language`.

---

## Error Responses

| Code | Meaning |
|------|---------|
| 401 | Missing or invalid JWT |
| 403 | RBAC right not held |
| 402 | Plan limit exceeded (`plan_limit_hit` error code) |
| 404 | Resource not found or cross-tenant access attempted |
| 409 | Conflict (duplicate completion, already-signed, timer already running, dual-signed delete attempt) |
| 422 | Validation failure — array of error strings in `errors` field |
| 429 | AI rate limit exceeded — `Retry-After` header set |
| 500 | Server error |

All error responses follow the format:
```json
{ "status": 422, "error": "...", "messages": { "field": ["error..."] } }
```

---

## Plan Limit Codes

When a plan limit is hit the response is **402** with:
```json
{
  "error": "plan_limit_hit",
  "limit_type": "workhub_tasks_per_month",
  "current": 100,
  "limit": 100,
  "upgrade_url": "/billing"
}
```

---

*Last updated: 2026-05-27 · WH-085*
