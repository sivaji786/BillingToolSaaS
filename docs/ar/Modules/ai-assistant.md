# AI Assistant

**Status:** 🔶 PARTIAL  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/GlobalAIAssistant.tsx` · `api/app/Controllers/AIInvoiceController.php` · `api/app/Controllers/WorkspaceController.php`

---

## Overview

AI-powered features across the tenant portal: invoice parsing from uploaded documents, letter body generation and improvement, and workspace document search powered by Gemini. All AI endpoints are rate-limited per user. API keys (Gemini, OpenAI) are configured by super-admins in system settings and excluded from frontend localStorage persistence.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open low | 1 |
| Completed items | 4 |

---

## Open Backlog

### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| — | **Silent API key failures.** When the Gemini or OpenAI API key is missing or invalid, AI endpoints fail without a clear user-facing error distinguishing "key not configured" from "service error". Users see a generic error toast. Needs a specific error code so the frontend can surface an actionable message ("AI is not configured — contact your admin"). | `api/app/Controllers/AIInvoiceController.php`, `GlobalAIAssistant.tsx` | 1 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| AI letter body improvement: "Improve with AI" button in LetterPreview calls `AIInvoiceController` to rewrite body content | 2026-05-08 | `LetterPreview.tsx`, `AIInvoiceController.php` |
| Global AI Assistant: letter generation flow — user describes a letter, AI generates salutation + body + closing | 2026-05-08 | `GlobalAIAssistant.tsx` |
| AI parse/improve endpoints had no per-user rate limit — throttle added: 20 requests/hour per user | 2026-05-05 | `AIInvoiceController.php` |
| Workspace AI search: SQL injection via Gemini-generated WHERE clause fixed — `validateAiWhereClause()` allowlist | 2026-05-05 | `WorkspaceController.php` |

---

## AI History

| Table | Retention |
|-------|-----------|
| `aiquery_history` | Trimmed to ≤ 100 rows per user by `cleanup:logs` cron |

---

## Security Notes

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| SEC-02 | Workspace AI search executed raw SQL from Gemini API response | 🔴 CRITICAL | ✅ FIXED 2026-05-05 |
| SEC-05 | AI endpoints had no per-user rate limit | 🔴 HIGH | ✅ FIXED 2026-05-05 |
| SEC-09 | Gemini/OpenAI API keys persisted to localStorage | MEDIUM | ✅ FIXED 2026-05-13 |
