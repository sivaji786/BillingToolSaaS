<?php

namespace App\Controllers\WorkHub;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;
use App\Models\WorkhubInboxMessageModel;
use App\Services\WorkHubWebSocketService;

/**
 * WH-035: Inbox messaging endpoints.
 *
 * GET    /workhub/inbox/messages           — list messages for current user (unread first)
 * POST   /workhub/inbox/messages           — create message, broadcasts via WebSocket
 * PUT    /workhub/inbox/messages/{id}/read — mark single message read
 * PUT    /workhub/inbox/messages/mark-all-read — mark all messages read for current user
 * GET    /workhub/inbox/unread-count       — returns { "count": N }
 *
 * sender_type: planner | client | system
 */
class InboxController extends BaseController
{
    use ResponseTrait, AuditTrait;

    protected int $tenantId = 0;
    protected int $userId   = 0;

    private function boot(): void
    {
        $tenant         = config('App')->currentTenant ?? null;
        $this->tenantId = (int) ($tenant->id ?? 0);
        $this->userId   = (int) ($this->request->userId ?? session()->get('userId') ?? 0);
    }

    // GET /workhub/inbox/messages
    public function index(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model    = new WorkhubInboxMessageModel();
        // ISNULL() avoids CI4 backtick-escaping `read_at IS NULL` as a column name
        $messages = $model->where('tenant_id', $this->tenantId)
                          ->where('recipient_user_id', $this->userId)
                          ->orderBy('ISNULL(read_at)', 'DESC')
                          ->orderBy('created_at', 'DESC')
                          ->findAll();

        $db = \Config\Database::connect();
        foreach ($messages as &$msg) {
            $msg['is_read'] = $msg['read_at'] !== null;

            $sender = null;
            if (!empty($msg['sender_id'])) {
                $sender = $db->table('users')
                    ->select('name')
                    ->where('id', $msg['sender_id'])
                    ->get()->getRow();
            }
            $msg['sender_name'] = $sender ? $sender->name : ucfirst($msg['sender_type'] ?? 'System');

            if (!empty($msg['task_id'])) {
                $task = $db->table('workhub_tasks')
                    ->select('title')
                    ->where('id', $msg['task_id'])
                    ->where('tenant_id', $this->tenantId)
                    ->get()->getRow();
                $msg['task_title'] = $task ? $task->title : null;
            }
        }
        unset($msg);

        return $this->respond(['data' => $messages]);
    }

    // POST /workhub/inbox/messages
    public function create(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $data = $this->request->getJSON(true) ?? [];

        $recipientUserId = (int) ($data['recipient_user_id'] ?? 0);
        $subject         = trim($data['subject'] ?? '');
        $body            = trim($data['body'] ?? '');
        $senderType      = $data['sender_type'] ?? 'system';
        $taskId          = isset($data['task_id']) ? (int) $data['task_id'] : null;

        if ($recipientUserId <= 0) {
            return $this->fail('recipient_user_id is required.', 422);
        }

        if (strlen($subject) < 1) {
            return $this->fail('subject is required.', 422);
        }

        if (strlen($body) < 1) {
            return $this->fail('body is required.', 422);
        }

        $validSenderTypes = ['planner', 'client', 'system'];
        if (!in_array($senderType, $validSenderTypes, true)) {
            return $this->fail('sender_type must be one of: ' . implode(', ', $validSenderTypes), 422);
        }

        $insert = [
            'tenant_id'         => $this->tenantId,
            'recipient_user_id' => $recipientUserId,
            'sender_id'         => $this->userId ?: null,
            'sender_type'       => $senderType,
            'subject'           => $subject,
            'body'              => $body,
            'task_id'           => $taskId,
            'created_at'        => date('Y-m-d H:i:s'),
        ];

        $model = new WorkhubInboxMessageModel();
        $id    = $model->insert($insert, true);

        if (!$id) {
            $errs = $model->errors();
            return $this->fail($errs ?: 'Failed to create message.', 422);
        }

        $message = $model->find($id);

        // Broadcast to recipient
        $ws = new WorkHubWebSocketService();
        $ws->inboxMessage($this->tenantId, $recipientUserId, [
            'id'          => $id,
            'subject'     => $subject,
            'body'        => $body,
            'sender_type' => $senderType,
            'task_id'     => $taskId,
        ]);

        $this->logWorkhubEvent(
            'workhub.inbox.message.created',
            (int) ($taskId ?? 0),
            [],
            ['recipient_user_id' => $recipientUserId, 'subject' => $subject],
            "Inbox message sent: {$subject}"
        );

        return $this->respondCreated(['data' => $message]);
    }

    // PUT /workhub/inbox/messages/{id}/read
    public function markRead(int $id): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model   = new WorkhubInboxMessageModel();
        $message = $model->where('tenant_id', $this->tenantId)
                         ->where('recipient_user_id', $this->userId)
                         ->find($id);

        if (!$message) {
            return $this->failNotFound('Message not found.');
        }

        if ($message['read_at'] !== null) {
            return $this->respond(['message' => 'Already read.', 'data' => $message]);
        }

        $model->markRead($id, $this->userId);

        return $this->respond(['message' => 'Message marked as read.']);
    }

    // PUT /workhub/inbox/messages/mark-all-read
    public function markAllRead(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model = new WorkhubInboxMessageModel();
        $model->markAllRead($this->tenantId, $this->userId);

        return $this->respond(['message' => 'All messages marked as read.']);
    }

    // GET /workhub/inbox/unread-count
    public function unreadCount(): \CodeIgniter\HTTP\ResponseInterface
    {
        $this->boot();

        $model = new WorkhubInboxMessageModel();
        $count = $model->getUnreadCount($this->tenantId, $this->userId);

        return $this->respond(['count' => (int) $count]);
    }
}
