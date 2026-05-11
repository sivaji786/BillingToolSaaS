<?php

namespace App\Services;

class TelegramService
{
    private string $botToken;
    private string $chatId;
    private bool   $enabled;

    public function __construct()
    {
        $row = null;
        try {
            $row = \Config\Database::connect()
                ->table('platform_company_details')
                ->select('telegram_bot_token, telegram_chat_id, telegram_enabled')
                ->get()->getRowArray();
        } catch (\Throwable $e) {
            // Columns not yet migrated — fall through to env fallback
            log_message('info', '[Telegram] DB columns not available yet, using env fallback');
        }

        // Use CI4's env() helper — reads $_ENV first, so it always gets the current
        // .env value even when PHP's built-in server reuses the process across requests.
        $this->botToken = $row['telegram_bot_token'] ?: (env('TELEGRAM_BOT_TOKEN') ?: '');
        $this->chatId   = $row['telegram_chat_id']   ?: (env('TELEGRAM_CHAT_ID')   ?: '');

        // DB toggle takes precedence; fall back to env TELEGRAM_ENABLED
        $dbEnabled     = $row['telegram_enabled'] ?? null;
        $this->enabled = $dbEnabled !== null
            ? (bool)$dbEnabled
            : (bool)env('TELEGRAM_ENABLED', false);

        log_message('info', '[Telegram] configured=' . ($this->isConfigured() ? 'yes' : 'no')
            . ' token=' . (empty($this->botToken) ? 'empty' : 'set')
            . ' chatId=' . (empty($this->chatId) ? 'empty' : $this->chatId)
            . ' enabled=' . ($this->enabled ? 'true' : 'false'));
    }

    public function isConfigured(): bool
    {
        return $this->enabled && !empty($this->botToken) && !empty($this->chatId);
    }

    /**
     * Send HTML-formatted message to the configured group.
     * Returns true on success, false on failure. Never throws.
     */
    public function send(string $message): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $url     = "https://api.telegram.org/bot{$this->botToken}/sendMessage";
        $payload = json_encode([
            'chat_id'                  => $this->chatId,
            'text'                     => $message,
            'parse_mode'               => 'HTML',
            'disable_web_page_preview' => true,
        ]);

        try {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 5,
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

        $page = !empty($ticket['page'])
            ? "\n🌐 <b>Page:</b> " . htmlspecialchars($ticket['page'])
            : '';
        $ip = !empty($ticket['client_ip'])
            ? "\n🖥 <b>IP:</b> " . htmlspecialchars($ticket['client_ip'])
            : '';

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

        $lines = [
            "🔄 <b>Ticket #{$ticketId} — Updated</b>\n\n📌 <b>Subject:</b> " . htmlspecialchars($subject),
        ];

        foreach ($changes as $change) {
            switch ($change['action'] ?? '') {
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
            if (mb_strlen($comment) > 300) {
                $excerpt .= '...';
            }
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
