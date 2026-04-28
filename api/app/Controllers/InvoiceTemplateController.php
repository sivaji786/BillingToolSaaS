<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\InvoiceTemplateModel;
use CodeIgniter\API\ResponseTrait;

class InvoiceTemplateController extends BaseController
{
    use ResponseTrait;

    public function index()
    {
        try {
            $model = new InvoiceTemplateModel();
            $templates = $model->findAll();
            
            $transformed = array_map([$this, 'transformTemplate'], $templates);
            
            return $this->response->setJSON($transformed)->setStatusCode(200);
        } catch (\Throwable $e) {
            return $this->failServerError('TEMPLATE LIST ERROR: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        }
    }

    public function show($id = null)
    {
        $model = new InvoiceTemplateModel();
        $template = $model->find($id);
        
        if (!$template) {
            return $this->failNotFound('Template not found');
        }
        
        return $this->response->setJSON($this->transformTemplate($template))->setStatusCode(200);
    }

    public function create()
    {
        $model = new InvoiceTemplateModel();
        $data = $this->request->getJSON(true);
        
        $dbData = $this->mapTemplateData($data);
        
        if ($model->insert($dbData)) {
            return $this->respondCreated(['id' => $model->getInsertID(), 'message' => 'Template created']);
        }
        
        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new InvoiceTemplateModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('Template not found');
        }
        
        $data = $this->request->getJSON(true);
        $dbData = $this->mapTemplateData($data);
        
        if ($model->update($id, $dbData)) {
            return $this->respond(['id' => $id, 'message' => 'Template updated']);
        }
        
        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new InvoiceTemplateModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('Template not found');
        }
        
        if ($model->delete($id)) {
            return $this->respondDeleted(['id' => $id, 'message' => 'Template deleted']);
        }
        
        return $this->fail($model->errors());
    }

    private function mapTemplateData($data)
    {
        return [
            'name' => $data['name'],
            'template_type' => $data['templateType'] ?? 'invoice',
            'description' => $data['description'] ?? null,
            'seller_json' => json_encode($data['seller']),
            'default_currency' => $data['defaultCurrency'],
            'default_tax_category' => $data['defaultTaxCategory'],
            'default_tax_percent' => $data['defaultTaxPercent'],
            'default_payment_terms_json' => json_encode($data['defaultPaymentTerms'] ?? null),
            'logo_url' => $data['logoUrl'] ?? null,
            'header_text' => $data['headerText'] ?? null,
            'footer_text' => $data['footerText'] ?? null,
            'layout_json' => isset($data['layout']) ? json_encode($data['layout']) : null,
        ];
    }

    private function transformTemplate($template)
    {
        return [
            'id' => $template['id'],
            'name' => $template['name'],
            'templateType' => $template['template_type'] ?? 'invoice',
            'description' => $template['description'],
            'seller' => json_decode($template['seller_json'] ?? '{}', true) ?: [],
            'defaultCurrency' => $template['default_currency'],
            'defaultTaxCategory' => $template['default_tax_category'],
            'defaultTaxPercent' => (float)$template['default_tax_percent'],
            'defaultPaymentTerms' => json_decode($template['default_payment_terms_json'] ?? '{}', true) ?: [],
            'logoUrl' => $template['logo_url'],
            'headerText' => $template['header_text'],
            'footerText' => $template['footer_text'],
            'layout' => json_decode($template['layout_json'] ?? '{}', true) ?: [],
        ];
    }
}
