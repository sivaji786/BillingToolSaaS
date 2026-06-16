<?php

namespace App\Models;

use CodeIgniter\Model;

class CmsPageVersionModel extends Model
{
    protected $table      = 'cms_page_versions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'page_id', 'slug', 'lang', 'content', 'saved_by_label', 'saved_at',
    ];
    protected $useTimestamps = false;
}
