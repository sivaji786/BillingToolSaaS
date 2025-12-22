<?php

namespace App\Models;

use CodeIgniter\Model;

class InvoiceLineModel extends Model
{
    protected $table            = 'invoice_lines';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'invoice_id', 'description', 'quantity', 'unit_code', 'unit_price',
        'tax_category', 'tax_percent', 'line_extension_amount'
    ];
}
