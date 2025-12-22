<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\CompanyProfileModel;
use CodeIgniter\API\ResponseTrait;

class CompanyProfileController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        $model = new CompanyProfileModel();
        $profiles = $model->findAll();
        
        $transformed = array_map([$this, 'transformProfile'], $profiles);
        
        return $this->respond($transformed);
    }

    public function update($id = null)
    {
        $model = new CompanyProfileModel();
        $data = $this->request->getJSON(true);
        
        // Map frontend data to database columns
        $dbData = [
            'name' => $data['name'],
            'vat_id' => $data['vatId'],
            'legal_organization_id' => $data['legalOrganizationId'] ?? null,
            'street' => $data['address']['street'],
            'city' => $data['address']['city'],
            'postal_code' => $data['address']['postalCode'],
            'country' => $data['address']['country'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'website' => $data['website'] ?? null,
            'logo_url' => $data['logoUrl'] ?? null,
            'bank_iban' => $data['bankAccount']['iban'] ?? null,
            'bank_bic' => $data['bankAccount']['bic'] ?? null,
            'bank_account_name' => $data['bankAccount']['accountName'] ?? null,
            'header_text' => $data['headerText'] ?? null,
            'footer_text' => $data['footerText'] ?? null,
        ];

        if ($model->update($id, $dbData)) {
            return $this->respond(['id' => $id, 'message' => 'Profile updated']);
        }
        
        return $this->fail($model->errors());
    }

    private function transformProfile($profile)
    {
        return [
            'id' => $profile['id'],
            'name' => $profile['name'],
            'vatId' => $profile['vat_id'],
            'legalOrganizationId' => $profile['legal_organization_id'] ?? null,
            'address' => [
                'street' => $profile['street'] ?? '',
                'city' => $profile['city'] ?? '',
                'postalCode' => $profile['postal_code'] ?? '',
                'country' => $profile['country'] ?? '',
            ],
            'email' => $profile['email'] ?? '',
            'phone' => $profile['phone'] ?? '',
            'website' => $profile['website'] ?? null,
            'logoUrl' => $profile['logo_url'] ?? null,
            'bankAccount' => [
                'iban' => $profile['bank_iban'] ?? null,
                'bic' => $profile['bank_bic'] ?? null,
                'accountName' => $profile['bank_account_name'] ?? null,
            ],
            'headerText' => $profile['header_text'] ?? null,
            'footerText' => $profile['footer_text'] ?? null,
        ];
    }
}
