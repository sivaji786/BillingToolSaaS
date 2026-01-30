<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\CompanyProfileModel;
use CodeIgniter\API\ResponseTrait;

use App\Traits\AuditTrait;

class CompanyProfileController extends BaseController
{
    use ResponseTrait, AuditTrait;

    public function index()
    {
        try {
            $model = new CompanyProfileModel();
            $profiles = $model->findAll();
            
            $transformed = array_map([$this, 'transformProfile'], $profiles);
            
            return $this->response->setJSON($transformed)->setStatusCode(200);
        } catch (\Throwable $e) {
             return $this->failServerError('PROFILE LIST ERROR: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        }
    }

    public function update($id = null)
    {
        try {
            $model = new CompanyProfileModel();
            $data = $this->request->getJSON(true);
            
            log_message('error', 'PROFILE UPDATE DATA: ' . json_encode($data));
            
            $address = $data['address'] ?? [];
            $bankAccount = $data['bankAccount'] ?? [];

            // Map frontend data to database columns
            $dbData = [
                'name' => $data['name'] ?? null,
                'vat_id' => $data['vatId'] ?? null,
                'legal_organization_id' => $data['legalOrganizationId'] ?? null,
                'street' => $address['street'] ?? null,
                'city' => $address['city'] ?? null,
                'postal_code' => $address['postalCode'] ?? null,
                'country' => $address['country'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'website' => $data['website'] ?? null,
                'logo_url' => $data['logoUrl'] ?? null,
                'bank_iban' => $bankAccount['iban'] ?? null,
                'bank_bic' => $bankAccount['bic'] ?? null,
                'bank_account_name' => $bankAccount['accountName'] ?? null,
                'header_text' => $data['headerText'] ?? null,
                'footer_text' => $data['footerText'] ?? null,
                'company_type_id' => $data['companyTypeId'] ?? null,
            ];

            if ($model->update($id, $dbData)) {
                $this->logAction('updated', 'PROFILE', "Company profile updated: " . ($dbData['name'] ?? 'Unknown'));
                return $this->respond(['id' => $id, 'message' => 'Profile updated']);
            }
            
            log_message('error', 'UPDATE FAILED. Model Errors: ' . json_encode($model->errors()));
            log_message('error', 'Allowed Fields: ' . json_encode($model->allowedFields)); // Accessing protected property might fail if not getter
            
            return $this->fail($model->errors());
        } catch (\Throwable $e) {
            return $this->failServerError('PROFILE UPDATE ERROR: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        }
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
            'companyTypeId' => $profile['company_type_id'] ?? null,
        ];
    }
}
