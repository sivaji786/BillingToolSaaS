<?php

namespace App\Models;

use App\Models\BaseModel;

class CompanyProfileModel extends BaseModel
{
    use \App\Traits\TenantScope;

    protected $table            = 'company_profiles';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'tenant_id',
        'name',
        'vat_id',
        'legal_organization_id',
        'street',
        'city',
        'postal_code',
        'country',
        'email',
        'phone',
        'website',
        'bank_iban',
        'bank_bic',
        'bank_account_name',
        'logo_url',
        'signature_url',
        'header_text',
        'footer_text',
        'company_type_id',
        'default_template_id',
        'invoice_number_format',
        'default_currency',
        'default_tax_rate',
        'payment_terms_days'
    ];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = false;
}
