# RBAC Enforcement

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `api/app/Filters/RbacFilter.php` · `api/app/Models/UserModel.php` · `api/app/Controllers/Auth.php`

---

## Overview

Role-based access control enforced at the API route level via `RbacFilter`. Every protected route declares required rights (e.g., `rbac:invoices.read`, `rbac:invoices.delete`). The filter verifies the JWT, looks up the user's roles and rights in the `user_roles` table, and rejects the request with 403 if the right is missing. Super-admins bypass the check via a role flag rather than a hardcoded `hasRight()` bypass.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open items | 0 |
| Completed items | 1 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| RBAC not enforced — any tenant user could access any route. `RbacFilter` now validates JWT + checks `user_roles` table. `UserModel::hasRight()` bypass removed. Super-admin check uses a role flag, not a hardcoded override. | 2026-05-05 | `RbacFilter.php`, `UserModel.php`, `Auth.php` |

---

## Right Naming Convention

```
invoices.read     invoices.create   invoices.update   invoices.delete
letters.read      letters.create    letters.update    letters.delete
buyers.read       buyers.create     buyers.update     buyers.delete
settings.read     settings.update
workspace.read    workspace.create  workspace.delete
tickets.read      tickets.create    tickets.update
```

---

## Security Notes

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| SEC-06 | RBAC not enforced — any tenant user could access any feature | 🔴 HIGH | ✅ FIXED 2026-05-05 |
