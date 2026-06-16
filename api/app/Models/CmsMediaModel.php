<?php

namespace App\Models;

use CodeIgniter\Model;

class CmsMediaModel extends Model
{
    protected $table      = 'cms_media';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'filename', 'url', 'alt_text', 'width', 'height', 'file_size',
        'uploaded_by_label', 'created_at',
    ];
    protected $useTimestamps = false;
}
