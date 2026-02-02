<?php

namespace App\Models;

use CodeIgniter\Model;

class PlatformCompanyDetailsModel extends Model
{
    protected $table            = 'platform_company_details';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'name',
        'vat_id',
        'street',
        'city',
        'postal_code',
        'country',
        'email',
        'phone',
        'bank_iban',
        'bank_bic',
        'bank_account_name',
        'updated_at'
    ];

    // Dates
    protected $useTimestamps = false;
}
