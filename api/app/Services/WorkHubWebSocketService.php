<?php

namespace App\Services;

/**
 * WH-034: WorkHub WebSocket event broadcasting.
 *
 * Broadcasts events to the channel `workhub.{tenant_id}.{user_id}` (private)
 * or `workhub.{tenant_id}` (tenant-wide).
 *
 * Driver resolution (in priority order):
 *   1. Pusher — if PUSHER_APP_ID + PUSHER_APP_KEY + PUSHER_APP_SECRET are set
 *   2. Soketi — if SOKETI_HOST is set (uses Pusher-compatible API)
 *   3. Database fallback — inserts into workhub_websocket_events for
 *      long-poll / SSE pickup; clients poll GET /workhub/events
 *
 * Event types:
 *   task.updated, task.assigned, task.completed
 *   timer.started, timer.stopped
 *   translation.ready
 *   inbox.message
 *
 * Payload shape (all events):
 *   { tenant_id, user_id?, event_type, data, timestamp }
 */
class WorkHubWebSocketService
{
    private const TENANT_CHANNEL_PREFIX = 'workhub';
    private const USER_CHANNEL_PREFIX   = 'private-workhub';

    /**
     * Broadcast to all workers in a tenant (public channel).
     *
     * @param int    $tenantId
     * @param string $eventType  e.g. 'task.updated'
     * @param array  $data       Event payload
     */
    public function broadcastToTenant(int $tenantId, string $eventType, array $data): void
    {
        $channel = self::TENANT_CHANNEL_PREFIX . ".{$tenantId}";
        $this->broadcast($channel, $eventType, $tenantId, null, $data);
    }

    /**
     * Broadcast to a specific user (private channel).
     *
     * @param int    $tenantId
     * @param int    $userId
     * @param string $eventType
     * @param array  $data
     */
    public function broadcastToUser(int $tenantId, int $userId, string $eventType, array $data): void
    {
        $channel = self::USER_CHANNEL_PREFIX . ".{$tenantId}.{$userId}";
        $this->broadcast($channel, $eventType, $tenantId, $userId, $data);
    }

    /**
     * Broadcast task lifecycle event to all tenant workers.
     */
    public function taskUpdated(int $tenantId, array $task): void
    {
        $this->broadcastToTenant($tenantId, 'task.updated', [
            'task_id' => $task['id'],
            'status'  => $task['status'],
            'title'   => $task['title'],
        ]);
    }

    /**
     * Broadcast task assigned event to the assigned worker.
     */
    public function taskAssigned(int $tenantId, int $workerUserId, array $task): void
    {
        $this->broadcastToUser($tenantId, $workerUserId, 'task.assigned', [
            'task_id'  => $task['id'],
            'title'    => $task['title'],
            'priority' => $task['priority'],
            'due_date' => $task['due_date'] ?? null,
        ]);
    }

    /**
     * Broadcast task completed (dual-signed) to planner/manager/finance.
     */
    public function taskCompleted(int $tenantId, array $task, int $completionId): void
    {
        $this->broadcastToTenant($tenantId, 'task.completed', [
            'task_id'       => $task['id'],
            'completion_id' => $completionId,
            'title'         => $task['title'],
        ]);
    }

    /**
     * Timer started — broadcast to manager channel for visibility.
     */
    public function timerStarted(int $tenantId, int $workerId, int $taskId): void
    {
        $this->broadcastToTenant($tenantId, 'timer.started', [
            'task_id'   => $taskId,
            'worker_id' => $workerId,
        ]);
    }

    /**
     * Timer stopped — broadcast to manager + finance.
     */
    public function timerStopped(int $tenantId, int $workerId, int $taskId, float $loggedHours): void
    {
        $this->broadcastToTenant($tenantId, 'timer.stopped', [
            'task_id'      => $taskId,
            'worker_id'    => $workerId,
            'logged_hours' => $loggedHours,
        ]);
    }

    /**
     * AI translation ready — notify the requesting user.
     */
    public function translationReady(int $tenantId, int $userId, string $targetLang): void
    {
        $this->broadcastToUser($tenantId, $userId, 'translation.ready', [
            'target_lang' => $targetLang,
        ]);
    }

    /**
     * New inbox message — notify the recipient user.
     */
    public function inboxMessage(int $tenantId, int $recipientUserId, array $message): void
    {
        $this->broadcastToUser($tenantId, $recipientUserId, 'inbox.message', [
            'id'          => $message['id'],
            'subject'     => $message['subject'],
            'body'        => mb_substr($message['body'], 0, 200),
            'sender_type' => $message['sender_type'] ?? 'system',
            'task_id'     => $message['task_id'] ?? null,
        ]);
    }

    // ---- Internal dispatch ----

    private function broadcast(
        string  $channel,
        string  $eventType,
        int     $tenantId,
        ?int    $userId,
        array   $data
    ): void {
        $payload = array_merge($data, [
            'tenant_id'  => $tenantId,
            'user_id'    => $userId,
            'event_type' => $eventType,
            'timestamp'  => date('c'),
        ]);

        if ($this->tryPusher($channel, $eventType, $payload)) return;
        $this->fallbackToDatabase($tenantId, $userId, $channel, $eventType, $payload);
    }

    private function tryPusher(string $channel, string $eventType, array $payload): bool
    {
        $appId  = env('PUSHER_APP_ID', env('SOKETI_APP_ID', ''));
        $key    = env('PUSHER_APP_KEY', env('SOKETI_APP_KEY', ''));
        $secret = env('PUSHER_APP_SECRET', env('SOKETI_APP_SECRET', ''));
        $host   = env('SOKETI_HOST', env('PUSHER_HOST', 'api.pusherapp.com'));
        $port   = (int) env('SOKETI_PORT', env('PUSHER_PORT', 443));
        $scheme = env('PUSHER_SCHEME', 'https');

        if (!$appId || !$key || !$secret) return false;

        if (!class_exists('\Pusher\Pusher')) {
            // Raw HTTP push (no SDK dependency)
            return $this->pushHttp($appId, $key, $secret, $host, $port, $scheme, $channel, $eventType, $payload);
        }

        try {
            $pusher = new \Pusher\Pusher($key, $secret, $appId, [
                'host'    => $host,
                'port'    => $port,
                'scheme'  => $scheme,
                'useTLS'  => $scheme === 'https',
            ]);
            $pusher->trigger($channel, $eventType, $payload);
            return true;
        } catch (\Throwable $e) {
            log_message('error', '[WorkHubWebSocketService::tryPusher] ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Raw Pusher/Soketi HTTP push without SDK.
     * Implements the Pusher REST API: POST /apps/{app_id}/events
     */
    private function pushHttp(
        string $appId, string $key, string $secret,
        string $host, int $port, string $scheme,
        string $channel, string $eventType, array $payload
    ): bool {
        try {
            $body       = json_encode(['name' => $eventType, 'channel' => $channel, 'data' => json_encode($payload)]);
            $ts         = time();
            $path       = "/apps/{$appId}/events";
            $queryStr   = "auth_key={$key}&auth_timestamp={$ts}&auth_version=1.0&body_md5=" . md5($body);
            $sigBase    = "POST\n{$path}\n{$queryStr}";
            $authSig    = hash_hmac('sha256', $sigBase, $secret);
            $url        = "{$scheme}://{$host}:{$port}{$path}?{$queryStr}&auth_signature={$authSig}";

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $body,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 3,
            ]);
            $result = curl_exec($ch);
            $code   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $code === 200;
        } catch (\Throwable $e) {
            log_message('error', '[WorkHubWebSocketService::pushHttp] ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Database fallback: store events for long-poll / SSE pickup.
     * Table: workhub_websocket_events (tenant_id, user_id, channel, event_type, payload, created_at)
     * Clients poll GET /api/workhub/events?since={ts} to consume.
     */
    private function fallbackToDatabase(
        int    $tenantId,
        ?int   $userId,
        string $channel,
        string $eventType,
        array  $payload
    ): void {
        try {
            $db = \Config\Database::connect();

            // Create table if it doesn't exist yet (safe in dev; use migration in prod)
            if (!$db->tableExists('workhub_websocket_events')) {
                $forge = \Config\Database::forge();
                $forge->addField([
                    'id'         => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
                    'tenant_id'  => ['type' => 'INT', 'unsigned' => true],
                    'user_id'    => ['type' => 'INT', 'unsigned' => true, 'null' => true],
                    'channel'    => ['type' => 'VARCHAR', 'constraint' => 100],
                    'event_type' => ['type' => 'VARCHAR', 'constraint' => 80],
                    'payload'    => ['type' => 'JSON', 'null' => true],
                    'created_at' => ['type' => 'DATETIME'],
                ]);
                $forge->addKey('id', true);
                $forge->addKey(['tenant_id', 'created_at']);
                $forge->createTable('workhub_websocket_events', true);
            }

            $db->table('workhub_websocket_events')->insert([
                'tenant_id'  => $tenantId,
                'user_id'    => $userId,
                'channel'    => $channel,
                'event_type' => $eventType,
                'payload'    => json_encode($payload),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Prune events older than 10 minutes to keep table small
            $db->table('workhub_websocket_events')
               ->where('created_at <', date('Y-m-d H:i:s', strtotime('-10 minutes')))
               ->where('tenant_id', $tenantId)
               ->delete();

        } catch (\Throwable $e) {
            log_message('error', '[WorkHubWebSocketService::fallbackToDatabase] ' . $e->getMessage());
        }
    }
}
