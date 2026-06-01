# WorkHub SCLAN M-08 — Developer Guide Requirements

**Project:** WorkHub SaaS — SCLAN M-08  
**Client:** ([mn]medianet)  
**Document Type:** Software Requirements Specification (SRS)  
**Version:** 1.0  
**Date:** 2026-05-27  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [API Endpoints](#4-api-endpoints)
5. [Database Schema](#5-database-schema)
6. [Real-Time / WebSocket Events](#6-real-time--websocket-events)
7. [Permission Matrix](#7-permission-matrix)
8. [Security Requirements](#8-security-requirements)
9. [Performance Requirements](#9-performance-requirements)
10. [Compliance Requirements](#10-compliance-requirements)

---

## 1. Overview

WorkHub SCLAN M-08 is a field-service and billing SaaS platform for ([mn]medianet). It enables task management, time tracking, field completion records, material logging, document generation, AI-assisted text correction and translation, and finance/invoice workflows. The system supports multiple roles (worker, planner, manager, client, finance) with strict role-based access control enforced at the API layer via JWT claims.

---

## 2. Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Frontend Framework | React | 18.x |
| Frontend Meta-Framework | Next.js | 14.x (App Router) |
| Styling | Tailwind CSS | Latest stable |
| Client State Management | Zustand | Latest stable |
| Server State / Data Fetching | React Query (TanStack Query) | Latest stable |
| Primary Database | PostgreSQL | 15.x |
| Time-Series Extension | TimescaleDB | Applied to `time_entries` table |
| Cache / Session Store | Redis | Translation cache + session tokens |
| File Storage | S3 / Cloudflare R2 | Photos, ID photos, signature images |
| Email Delivery | AWS SES or SendGrid | Copy email on completion records |
| Real-Time | WebSocket | Server-push events (task, timer, translation, inbox) |
| PDF Generation | Puppeteer / wkhtmltopdf | Server-side rendering via `/print` endpoint |
| AI Services | Anthropic API | Text translation and correction |

---

## 3. Authentication & Authorization

### 3.1 JWT Structure

All API requests must include a valid JSON Web Token (JWT) in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer <token>
```

The JWT payload must contain the custom claim `workhub_role` identifying the authenticated user's role within the system.

**Example JWT payload:**

```json
{
  "sub": "worker-uuid",
  "workhub_role": "worker",
  "iat": 1716800000,
  "exp": 1716886400
}
```

### 3.2 Roles

| Role | Description |
|---|---|
| `worker` | Field technician; executes tasks and logs time/materials |
| `planner` | Dispatches and manages task assignments |
| `manager` | Read-only oversight; capacity and kanban views |
| `client` | External customer; limited read access to own project status |
| `finance` | Billing and invoicing; read-only access to completed financial data |

### 3.3 Authorization Rules

- The API validates the `workhub_role` claim on every protected endpoint before processing the request.
- Tokens must be verified for signature, expiry, and issuer.
- Sessions are stored and invalidated via Redis; token revocation must be checked on each request.
- Role escalation is not permitted; a token cannot carry multiple roles.

---

## 4. API Endpoints

All endpoints are prefixed with the base API path. Requests and responses use `application/json` unless noted (e.g., multipart for file upload). All endpoints require a valid JWT unless stated otherwise.

### 4.1 Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tasks` | List tasks; supports filtering via query parameters |
| `POST` | `/tasks` | Create a new task |
| `PUT` | `/tasks/{id}` | Update an existing task |
| `DELETE` | `/tasks/{id}` | Delete a task |
| `GET` | `/tasks/{id}/time-entries` | Retrieve all time entries for a specific task |

**Query Parameters for `GET /tasks`:**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by task status (e.g., `open`, `in_progress`, `completed`) |
| `assignee` | string (UUID) | Filter by assigned worker ID |
| `project` | string (UUID) | Filter by project ID |
| `priority` | string | Filter by priority level |

---

### 4.2 Time Entries

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/time-entries` | Create a new time entry (start or stop a timer) |

**Request Body for `POST /time-entries`:**

| Field | Type | Required | Description |
|---|---|---|---|
| `taskId` | string (UUID) | Yes | Associated task identifier |
| `worker` | string (UUID) | Yes | Worker performing the work |
| `start` | string (ISO 8601) | Yes | Start timestamp |
| `end` | string (ISO 8601) | No | End timestamp (null if timer is running) |
| `duration` | integer | No | Duration in seconds (computed if start/end provided) |
| `type` | string | Yes | Entry type (e.g., `work`, `travel`, `break`) |
| `note` | string | No | Free-text note for the entry |

---

### 4.3 Timesheets

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/timesheet` | Query worker timesheet for a specified date range |
| `GET` | `/timesheet` | Retrieve timesheet data |

Timesheet queries must include worker identity and date range parameters to scope the returned time entries.

---

### 4.4 Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/projects` | List all projects |
| `POST` | `/projects` | Create a new project |

---

### 4.5 Customers

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/customers` | List all customers |
| `POST` | `/customers` | Create a new customer |

---

### 4.6 Workers

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/workers` | List all workers including capacity fields |
| `POST` | `/workers` | Create a new worker record |

Worker records include capacity fields (`capacity_hours_per_week`) used for planner and manager views.

---

### 4.7 Completion Records

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/completions` | Submit a field completion record for a task |

**Request Body for `POST /completions`:**

| Field | Type | Required | Description |
|---|---|---|---|
| `taskId` | string (UUID) | Yes | Task being completed |
| `completionNote` | string | Yes | Technician's completion note (may be AI-corrected) |
| `delayReason` | string | No | Explanation if task was delayed |
| `photos` | string[] | No | Array of storage URLs for report photos |
| `signature` | string | Yes | Base64 or storage URL of signature image |
| `signatureName` | string | Yes | Printed name of signatory |
| `signatureRole` | string | Yes | Role of signatory (e.g., customer, supervisor) |
| `materials` | object[] | No | Array of material entry objects |
| `billComment` | string | No | Billing-specific note |
| `lang` | string | Yes | Language code for the completion note (e.g., `de`, `en`) |
| `aiCorrected` | boolean | No | Flag indicating whether AI text correction was applied |
| `copyEmail` | string | No | Email address to receive a copy of the completion report |
| `copyChannel` | string | No | Notification channel for copy delivery |

---

### 4.8 AI Translation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/translate` | Translate text via Anthropic API proxy |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | Source text to translate |
| `targetLang` | string | Yes | Target language code (e.g., `de`, `en`, `tr`) |

**Behavior:**
- The endpoint proxies the translation request to the Anthropic API.
- Translated results are cached in the `translation_cache` database table, keyed by a hash of the source text and target language.
- Subsequent identical requests are served from cache without calling the Anthropic API.
- The endpoint is rate-limited to prevent abuse.
- Async translation completion emits a `translation.ready` WebSocket event with payload `{trid, text}`.

---

### 4.9 AI Text Correction

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/correct` | Apply AI grammar/spelling correction to text |

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | Text to be corrected |
| `uiLang` | string | Yes | UI language context for correction model |

---

### 4.10 File Upload

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/files` | Upload a file (multipart/form-data) |

**Accepted file types:**
- Report photos (photo_type: `report`)
- Identity / ID photos (photo_type: `identity`)
- Signature images (photo_type: `paper_sig`)

**Response:** Returns the storage URL of the uploaded file (S3/R2 path).

---

### 4.11 Print / PDF Generation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/print/{type}/{id}` | Generate and return a PDF document |

**Supported `type` values:**

| Type | Description |
|---|---|
| `workorder` | Work order document for a task |
| `completion` | Field completion report |
| `timesheet` | Worker timesheet for a period |
| `project-status` | Project status summary |
| `invoice` | Invoice document |
| `consent` | Consent / signature document |

PDF generation is performed server-side using Puppeteer or wkhtmltopdf. The endpoint streams the generated PDF as `application/pdf`.

---

## 5. Database Schema

The primary database is PostgreSQL 15. The `time_entries` table uses the TimescaleDB extension (hypertable on `start_time`) for efficient time-series queries.

---

### 5.1 `tasks`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Task identifier |
| `title` | text | NOT NULL | Task title |
| `project_id` | UUID | FK → projects | Associated project |
| `client_id` | UUID | FK → customers | Associated customer |
| `status` | text | NOT NULL | Current status (e.g., open, in_progress, completed) |
| `priority` | text | | Priority level |
| `due_date` | timestamptz | | Task due date |
| `est_hours` | numeric | | Estimated hours |
| `logged_hours` | numeric | | Actual logged hours (computed or updated) |
| `assignee_id` | UUID | FK → workers | Assigned worker |
| `description` | text | | Detailed task description |
| `steps` | jsonb | | Ordered list of task steps |
| `current_step` | integer | | Index of the current active step |
| `pfe_ref_type` | text | | PFE external reference type |
| `pfe_ref_id` | text | | PFE external reference ID |
| `pfe_node_id` | text | | PFE network node identifier |
| `pfe_segment_id` | text | | PFE network segment identifier |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | Last update timestamp |

---

### 5.2 `time_entries`

TimescaleDB hypertable partitioned by `start_time`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Entry identifier |
| `task_id` | UUID | FK → tasks | Associated task |
| `worker_id` | UUID | FK → workers | Worker who logged time |
| `start_time` | timestamptz | NOT NULL | Timer start (hypertable dimension) |
| `end_time` | timestamptz | | Timer end (null if running) |
| `duration_sec` | integer | | Duration in seconds |
| `type` | text | | Entry type (work, travel, break, etc.) |
| `note` | text | | Optional note |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Record creation timestamp |

---

### 5.3 `completion_records`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Completion record identifier |
| `task_id` | UUID | FK → tasks | Associated task |
| `completion_note` | text | | Final (possibly AI-corrected) completion note |
| `completion_note_original` | text | | Original unmodified note before AI correction |
| `delay_reason` | text | | Reason for any delay |
| `bill_comment` | text | | Billing note |
| `signature_data` | text | | Base64 or URL of captured signature |
| `signature_name` | text | | Signatory name |
| `signature_role` | text | | Signatory role |
| `signed_at` | timestamptz | | Timestamp of signature capture |
| `ai_corrected` | boolean | | Whether AI correction was applied |
| `lang` | text | | Language code of completion note |
| `copy_email` | text | | Email address for copy delivery |
| `copy_channel` | text | | Notification channel for copy |
| `timestamp` | timestamptz | NOT NULL DEFAULT now() | Record creation timestamp |
| `worker_id` | UUID | FK → workers | Worker who submitted the record |

---

### 5.4 `material_entries`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Material entry identifier |
| `task_id` | UUID | FK → tasks | Associated task |
| `worker_id` | UUID | FK → workers | Worker who logged the material |
| `name` | text | NOT NULL | Material name |
| `quantity` | numeric | NOT NULL | Quantity used |
| `unit` | text | NOT NULL | Unit of measure (e.g., pcs, m, kg) |
| `unit_price` | numeric | | Unit price for billing |
| `bill_comment` | text | | Billing note for this material |
| `timestamp` | timestamptz | NOT NULL DEFAULT now() | Record creation timestamp |

---

### 5.5 `task_photos`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Photo record identifier |
| `task_id` | UUID | FK → tasks | Associated task |
| `completion_id` | UUID | FK → completion_records | Associated completion record |
| `storage_url` | text | NOT NULL | S3/R2 storage URL |
| `photo_type` | enum | NOT NULL | One of: `report`, `identity`, `paper_sig` |
| `uploaded_at` | timestamptz | NOT NULL DEFAULT now() | Upload timestamp |

---

### 5.6 `identity_photos`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Identity photo identifier |
| `completion_id` | UUID | FK → completion_records | Associated completion record |
| `storage_url` | text | NOT NULL | S3/R2 storage URL |
| `uploaded_at` | timestamptz | NOT NULL DEFAULT now() | Upload timestamp |

---

### 5.7 `projects`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Project identifier |
| `name` | text | NOT NULL | Project name |
| `client_id` | UUID | FK → customers | Associated customer |
| `color` | text | | Display color (hex or named) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |

---

### 5.8 `customers`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Customer identifier |
| `name` | text | NOT NULL | Company or customer name |
| `contact_person` | text | | Primary contact name |
| `email` | text | | Contact email address |
| `phone` | text | | Contact phone number |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |

---

### 5.9 `workers`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Worker identifier |
| `code` | text | UNIQUE NOT NULL | Short worker code |
| `name` | text | NOT NULL | Full name |
| `role` | text | NOT NULL | WorkHub role (worker, planner, manager, etc.) |
| `capacity_hours_per_week` | numeric | | Planned weekly capacity in hours |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |

---

### 5.10 `translation_cache`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Cache entry identifier |
| `text_hash` | text | NOT NULL | SHA hash of source text + target language |
| `target_lang` | text | NOT NULL | Target language code |
| `translated_text` | text | NOT NULL | Cached translation result |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Cache entry creation timestamp |
| `hit_count` | integer | NOT NULL DEFAULT 0 | Number of times cache entry was served |

**Index:** Composite unique index on `(text_hash, target_lang)`.

---

### 5.11 `audit_log`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Audit log entry identifier |
| `entity_type` | text | NOT NULL | Entity type (e.g., task, completion, worker) |
| `entity_id` | UUID | NOT NULL | Identifier of the affected entity |
| `action` | text | NOT NULL | Action performed (e.g., CREATE, UPDATE, DELETE) |
| `actor_id` | UUID | NOT NULL | Worker/user who performed the action |
| `payload` | jsonb | | Full payload snapshot of the change |
| `timestamp` | timestamptz | NOT NULL DEFAULT now() | Audit event timestamp |

**Note:** The `audit_log` table must be append-only. No UPDATE or DELETE operations are permitted on audit records.

---

## 6. Real-Time / WebSocket Events

The server exposes a WebSocket connection for real-time event delivery. Clients authenticate the WebSocket handshake using the same JWT bearer token. Events are namespaced by entity and action.

### 6.1 Event Catalogue

| Event Name | Trigger | Payload Fields | Notes |
|---|---|---|---|
| `task.updated` | Any field on a task is modified | `taskId`, `changes` (diff object) | Broadcast to relevant planner/manager/worker |
| `task.assigned` | A task is assigned or reassigned to a worker | `taskId`, `workerId`, `assignedBy` | Delivered to assignee and planner |
| `task.completed` | A completion record is submitted for a task | `taskId`, `completionId`, `workerId` | Delivered to planner, manager, finance |
| `timer.started` | A new time entry is created with no end time | `timeEntryId`, `taskId`, `workerId`, `startTime` | Delivered to planner and manager |
| `timer.stopped` | An open time entry is closed with an end time | `timeEntryId`, `taskId`, `workerId`, `durationSec` | Delivered to planner and manager |
| `translation.ready` | Async AI translation completes | `trid`, `text` | Delivered to requesting client session |
| `inbox.message` | A new inbox/notification message is created | `messageId`, `recipientId`, `preview` | Delivered to recipient worker/user |

### 6.2 WebSocket Requirements

- The server must support authenticated WebSocket connections; unauthenticated connections must be rejected with a 401 close frame.
- Events must be scoped by role and entity ownership; workers must not receive events for tasks they are not assigned to.
- The WebSocket layer must support graceful reconnection with event replay for missed messages during short disconnects (replay window: configurable, recommended minimum 60 seconds).
- The translation.ready event must carry a transaction/request ID (`trid`) so the client can correlate the async response to the originating `/translate` request.

---

## 7. Permission Matrix

The following table defines the minimum required role for each resource action. Higher roles inherit lower-role permissions where logically applicable (e.g., planner can do everything a worker can for tasks in their scope).

| Resource / Action | Worker | Planner | Manager | Client | Finance |
|---|---|---|---|---|---|
| Read own assigned tasks | Yes | Yes | Yes | — | — |
| Read all tasks | — | Yes | Yes | — | — |
| Create task | — | Yes | — | — | — |
| Update task | — | Yes | — | — | — |
| Delete task | — | Yes | — | — | — |
| Assign task to worker | — | Yes | — | — | — |
| Read own project tasks (status only) | — | — | — | Yes | — |
| Kanban / capacity board view | — | — | Yes | — | — |
| Create time entry (own) | Yes | Yes | — | — | — |
| Read time entries (own) | Yes | Yes | — | — | — |
| Read all time entries | — | — | Yes | — | Yes |
| Create completion record | Yes | Yes | — | — | — |
| Read completion records | — | Yes | Yes | — | Yes |
| Create material entry | Yes | Yes | — | — | — |
| Read material entries | — | Yes | Yes | — | Yes |
| Read workers / capacity | — | Yes | Yes | — | — |
| Manage workers | — | — | — | — | — |
| Read projects | — | Yes | Yes | Yes (own) | Yes |
| Manage projects | — | Yes | — | — | — |
| Read customers | — | Yes | Yes | — | Yes |
| Manage customers | — | Yes | — | — | — |
| Generate invoice / export | — | — | — | — | Yes |
| Access AI translation | Yes | Yes | Yes | — | — |
| Access AI correction | Yes | Yes | Yes | — | — |
| Upload files | Yes | Yes | — | — | — |
| Generate PDF documents | — | Yes | Yes | — | Yes |
| View audit log | — | — | Yes | — | Yes |

**Notes:**
- Client role has read-only access to task status fields of their own projects only; time entry, material, and billing data are explicitly excluded.
- Finance role cannot create or modify any records; all access is read-only, scoped to completed tasks and associated financial data.
- Manager role has read access across all records but cannot create, update, or delete any entity.

---

## 8. Security Requirements

### 8.1 Authentication

- All API endpoints must reject requests without a valid, non-expired JWT.
- JWT signature must be verified using a server-held secret or asymmetric key pair (RS256 or HS256; RS256 preferred for production).
- Token expiry (`exp`) must be enforced; expired tokens must return HTTP 401.
- Tokens must be stored in Redis to enable server-side revocation (logout, role change, account suspension).
- Refresh token rotation must be implemented; old refresh tokens must be invalidated immediately on use.

### 8.2 Transport Security

- All HTTP traffic must be served over TLS 1.2 or higher (TLS 1.3 preferred).
- WebSocket connections must use WSS (WebSocket Secure) only.
- HTTP Strict Transport Security (HSTS) headers must be set on all responses.
- Mixed-content must be blocked; all sub-resources must be served over HTTPS.

### 8.3 Input Validation & Injection Prevention

- All API request bodies must be validated against a strict JSON schema before processing.
- SQL queries must use parameterized statements or an ORM that prevents raw string interpolation.
- File uploads must be validated for MIME type and file size; maximum file size must be enforced (recommended: 10 MB per file).
- Uploaded files must be stored in S3/R2 with non-guessable keys and must not be publicly accessible without signed URLs.
- AI-proxied content (translate, correct) must be sanitized to prevent prompt injection into the Anthropic API calls.

### 8.4 Rate Limiting

- The `/translate` and `/correct` endpoints must be rate-limited per authenticated user (recommended: 30 requests/minute).
- Global API rate limiting must be applied per IP and per authenticated token.
- Rate limit responses must return HTTP 429 with a `Retry-After` header.

### 8.5 Secrets Management

- Anthropic API keys, database credentials, Redis passwords, and S3/R2 access keys must never be committed to source control.
- All secrets must be provided via environment variables or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).
- JWT signing keys must be rotated on a defined schedule (recommended: every 90 days).

### 8.6 Audit & Logging

- All create, update, and delete operations on tasks, completions, material entries, and workers must generate an entry in the `audit_log` table.
- Audit log entries must include the actor's worker ID, the entity type and ID, the action, and a full payload snapshot.
- The audit log must be append-only; no mechanism for deletion or update of audit records must exist in the application layer.
- Application logs must not contain PII (e.g., full signatures, identity photo URLs) in plaintext.

### 8.7 CORS

- CORS must be configured to allow only explicitly whitelisted origin domains.
- Wildcard origins (`*`) must not be permitted on authenticated endpoints.
- Preflight (`OPTIONS`) responses must return correct `Access-Control-Allow-Headers` and `Access-Control-Allow-Methods`.

---

## 9. Performance Requirements

### 9.1 Response Time Targets

| Endpoint Category | Target P95 Latency | Notes |
|---|---|---|
| Task CRUD (`GET /tasks`, `POST /tasks`) | < 200 ms | With standard pagination (page size ≤ 100) |
| Time entry creation | < 150 ms | Write path must be low-latency for field use |
| Timesheet query | < 500 ms | May involve range scans on TimescaleDB |
| Completion record submission | < 300 ms | Excludes file upload time |
| AI translation (`/translate`) | < 3 000 ms (live) / < 50 ms (cached) | Cached responses served from Redis or DB cache |
| AI correction (`/correct`) | < 2 000 ms | Synchronous Anthropic API call |
| PDF generation (`/print`) | < 5 000 ms | Server-side render; may vary by document complexity |
| File upload (`/files`) | < 2 000 ms | Per file up to 10 MB; upload to S3/R2 |

### 9.2 Scalability Requirements

- The API must support horizontal scaling; no session state may be stored in application memory (use Redis).
- TimescaleDB hypertable partitioning on `time_entries.start_time` must be configured to support at least 2 years of time-series data without degradation.
- The translation cache must reduce Anthropic API call volume by at least 40% for recurring translation requests in steady-state operation.
- WebSocket connections must be handled via a pub/sub broker (Redis pub/sub or equivalent) to allow multi-instance deployments without sticky sessions.

### 9.3 Availability

- Target uptime: 99.5% monthly availability (excluding scheduled maintenance windows).
- Scheduled maintenance must be communicated at least 24 hours in advance.
- Database backups must be performed at minimum daily with point-in-time recovery (PITR) enabled.

### 9.4 Pagination & Data Limits

- All list endpoints (`GET /tasks`, `GET /workers`, `GET /customers`, `GET /projects`) must implement cursor-based or offset pagination.
- Default page size must not exceed 50 records; maximum page size must not exceed 200 records.
- Timesheet and time-entry range queries must enforce a maximum date range of 366 days per request.

---

## 10. Compliance Requirements

### 10.1 Commercial Document Retention (§257 HGB / §147 AO)

Under German commercial law (§257 Handelsgesetzbuch) and tax law (§147 Abgabenordnung), the following retention requirements apply:

| Document Type | Retention Period | Applicable Law |
|---|---|---|
| Invoices, billing records, payment documents | 10 years | §257 HGB, §147 AO |
| Completion records with material entries | 10 years | §257 HGB (commercial letters / business documents) |
| Contracts, order confirmations, delivery notes | 6 years | §257 HGB |
| Time records used for payroll / billing | 10 years | §147 AO |
| Audit logs for financial transactions | 10 years | §147 AO |

**Implementation requirements:**
- Completion records, material entries, invoice PDFs, and associated audit log entries must not be permanently deleted within the applicable retention period.
- A soft-delete mechanism (e.g., `deleted_at` timestamp, `archived` flag) must be used for user-facing removal of records; underlying data must be retained.
- The system must provide an export function (Finance role) to produce machine-readable (JSON/CSV) and human-readable (PDF) archives of retained records.
- Archived records must include all linked data: task, project, customer, materials, time entries, photos, and the completion record itself.

### 10.2 GDPR (General Data Protection Regulation — EU 2016/679)

| Requirement | Implementation |
|---|---|
| Lawful basis for processing | Processing of worker and customer personal data must have a documented lawful basis (contract performance / legitimate interest) |
| Data minimization | Identity photos and signature images must only be collected when explicitly required by the business process; excess collection is prohibited |
| Right of access (Art. 15) | A data export API or admin function must allow retrieval of all personal data held for a specific data subject |
| Right to erasure (Art. 17) | Where retention law permits, personal data must be erasable; where retention law mandates keeping records, the system must document the conflict and defer erasure |
| Data retention limits | Personal data not subject to commercial/tax retention must be purged after the defined operational retention period (recommended: 3 years post-contract end) |
| Consent for identity photos | Capture of identity/ID photos requires explicit consent; the `completion_records` table flags must support storing consent status |
| Data subject notification | Any data breach involving personal data must be notifiable within 72 hours per Art. 33 GDPR |
| Data processor agreements | Anthropic (AI processing), S3/R2 provider, and email delivery provider must each have a valid Data Processing Agreement (DPA) in place |
| Pseudonymization | Where feasible, worker codes (`workers.code`) should be used in logs and exports rather than full names |
| Security of processing (Art. 32) | Encryption at rest (S3/R2 server-side encryption) and in transit (TLS) must be enforced for all personal data |

### 10.3 eIDAS (Electronic Identification and Authentication — EU 910/2014)

Completion records include a captured signature used as evidence of service acceptance. The following requirements apply:

| Requirement | Implementation |
|---|---|
| Electronic signature capture | The system captures a drawn signature image (`signature_data`) along with name, role, and timestamp. This constitutes a Simple Electronic Signature (SES) under eIDAS. |
| Signature metadata | Every completion record must store: signatory name, signatory role, precise UTC timestamp (`signed_at`), and the signature image as an immutable record. |
| Integrity of signed records | Once a completion record is submitted, the `signature_data`, `signature_name`, `signature_role`, and `signed_at` fields must be immutable. Any attempt to modify these fields via the API must return HTTP 403. |
| Non-repudiation | The full completion record snapshot (including signature metadata) must be written to the `audit_log` at submission time to provide an auditable trail. |
| Advanced / Qualified signatures | If regulatory requirements escalate to Advanced Electronic Signatures (AdES) or Qualified Electronic Signatures (QES), integration with a qualified trust service provider (QTSP) must be implemented. This is out of scope for the current version but the schema must not preclude future extension. |
| PDF output | The generated completion PDF (`/print/completion/{id}`) must include the signature image, signatory details, and timestamp as a rendered visual representation of the signed record. |

### 10.4 Data Residency

- All data at rest (PostgreSQL, Redis, S3/R2) must be stored within the European Economic Area (EEA) unless a specific cross-border transfer mechanism (e.g., Standard Contractual Clauses) is in place and documented.
- AI translation and correction requests sent to the Anthropic API involve data leaving the EEA; a valid DPA with Anthropic and documentation of the transfer mechanism is required before production use.

---

*End of document.*
