# WorkHub Compliance Documentation

**Module:** M-08 WorkHub Field-Service Work Management  
**Last updated:** 2026-05-27  
**Applicable regulations:** §16 ArbZG, EuGH C-55/18, eIDAS 910/2014, GDPR, §257 HGB / §147 AO, BSI IT-Grundschutz

---

## Overview

WorkHub processes sensitive employment data, digital signatures, and billable service records. This document summarises each compliance obligation, the technical implementation that satisfies it, and references to the relevant code.

---

## 1. Working Hours Law — §16 ArbZG + EuGH C-55/18

### Requirement

German Working Hours Act §16 requires employers to record start, end, and duration of daily working hours. The EuGH C-55/18 ruling requires an *objective, reliable, and accessible* electronic time-recording system.

Break obligations: 30 min after 6h work, 45 min after 9h.

### Implementation

| Mechanism | Detail | Code |
|-----------|--------|------|
| Time entry records | `workhub_time_entries` table stores `started_at`, `ended_at`, `entry_type` (`work` | `break`), `task_id`, `worker_id`, `tenant_id` | `WorkhubTimeEntryModel.php` |
| Break tracking | Separate `break` entry type; break minutes computed from adjacent entries | `TimerController::pause()` |
| Break reminder | §16 ArbZG toast shown when `work_minutes >= 360` (6h) without a break | `TimerWidget.tsx` |
| §16 ArbZG notice | Legal disclaimer printed on every Timesheet PDF | `api/app/Views/workhub/pdf/timesheet.php` |
| Overtime flag | ⚠ indicator on cells where `net_hours > 8` | `WorkHubTimesheet.tsx` |
| Stop compliance check | `TimerController::stop()` computes total daily work + break and returns `arbzg_status` | `TimerController.php` |

### Evidence for Audit

Run `php spark workhub:retention` to list all time entries and their retention status. `audit_logs` records every timer start/stop with `tenant_id`, `user_id`, `task_id`, and `ip_address` in the `details` JSON.

---

## 2. Electronic Signatures — eIDAS Regulation 910/2014

### Requirement

WorkHub uses **Simple Electronic Signature (SES)** under eIDAS Art. 3(10), which requires that the signatory is identifiable and the signature is linked to the signed data.

SES does NOT require a qualified certificate. The metadata approach (IP, UA, timestamp, consent text hash) is sufficient and widely used in EU field-service applications.

### Implementation

| eIDAS element | Implementation | Field |
|---------------|----------------|-------|
| Signatory identity | Worker: authenticated JWT user. Customer: name entered and linked to completion record | `customer_name` |
| Signature data | Canvas-based SVG signature pad exported as base64 | `worker_signature_data`, `customer_signature_data` |
| Signature timestamp (UTC) | `worker_signed_at`, `customer_signed_at` stored as `DATETIME` | Schema |
| IP address of signing device | `$request->getIPAddress()` | `signed_ip` |
| User agent | `$request->getUserAgent()->getAgentString()` (truncated 500 chars) | `signed_user_agent` |
| Consent text hash | SHA-256 of the consent text displayed to the signatory at time of signing | `consent_text_version` (64-char hex) |
| Consent statement | "By signing you confirm…" — full text defined in `SignaturePad.tsx` | UI |
| GDPR consent | `gdpr_consent_given = 1`, `gdpr_consent_at` timestamp | Schema |

**Code reference:** `api/app/Controllers/WorkHub/CompletionController.php` lines 88–91 (worker), 169–172 (customer)

### Signature Evidence Section

The Completion Certificate PDF (`completion_certificate.php`) includes a dedicated "Signature Evidence" section displaying all eIDAS metadata fields. This makes the record self-contained for dispute resolution.

### What WorkHub does NOT do

- Does NOT store biometric data
- Does NOT use Qualified Electronic Signatures (QES) — SES is sufficient for field-service completion records
- Does NOT issue or verify X.509 certificates

---

## 3. GDPR — General Data Protection Regulation

### Lawful Basis

**Art. 6(1)(b)** — Processing necessary for performance of a contract (field-service task completion). Workers and customers are informed via the consent form PDF and the in-app consent text before signing.

### Data Minimisation

WorkHub collects only data necessary for the task record:
- Worker: name, role, capacity, skills, language preference
- Customer: name + signature (for billing/completion record only)
- Photos: jobsite evidence + worker identity (identity photo stored once, not per task)

### Rights Implementation

| Right | Implementation |
|-------|----------------|
| Art. 15 — Access | `GdprExportService::exportForUser()` — ZIP with JSON manifests of all WorkHub records |
| Art. 17 — Erasure | `GdprDeletionService::processForUser()` — anonymises PII; dual-signed completion records retained for §257 HGB but personal data fields set to `REDACTED` |
| Art. 20 — Portability | GDPR export ZIP is machine-readable JSON |
| Art. 7 — Withdrawal | Consent withdrawal triggers `GdprDeletionService`; note that §257 HGB records cannot be fully deleted during retention period |

**Code:** `api/app/Services/GdprExportService.php`, `api/app/Services/GdprDeletionService.php`

### Consent Form PDF

A printable GDPR consent form (`consent_form.php`) is generated per task. It includes:
- Data collected (table of fields + purpose)
- Retention period notice (10 years for dual-signed records)
- Rights summary (Art. 15–22)
- Pre-populated checkboxes from completion record
- Signature block with eIDAS metadata

### Data Retention / Deletion

| Data category | Retention | Deletion |
|---------------|-----------|---------|
| Worker identity photo | Until GDPR deletion request | `GdprDeletionService` deletes S3 object |
| Dual-signed completion records | 10 years (§257 HGB) | Cannot delete during statutory period; PII anonymised |
| Non-signed completion records | Until GDPR deletion request | Deleted immediately |
| Time entries | 10 years (§257 HGB — labour cost audit) | Cannot delete during statutory period |
| Inbox messages | No statutory obligation | Deleted on GDPR erasure request |
| Translation cache | 7-day TTL (auto-expire) | Deleted on GDPR erasure request |
| Audit log | 10 years (system integrity) | User identifier replaced with `REDACTED_GDPR_YYYYMMDD` |

---

## 4. Commercial Record Retention — §257 HGB / §147 AO

### Requirement

§257 HGB and §147 AO require commercial records (invoices, delivery notes, contracts) to be retained for **10 years**. Dual-signed WorkHub completion records that triggered an invoice are considered commercial records.

### Implementation

| Mechanism | Detail | Code |
|-----------|--------|------|
| Deletion guard | `WorkhubTaskModel::delete()` and `CompletionController` block deletion of dual-signed records with a 409 response | `WorkhubCompletionRecordModel.php` |
| Retention CLI command | `php spark workhub:retention` flags records >9 years old (approaching expiry) and >10 years old (eligible for archival) | `WorkHubRetentionCommand.php` |
| GDPR erasure exception | `GdprDeletionService` retains the record row but anonymises PII fields (`customer_name`, signature data, `signed_ip`, `signed_user_agent`) | `GdprDeletionService.php` |
| Retention notice in PDF | Invoice and Completion Certificate PDFs include a footer: "Retained for 10 years per §257 HGB / §147 AO" | PDF templates |

### Running the Retention Command

```bash
# Check approaching records
php spark workhub:retention

# Check if a specific record can be deleted
php spark workhub:retention --check-delete=<completion_record_id>
```

---

## 5. Storage Security — BSI IT-Grundschutz

### Requirements (relevant controls)

- **APP.3.1** — Web application: input validation, output encoding, secure session management
- **CON.4** — Cryptography: TLS 1.2+, secure key management
- **OPS.1.1.3** — Patch management
- **SYS.4.3** — Embedded systems (field device photos)

### Implementation

| Control | Implementation |
|---------|----------------|
| TLS 1.2+ | `ForceHTTPS` filter applied globally; no HTTP fallback |
| JWT authentication | `UnifiedAuthFilter` validates HMAC-SHA256 JWT on every request |
| RBAC | 13 WorkHub-specific rights enforced by `RbacFilter` per route |
| Input validation | Completion note length, MIME type check via `finfo` (libmagic), not extension |
| Rate limiting | AI endpoints: 60/min tenant, 10/min user (`WorkHubRateLimitFilter`) |
| S3 signed URLs | Photo URLs expire after 15 minutes; raw bucket URLs never returned to clients |
| S3 tenant isolation | Storage path prefix: `workhub/{tenant_id}/{task_id}/` prevents cross-tenant traversal |
| AI key security | Anthropic API key stored server-side in `.env`; never exposed to client |
| SQL injection | CodeIgniter 4 query builder with parameterised queries throughout |
| XSS | All API responses are `application/json`; no HTML output from WorkHub endpoints |
| CORS | `CorsFilter` restricts allowed origins to configured domain list |
| Audit trail | All CRUD and lifecycle events written to `audit_logs` via `AuditTrait::logWorkhubEvent()` |

---

## 6. AI Processing Transparency

AI correction and translation use the **Anthropic Claude Sonnet** API.

- Calls logged to `ai_query_history` with `source = 'workhub'`
- Monthly usage tracked in `workhub_usage_monthly.ai_calls_used`
- API key stored server-side only — never sent to the client
- Translation results cached for 7 days in `workhub_translation_cache` to reduce repeated API calls
- Users can always view the original text ("Show original" toggle in `TranslationToggle.tsx`)

---

## 7. Compliance Checklist

| Requirement | Status | Evidence |
|-------------|--------|---------|
| §16 ArbZG time recording | ✅ | `workhub_time_entries` table + break tracking |
| §16 ArbZG break reminders | ✅ | 6h toast in `TimerWidget.tsx` |
| §16 ArbZG legal notice on timesheet | ✅ | `timesheet.php` PDF template |
| EuGH C-55/18 accessible records | ✅ | Timesheet view + PDF export |
| eIDAS SES metadata | ✅ | `signed_ip`, `signed_user_agent`, `consent_text_version` (SHA-256) |
| eIDAS consent text shown before signing | ✅ | `SignaturePad.tsx` + `consent_form.php` |
| GDPR Art. 6 lawful basis | ✅ | Art. 6(1)(b) — contract performance |
| GDPR consent form | ✅ | `consent_form.php` PDF |
| GDPR Art. 15 access right | ✅ | `GdprExportService.php` |
| GDPR Art. 17 erasure | ✅ | `GdprDeletionService.php` with §257 HGB exception |
| §257 HGB 10-year retention | ✅ | Deletion guard + `WorkHubRetentionCommand.php` |
| S3 signed URLs (no raw URLs) | ✅ | `WorkHubStorageService.php` — 15 min TTL |
| MIME type server-side validation | ✅ | `finfo` in `WorkHubStorageService::validateUpload()` |
| AI rate limiting | ✅ | `WorkHubRateLimitFilter.php` — 60/min tenant, 10/min user |
| Anthropic API key server-side only | ✅ | `.env` only; never in API responses |
| Full audit trail | ✅ | `AuditTrait::logWorkhubEvent()` — 15 event types |
| Multi-tenant isolation | ✅ | All tables/queries/S3 paths scoped to `tenant_id` |

---

*For regulatory audit queries contact: compliance@[your-domain]*  
*Document ID: WH-086 · Last reviewed: 2026-05-27*
