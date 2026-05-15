# Workspace / File Manager

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Workspace.tsx` · `api/app/Controllers/WorkspaceController.php`

---

## Overview

Tenant file storage and AI-powered document search. Users can upload files, browse folders, download or delete files, and search document content via an AI assistant that queries indexed text. Files are stored on disk; content is indexed for full-text search. ZIP download bundles multiple files.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open low | 1 |
| Completed items | 2 |

---

## Open Backlog

### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S4-15 | **Content indexing failures are silent.** When a file upload triggers content indexing and the indexer fails (unsupported format, timeout, disk error), the failure is swallowed and the user sees no feedback. The file is stored but its content is not searchable. Needs error logging and a user-facing warning. | `api/app/Controllers/WorkspaceController.php:~419–421` | 1 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| AI workspace search SQL injection: `validateAiWhereClause()` allowlist prevents arbitrary SQL in Gemini-generated queries | 2026-05-05 | `WorkspaceController.php` |
| Temp ZIP files not cleaned up: `register_shutdown_function` deletes ZIP after download; startup purge removes orphaned ZIPs | 2026-05-05 | `WorkspaceController.php` |

---

## Security Notes

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| SEC-02 | Gemini AI workspace search executed raw SQL from API response | 🔴 CRITICAL | ✅ FIXED 2026-05-05 |
