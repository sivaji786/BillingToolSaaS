# Telegram Ticket Notifications — Module Plan

**Created:** 2026-05-07  
**Status:** Implemented — 2026-05-08  
**Scope:** Push a Telegram message to a configured group whenever a support ticket is created or updated

---

## Table of Contents

1. [Overview](#1-overview)
2. [Trigger Events](#2-trigger-events)
3. [Message Formats](#3-message-formats)
4. [Architecture](#4-architecture)
5. [Database Changes](#5-database-changes)
6. [New Files](#6-new-files)
7. [Modified Files](#7-modified-files)
8. [Admin UI Changes](#8-admin-ui-changes)
9. [API Endpoints](#9-api-endpoints)
10. [Configuration](#10-configuration)
11. [Error Handling & Safety](#11-error-handling--safety)
12. [Security Considerations](#12-security-considerations)
13. [Testing Checklist](#13-testing-checklist)
14. [Implementation Order](#14-implementation-order)

---

## 1. Overview

The Telegram Notifications module extends the existing email notification system in `TicketController` to also push real-time messages to a designated Telegram group or channel. It follows the same non-blocking, fire-and-forget pattern already used for `notifySuperAdmins()`, `notifySubmitter()`, and `notifyAssignee()`.

**How Telegram Bot API works:**
1. A bot is created via [@BotFather](https://t.me/botfather) — this gives a **Bot Token**
2. The bot is added to the target group/channel
3. The group/channel **Chat ID** is obtained (can be negative for groups, e.g. `-1001234567890`)
4. Messages are sent via `POST https://api.telegram.org/bot{TOKEN}/sendMessage`

**Configuration storage:** Bot Token and Chat ID are stored in the `platform_company_details` table — the same table that already holds admin-level settings. This allows the super-admin to manage them from the existing Settings UI without touching `.env` files.

**Fallback:** If no token/chat ID is configured, the service is silently skipped — ticket operations are never blocked.

---

## 2. Trigger Events

| Event | Source method | Telegram message sent |
|---|---|---|
| Ticket created | `TicketController::create()` | Yes — full details |
| Status changed | `TicketController::update()` | Yes — old → new status |
| Priority changed | `TicketController::update()` | Yes — old → new priority |
| Assigned to admin | `TicketController::update()` | Yes — assignee name |
| Admin comment added | `TicketController::update()` | Yes — first 300 chars |
| Bulk status update | `TicketController::bulkUpdate()` | Yes — summary (N tickets → status) |

**Not triggered by:**
- Internal tracking log writes
- Read operations (index, tracking, listAdmins)
- No-op updates (same status/priority as existing)

---

## 3. Message Formats

All messages use Telegram's **HTML parse mode**. Emoji provide at-a-glance context. Descriptions are truncated at 300 characters.

### 3.1 New Ticket Created

```
🎫 <b>New Ticket #42</b>

📌 <b>Subject:</b> Invoice not generating for client
⚡ <b>Priority:</b> HIGH
🌐 <b>Page:</b> /invoices/create
🖥 <b>IP:</b> 192.168.1.10

📝 <b>Description:</b>
<i>When I try to generate an invoice for Acme Corp the page freezes after clicking Save. This started happening after the update on...</i>

🔗 <a href="https://admin.example.com/#/SATicketDetails">View in Admin Panel</a>
```

### 3.2 Ticket Updated — Status Change

```
🔄 <b>Ticket #42 — Status Changed</b>

📌 <b>Subject:</b> Invoice not generating for client
📊 <b>Status:</b> open → <b>in_progress</b>
```

### 3.3 Ticket Updated — Priority Change

```
⚠️ <b>Ticket #42 — Priority Changed</b>

📌 <b>Subject:</b> Invoice not generating for client
⚡ <b>Priority:</b> medium → <b>CRITICAL</b>
```

### 3.4 Ticket Assigned

```
👤 <b>Ticket #42 — Assigned</b>

📌 <b>Subject:</b> Invoice not generating for client
🧑‍💼 <b>Assigned to:</b> John Smith
```

### 3.5 Admin Comment Added

```
💬 <b>Ticket #42 — Admin Reply</b>

📌 <b>Subject:</b> Invoice not generating for client
✅ <b>Status:</b> in_progress
📨 <b>Reply:</b>
<i>Hi, we've identified the issue with the invoice serialization. A fix will be deployed within the hour. Please try again after 15:00 UTC...</i>
```

### 3.6 Bulk Status Update

```
📦 <b>Bulk Update — 5 Tickets → resolved</b>
Ticket IDs: #12, #15, #18, #23, #31
```

---

## 4. Architecture

```
HTTP Request (create / update ticket)
        │
        ▼
TicketController::create() / update() / bulkUpdate()
        │
        ├── ① DB write (TicketModel::save / update)
        ├── ② Tracking log (TicketTrackingModel::save)
        ├── ③ Email: notifySuperAdmins() / notifySubmitter() / notifyAssignee()
        └── ④ Telegram: TelegramService::send()   ← NEW
                │
                ├── isConfigured()? No → silently return
                ├── Build message string (HTML)
                ├── POST https://api.telegram.org/bot{TOKEN}/sendMessage
                │       chat_id = {CHAT_ID}
                │       text    = {message}
                │       parse_mode = HTML
                ├── Timeout: 5 seconds (cURL)
                └── On failure: log_message('error', ...) — does NOT throw
```

**Non-blocking contract:** Step ④ never throws an exception or returns an HTTP error to the caller. The ticket operation succeeds regardless of Telegram API availability.

---

## 5. Database Changes

### 5.1 Migration — Add Telegram columns to `platform_company_details`

**File:** `api/app/Database/Migrations/2026-05-07-000001_AddTelegramToPlatformSettings.php`

```php
public function up()
{
    $this->forge->addColumn('platform_company_details', [
        'telegram_bot_token' => [
            'type'       => 'VARCHAR',
            'constraint' => 255,
            'null'       => true,
            'default'    => null,
            'after'      => 'bank_account_name',
        ],
        'telegram_chat_id' => [
            'type'       => 'VARCHAR',
            'constraint' => 100,
            'null'       => true,
            'default'    => null,
            'after'      => 'telegram_bot_token',
        ],
        'telegram_enabled' => [
            'type'    => 'TINYINT',
            'constraint' => 1,
            'null'    => false,
            'default' => 0,
            'after'   => 'telegram_chat_id',
        ],
    ]);
}

public function down()
{
    $this->forge->dropColumn('platform_company_details', [
        'telegram_bot_token',
        'telegram_chat_id',
        'telegram_enabled',
    ]);
}
```

**Why `platform_company_details` (not `.env`):**
- Already used for all admin-level settings (company name, IBAN, etc.)
- Allows the super-admin to change bot/group without a server deploy
- Consistent with how SMTP, API keys, and company profile are managed

**Why 3 columns (not 1 JSON blob):**
- `telegram_bot_token` and `telegram_chat_id` are independent values
- `telegram_enabled` acts as a master on/off switch — safe to toggle without clearing the token

---

## 6. New Files

### 6.1 `api/app/Services/TelegramService.php`

```php
<?php

namespace App\Services;

class TelegramService
{
    private string $botToken;
    private string $chatId;
    private bool   $enabled;

    public function __construct()
    {
        $row = \Config\Database::connect()
            ->table('platform_company_details')
            ->select('telegram_bot_token, telegram_chat_id, telegram_enabled')
            ->get()->getRowArray();

        $this->botToken = $row['telegram_bot_token'] ?? getenv('TELEGRAM_BOT_TOKEN') ?? '';
        $this->chatId   = $row['telegram_chat_id']   ?? getenv('TELEGRAM_CHAT_ID')   ?? '';
        $this->enabled  = (bool)($row['telegram_enabled'] ?? false);
    }

    public function isConfigured(): bool
    {
        return $this->enabled && !empty($this->botToken) && !empty($this->chatId);
    }

    /**
     * Send a plain HTML-formatted message to the configured group.
     * Returns true on success, false on failure. Never throws.
     */
    public function send(string $message): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $url     = "https://api.telegram.org/bot{$this->botToken}/sendMessage";
        $payload = json_encode([
            'chat_id'    => $this->chatId,
            'text'       => $message,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ]);

        try {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 5,           // 5-second hard timeout
                CURLOPT_CONNECTTIMEOUT => 3,
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                log_message('error', '[Telegram] HTTP ' . $httpCode . ': ' . $response);
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            log_message('error', '[Telegram] ' . $e->getMessage());
            return false;
        }
    }

    // ── Convenience builders ──────────────────────────────────────────────────

    public function ticketCreated(array $ticket, int $ticketId): void
    {
        $priority    = strtoupper($ticket['priority'] ?? 'medium');
        $description = mb_substr($ticket['description'] ?? '', 0, 300);
        if (mb_strlen($ticket['description'] ?? '') > 300) {
            $description .= '...';
        }

        $page = !empty($ticket['page']) ? "\n🌐 <b>Page:</b> " . htmlspecialchars($ticket['page']) : '';
        $ip   = !empty($ticket['client_ip']) ? "\n🖥 <b>IP:</b> " . htmlspecialchars($ticket['client_ip']) : '';

        $msg = "🎫 <b>New Ticket #{$ticketId}</b>\n\n"
             . "📌 <b>Subject:</b> " . htmlspecialchars($ticket['subject']) . "\n"
             . "⚡ <b>Priority:</b> {$priority}"
             . $page
             . $ip . "\n\n"
             . "📝 <b>Description:</b>\n"
             . "<i>" . htmlspecialchars($description) . "</i>";

        $this->send($msg);
    }

    public function ticketUpdated(int $ticketId, string $subject, array $changes, ?string $comment): void
    {
        if (empty($changes) && empty($comment)) {
            return;
        }

        $lines = ["🔄 <b>Ticket #{$ticketId} — Updated</b>\n\n📌 <b>Subject:</b> " . htmlspecialchars($subject)];

        foreach ($changes as $change) {
            $action = $change['action'] ?? '';
            switch ($action) {
                case 'status_change':
                    $lines[] = "📊 <b>Status:</b> {$change['old_value']} → <b>{$change['new_value']}</b>";
                    break;
                case 'priority_change':
                    $lines[] = "⚡ <b>Priority:</b> {$change['old_value']} → <b>" . strtoupper($change['new_value']) . "</b>";
                    break;
                case 'assignment_change':
                    $lines[] = "👤 <b>Assigned to:</b> " . htmlspecialchars($change['new_value']);
                    break;
            }
        }

        if (!empty($comment)) {
            $excerpt = mb_substr($comment, 0, 300);
            if (mb_strlen($comment) > 300) $excerpt .= '...';
            $lines[] = "💬 <b>Comment:</b>\n<i>" . htmlspecialchars($excerpt) . "</i>";
        }

        $this->send(implode("\n", $lines));
    }

    public function ticketsBulkUpdated(array $ids, string $status): void
    {
        $count   = count($ids);
        $idList  = implode(', ', array_map(fn($id) => '#' . $id, array_slice($ids, 0, 20)));
        $trailer = count($ids) > 20 ? ' (+' . (count($ids) - 20) . ' more)' : '';

        $msg = "📦 <b>Bulk Update — {$count} " . ($count === 1 ? 'Ticket' : 'Tickets') . " → {$status}</b>\n"
             . "IDs: {$idList}{$trailer}";

        $this->send($msg);
    }
}
```

---

## 7. Modified Files

### 7.1 `api/app/Controllers/TicketController.php`

**Add** a private `telegram()` helper that lazily instantiates `TelegramService`:

```php
private function telegram(): \App\Services\TelegramService
{
    static $svc = null;
    return $svc ??= new \App\Services\TelegramService();
}
```

**In `create()`** — after `$this->notifySuperAdmins($data, $ticketId);`:

```php
$this->telegram()->ticketCreated($data, $ticketId);
```

**In `update()`** — after the transaction commits (after `$db->transComplete()`), alongside the existing `notifySubmitter()` call:

```php
// Telegram notification
$this->telegram()->ticketUpdated(
    (int)$id,
    $ticket['subject'],
    $trackingLogs,
    $comment
);
```

**In `bulkUpdate()`** — after `$db->transComplete()`:

```php
$this->telegram()->ticketsBulkUpdated($ids, $status);
```

---

### 7.2 `api/app/Models/PlatformCompanyDetailsModel.php`

Add the three new columns to `$allowedFields`:

```php
protected $allowedFields = [
    // ... existing fields ...
    'telegram_bot_token',
    'telegram_chat_id',
    'telegram_enabled',
];
```

---

### 7.3 `api/app/Controllers/AdminSettings.php`

**`index()` response** — include telegram fields in the `companyProfile` data already returned:

```php
// companyProfile already includes all columns from platform_company_details,
// so telegram_bot_token, telegram_chat_id, telegram_enabled are returned automatically.
// Mask the token before sending to frontend:
if (!empty($companyProfile['telegram_bot_token'])) {
    $companyProfile['telegram_bot_token_set'] = true;
    $companyProfile['telegram_bot_token'] = str_repeat('•', 8)
        . substr($companyProfile['telegram_bot_token'], -4); // show last 4 chars only
} else {
    $companyProfile['telegram_bot_token_set'] = false;
}
```

**`updateSystemSettings()` (PUT /settings/system)** — already writes any field to `platform_company_details`; just ensure the new columns are in `allowedFields` (Step 7.2). The frontend sends `telegram_bot_token` only if the user explicitly typed a new value (not the masked placeholder).

**New method `testTelegram()`:**

```php
/**
 * POST /api/admin/settings/test-telegram
 * Send a test message to the configured Telegram group.
 */
public function testTelegram()
{
    $svc = new \App\Services\TelegramService();

    if (!$svc->isConfigured()) {
        return $this->fail('Telegram is not configured. Set a Bot Token and Chat ID first.', 400);
    }

    $ok = $svc->send(
        "✅ <b>BillingTool Test Message</b>\n\nTelegram notifications are configured correctly."
    );

    if ($ok) {
        return $this->respond(['success' => true, 'message' => 'Test message sent successfully']);
    }
    return $this->fail('Failed to send test message. Check the Bot Token and Chat ID.', 500);
}
```

---

### 7.4 `api/app/Config/Routes.php`

In the admin routes group, alongside the existing `settings/test-email`:

```php
$routes->post('settings/test-telegram', '\App\Controllers\AdminSettings::testTelegram');
```

---

### 7.5 `src/services/adminApi.ts`

Add `testTelegram` to `adminSettingsService`:

```typescript
testTelegram: async (): Promise<{ success: boolean; message: string }> => {
    const response = await adminApi.post<{ success: boolean; message: string }>(
        '/settings/test-telegram'
    );
    return response.data;
},
```

Update the `AdminSettings` TypeScript type to include Telegram fields:

```typescript
// In types/admin.ts or inline in adminApi.ts
interface AdminSettings {
    // ... existing fields ...
    companyProfile: {
        // ... existing fields ...
        telegram_bot_token?: string;      // masked on read
        telegram_bot_token_set?: boolean; // true if a token is saved
        telegram_chat_id?: string;
        telegram_enabled?: boolean;
    };
}
```

---

## 8. Admin UI Changes

### 8.1 SAsettings.tsx — New "Telegram Notifications" Card

Add a new card in the Notifications section (after SMTP test card):

**Visual layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ 📨 Telegram Notifications                                     │
│ Push ticket events to a Telegram group or channel            │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Enable Telegram Notifications              [ Toggle ]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Bot Token                                                    │
│ [••••••••••••5abc    ] ← masked, placeholder shows last 4   │
│ Leave blank to keep current token                           │
│                                                              │
│ Chat ID                                                      │
│ [-1001234567890      ]                                       │
│ Telegram group ID (negative) or channel username (@name)    │
│                                                              │
│ [ Send Test Message ]   ← calls POST /settings/test-telegram│
└─────────────────────────────────────────────────────────────┘
```

**State additions:**
```typescript
const [telegramToken, setTelegramToken] = useState('');
const [telegramChatId, setTelegramChatId] = useState('');
const [telegramEnabled, setTelegramEnabled] = useState(false);
const [sendingTgTest, setSendingTgTest] = useState(false);
```

**Initialise from settings query:**
```typescript
useEffect(() => {
    if (settings?.companyProfile) {
        setTelegramChatId(settings.companyProfile.telegram_chat_id ?? '');
        setTelegramEnabled(!!settings.companyProfile.telegram_enabled);
        // token is masked — only show if already set via token_set flag
    }
}, [settings]);
```

**Save behavior:** Token field is only sent to the backend if the user typed a new value (non-empty, non-masked). This prevents overwriting the saved token with the masked placeholder.

**Test button handler:**
```typescript
const handleTelegramTest = async () => {
    setSendingTgTest(true);
    try {
        await adminSettingsService.testTelegram();
        toast.success('Test message sent to Telegram');
    } catch {
        toast.error('Failed — check Bot Token and Chat ID');
    } finally {
        setSendingTgTest(false);
    }
};
```

---

## 9. API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/settings/test-telegram` | Super-admin | Send a test message to the configured group |
| `PUT` | `/api/admin/settings/system` | Super-admin | Already exists — saves telegram fields alongside other settings |
| `GET` | `/api/admin/settings` | Super-admin | Already exists — now returns masked telegram fields |

No new public endpoints. Telegram messages are always triggered server-side, never from the frontend.

---

## 10. Configuration

### 10.1 Via Admin UI (recommended)

1. Go to Admin → Settings → Telegram Notifications
2. Enter Bot Token and Chat ID
3. Toggle "Enable Telegram Notifications" to on
4. Click "Send Test Message" to verify
5. Save

### 10.2 Via Environment Variables (fallback)

If the database columns are empty, `TelegramService` falls back to env vars:

```ini
# .env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
```

With env vars, the `telegram_enabled` toggle in DB still controls whether messages are sent. Set `telegram_enabled = 1` in the DB or add `TELEGRAM_ENABLED=true` check in `isConfigured()`.

### 10.3 How to get a Bot Token

1. Open Telegram → search `@BotFather`
2. Send `/newbot` → follow prompts → receive token like `123456789:ABCdef...`

### 10.4 How to get a Chat ID

**For a group:**
1. Add `@userinfobot` to the group
2. It replies with the Chat ID (negative number, e.g. `-1001234567890`)
3. Remove `@userinfobot` from the group

**For a channel:**
1. Add your bot as an admin to the channel
2. Post any message
3. Open `https://api.telegram.org/bot{TOKEN}/getUpdates` — the `chat.id` field is the channel ID

### 10.5 Bot permissions required

| Permission | Required? | Why |
|---|---|---|
| Send Messages | ✅ Yes | Core functionality |
| Send Photos | No | Not used |
| Pin Messages | No | Not used |
| Admin | No | Plain member with "can post" is sufficient |

---

## 11. Error Handling & Safety

### 11.1 Non-blocking design

`TelegramService::send()` catches all exceptions internally and returns `bool`. It never propagates an exception to `TicketController`. Ticket creation and updates succeed regardless of Telegram availability.

### 11.2 Timeout

`CURLOPT_TIMEOUT = 5` — if Telegram API is slow or unreachable, the request gives up after 5 seconds. The ticket HTTP response is not delayed.

### 11.3 Logging

All failures are written to CodeIgniter's log:
```
[ERROR] [Telegram] HTTP 401: {"ok":false,"error_code":401,"description":"Unauthorized"}
[ERROR] [Telegram] cURL error: Could not resolve host: api.telegram.org
```

Log path: `api/writable/logs/log-YYYY-MM-DD.php`

### 11.4 Configuration guard

`isConfigured()` returns `false` if:
- `telegram_enabled` is `0` or `false`
- `telegram_bot_token` is empty
- `telegram_chat_id` is empty

No API call is attempted when any of these conditions is true.

### 11.5 Rate limits

Telegram Bot API allows **30 messages/second** to a single chat. Ticket volume is expected to be well below this. Bulk updates with many tickets send a **single summary message** (not one per ticket), so bulk operations are rate-limit safe.

---

## 12. Security Considerations

| Risk | Mitigation |
|---|---|
| Bot token exposed in API response | Token is masked on read: `••••••••5abc`. Frontend never receives the raw token after initial save. |
| Bot token stored in plaintext DB | Document recommendation: encrypt at rest using AES-256 if compliance requires it. Out of scope for initial implementation. |
| Chat ID manipulation | Chat ID is a server-side config — not a user-supplied runtime value. Cannot be changed by tenants. |
| Message injection via ticket content | All ticket content passed through `htmlspecialchars()` before inclusion in the HTML message. |
| Unauthorized test endpoint | `POST /settings/test-telegram` is inside the admin RBAC filter — requires super-admin session. |
| Telegram API outage causes ticket failure | Prevented by non-blocking architecture (Step 11.1). |

---

## 13. Testing Checklist

### Unit / manual

- [ ] Create a ticket → message appears in group with correct subject, priority, description
- [ ] Update ticket status → message shows old → new status
- [ ] Update ticket priority → message shows old → new priority  
- [ ] Assign ticket to admin → message shows assignee name
- [ ] Add admin comment → message shows truncated comment
- [ ] Bulk update 3 tickets → single summary message with all IDs
- [ ] Telegram disabled (`telegram_enabled = 0`) → no message sent, ticket saves normally
- [ ] Empty Bot Token → no message sent, no error thrown
- [ ] Invalid Bot Token → `[ERROR] [Telegram] HTTP 401` in logs, ticket saves normally
- [ ] Invalid Chat ID → `[ERROR] [Telegram] HTTP 400: Bad Request: chat not found` in logs
- [ ] Telegram API unreachable (offline) → timeout after 5 s, ticket saves normally
- [ ] Token masking → GET settings returns `••••5abc`, not raw token
- [ ] Test button → sends ✅ test message, toast shows success
- [ ] Test button with empty config → toast shows error, no API call

### Regression

- [ ] Ticket creation still sends super-admin email
- [ ] Ticket update still sends submitter email
- [ ] Assignment change still sends assignee email
- [ ] Bulk update still works when Telegram is not configured

---

## 14. Implementation Order

Follow this order to keep each step independently testable:

```
Step 1 — Migration
  └── Create 2026-05-07-000001_AddTelegramToPlatformSettings.php
  └── php spark migrate

Step 2 — Service layer
  └── Create api/app/Services/TelegramService.php
  └── Verify manually: instantiate, call send() with test token

Step 3 — Model update
  └── Add telegram fields to PlatformCompanyDetailsModel::$allowedFields

Step 4 — Controller hook (TicketController)
  └── Add telegram() lazy helper
  └── Add notifyTelegram calls in create(), update(), bulkUpdate()
  └── Test: create a ticket, check logs

Step 5 — Settings backend
  └── Mask token in AdminSettings::index()
  └── Add testTelegram() method
  └── Add route: POST settings/test-telegram

Step 6 — API service (frontend)
  └── Add testTelegram() to adminSettingsService
  └── Add telegram fields to AdminSettings type

Step 7 — Admin UI
  └── Add Telegram Notifications card to SAsettings.tsx
  └── Wire save to updateSystemSettings (existing mutation)
  └── Wire test button to testTelegram()

Step 8 — QA
  └── Run full testing checklist (Section 13)
```

**Estimated effort:** 4–5 hours

---

## Appendix — Telegram Bot API Reference

```
POST https://api.telegram.org/bot{TOKEN}/sendMessage

Body (JSON):
{
  "chat_id":    "-1001234567890",
  "text":       "<b>Hello</b> world",
  "parse_mode": "HTML",
  "disable_web_page_preview": true
}

Success response (HTTP 200):
{
  "ok": true,
  "result": { "message_id": 123, ... }
}

Error response examples:
  HTTP 401  → {"ok":false,"error_code":401,"description":"Unauthorized"}     ← wrong token
  HTTP 400  → {"ok":false,"error_code":400,"description":"Bad Request: chat not found"}  ← wrong chat_id
  HTTP 429  → {"ok":false,"error_code":429,"description":"Too Many Requests: retry after 30"}
```

**HTML tags supported by Telegram:**  
`<b>bold</b>`, `<i>italic</i>`, `<u>underline</u>`, `<s>strikethrough</s>`,  
`<code>monospace</code>`, `<pre>block</pre>`, `<a href="url">link</a>`
