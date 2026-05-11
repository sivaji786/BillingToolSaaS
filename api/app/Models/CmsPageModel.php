<?php

namespace App\Models;

use CodeIgniter\Model;

class CmsPageModel extends Model
{
    protected $table            = 'cms_pages';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'slug',
        'lang',
        'title',
        'content',
        'meta_description',
        'updated_at',
        'show_in_nav',
        'nav_label',
        'nav_order',
        'page_template',
        'is_published',
    ];

    // Dates
    protected $useTimestamps = false; // We manage updated_at manually to keep it simple with JSON
}
