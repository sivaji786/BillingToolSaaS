# Two-Factor Authentication

**Status:** ❌ OPEN  
**Score:** 0/10  
**Last updated:** 2026-05-15  
**Stack:** `api/app/Controllers/Auth.php` · `src/components/screens/Login.tsx` · `users` table

---

## Overview

TOTP-based second factor for tenant login. Currently not implemented. `Auth.php` issues a JWT immediately after password validation with no second factor, making a correct password sufficient for full account takeover. This is flagged as a HIGH security risk.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 0/10 |
| Open high | 1 |
| Completed items | 0 |

---

## Open Backlog

### HIGH — Security Risk

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S4-01 | **TOTP two-factor authentication not implemented.** Full implementation requires: (1) DB migration adding `totp_secret VARCHAR(64)` and `totp_enabled BOOLEAN` to `users` table; (2) `Auth::login()` check — if `totp_enabled`, return a `requires_totp` challenge instead of a JWT; (3) `POST /auth/totp-verify` endpoint validates the TOTP code and then issues the JWT; (4) Frontend login screen handles the two-step flow; (5) Setup screen (QR code + TOTP app pairing) in user settings. | `api/app/Controllers/Auth.php`, `users` migration, `src/components/screens/Login.tsx`, new setup screen | 5–6 h |

---

## Recommended Implementation Order

1. Migration: add `totp_secret`, `totp_enabled` to `users`
2. Backend: `Auth::login()` returns `{ status: 'requires_totp', challenge_token }` when 2FA enabled
3. Backend: `POST /auth/totp-verify` — validates TOTP code via `challenge_token`, issues JWT on success
4. Frontend: login splits into two steps (password → TOTP code)
5. Frontend: user settings screen for enabling 2FA and scanning QR code

---

## Security Notes

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| SEC-11 | Two-factor auth missing — single credential gives full account access | HIGH | ❌ OPEN (S4-01) |

---

## Related Modules

- Main auth flow: see [authentication.md](authentication.md)
