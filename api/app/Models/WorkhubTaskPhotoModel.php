<?php

namespace App\Models;

class WorkhubTaskPhotoModel extends BaseModel
{
    protected $table      = 'workhub_task_photos';
    protected $primaryKey = 'id';

    protected $returnType     = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields  = true;

    protected $allowedFields = [
        'tenant_id', 'task_id', 'completion_record_id', 'uploaded_by',
        'photo_type', 'storage_path', 'original_filename', 'mime_type', 'size_bytes',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = '';   // '' = disabled; false casts to int key 0 in CI4 setUpdatedField()

    protected $validationRules = [
        'task_id'      => 'required|integer',
        'storage_path' => 'required|max_length[500]',
        'photo_type'   => 'permit_empty|in_list[jobsite,identity]',
        'mime_type'    => 'permit_empty|in_list[image/jpeg,image/png,image/heic,image/webp]',
    ];

    public function getForTask(int $taskId, string $photoType = null): array
    {
        $q = $this->where('task_id', $taskId);
        if ($photoType !== null) {
            $q->where('photo_type', $photoType);
        }
        return $q->orderBy('created_at', 'ASC')->findAll();
    }
}
