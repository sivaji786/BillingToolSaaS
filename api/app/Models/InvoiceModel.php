<?php

namespace App\Models;

use App\Models\BaseModel;

class InvoiceModel extends BaseModel
{
    protected $table            = 'invoices';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'tenant_id', 'template_type', 'template_id', 'invoice_number', 'issue_date', 'due_date', 'invoice_type_code', 'currency', 'status',
        'seller_name', 'seller_vat_id', 'seller_address_json', 'seller_contact_json',
        'buyer_name', 'buyer_vat_id', 'buyer_address_json', 'buyer_contact_json',
        'line_extension_amount', 'tax_exclusive_amount', 'tax_inclusive_amount', 'payable_amount',
        'payment_terms_json', 'payment_means_json', 'note', 'body', 'salutation', 'closing',
        'signed', 'signature_date', 'share_token', 'created_by',
        'source', 'source_ref_id'
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
