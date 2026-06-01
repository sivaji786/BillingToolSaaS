<?php

namespace App\Models;

// §257 HGB / §147 AO: 10-year retention for billable completion records.
// DELETE blocked by WorkhubRetentionCommand for records < 10 years old.
class WorkhubCompletionRecordModel extends BaseModel
{
    protected $table      = 'workhub_completion_records';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'task_id',
        'completion_note', 'completion_note_original', 'materials_json',
        'worker_signature_data', 'worker_signed_at',
        'customer_signature_data', 'customer_name', 'customer_signed_at',
        'signed_ip', 'signed_user_agent', 'consent_text_version',
        'gdpr_consent_given', 'gdpr_consent_at',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'task_id'           => 'required|integer',
        'completion_note'   => 'permit_empty|min_length[20]|max_length[2000]',
        'gdpr_consent_given' => 'permit_empty|in_list[0,1]',
    ];

    public function getByTask(int $taskId): ?array
    {
        return $this->where('task_id', $taskId)->first();
    }

    /**
     * Whether both worker and customer have signed (dual-confirmation model).
     */
    public function isDualSigned(array $record): bool
    {
        return !empty($record['worker_signature_data'])
            && !empty($record['customer_signature_data']);
    }
}
