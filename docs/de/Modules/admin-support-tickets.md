# Admin — Support Tickets

**Status:** ✅ DONE  
**Score:** 10/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Admin/SATickets.tsx`, `SATicketDetails.tsx` · `api/app/Controllers/TicketController.php` · `api/app/Services/TelegramService.php`

---

## Overview

Full support ticket management for super-admins. Tenants submit tickets from the customer portal; admins view, respond to, assign, prioritise, track SLA, and bulk close/resolve tickets. All ticket state changes trigger email notifications. Telegram push notifications can optionally alert admins of new or urgent tickets via a configured bot.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 10/10 |
| Open items | 0 |
| Completed items | 6 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| No email notification on ticket events — email sent on ticket creation and status change | 2026-05-08 | `TicketController.php` |
| No assignment to specific admin user — admin can assign ticket to any super-admin user | 2026-05-08 | `TicketController.php`, `SATickets.tsx`, `SATicketDetails.tsx` |
| No SLA / response time tracking — SLA timer starts on ticket creation; overdue flag set when breached | 2026-05-08 | `TicketController.php`, `SATicketDetails.tsx` |
| No bulk close/resolve action — checkbox selection + bulk status change added | 2026-05-08 | `TicketController.php`, `SATickets.tsx` |
| Priority enum choices incorrect — corrected to `low / medium / high / urgent` | 2026-04-28 | `SATickets.tsx` |
| Telegram notifications: new ticket alert sent to configured Telegram chat; test endpoint in admin settings | 2026-05-08 | `TelegramService.php`, `TicketController.php`, `AdminSettings.php`, `SAsettings.tsx`, `Routes.php`, migration `2026-05-08-000001` |
