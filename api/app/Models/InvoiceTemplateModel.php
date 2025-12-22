<?php

namespace App\Models;

use CodeIgniter\Model;

class InvoiceTemplateModel extends Model
{
    protected $table            = 'invoice_templates';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'name',
        'description',
        'seller_json',
        'default_currency',
        'default_tax_category',
        'default_tax_percent',
        'default_payment_terms_json',
        'logo_url',
        'header_text',
        'footer_text'
    ];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = false;
}
