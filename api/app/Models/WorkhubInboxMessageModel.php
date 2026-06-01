<?php

namespace App\Models;

class WorkhubInboxMessageModel extends BaseModel
{
    protected $table      = 'workhub_inbox_messages';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'recipient_user_id', 'task_id',
        'sender_type', 'sender_id', 'subject', 'body', 'read_at',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = '';   // '' = disabled; false casts to int key 0 in CI4 setUpdatedField()

    protected $validationRules = [
        'recipient_user_id' => 'required|integer',
        'subject'           => 'required|min_length[1]|max_length[255]',
        'body'              => 'required|min_length[1]',
        'sender_type'       => 'permit_empty|in_list[planner,client,system]',
    ];

    public function getUnreadCount(int $tenantId, int $userId): int
    {
        return $this->where('tenant_id', $tenantId)
            ->where('recipient_user_id', $userId)
            ->where('read_at IS NULL', null, false)
            ->countAllResults();
    }

    public function markRead(int $id, int $userId): bool
    {
        return $this->where('id', $id)
            ->where('recipient_user_id', $userId)
            ->set('read_at', date('Y-m-d H:i:s'))
            ->update();
    }

    public function markAllRead(int $tenantId, int $userId): bool
    {
        return $this->where('tenant_id', $tenantId)
            ->where('recipient_user_id', $userId)
            ->where('read_at IS NULL', null, false)
            ->set('read_at', date('Y-m-d H:i:s'))
            ->update();
    }
}
