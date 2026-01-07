<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CompanyProfileModel;
use GeminiAPI\Client;
use GeminiAPI\Resources\Parts\TextPart;

class AIInvoiceController extends BaseController
{
    use ResponseTrait;

    /**
     * Parse natural language prompt and generate invoice data
     * POST /api/ai/parse-invoice
     */
    public function parseInvoice()
    {
        $data = $this->request->getJSON(true);
        
        // Accept pre-parsed invoice data from client
        if (isset($data['parsedInvoice']) && is_array($data['parsedInvoice'])) {
             $parsedData = $data['parsedInvoice'];
        } else {
             return $this->fail('Backend AI processing is disabled. Please provide parsedInvoice data from client.', 400);
        }

        // Fetch Default Seller from Company Profile
        $profileModel = new CompanyProfileModel();
        $companyProfile = $profileModel->first();
        $defaultSeller = null;

        if ($companyProfile) {
            $defaultSeller = [
                'name' => $companyProfile['name'] ?? '',
                'address' => [
                    'street' => $companyProfile['street'] ?? '',
                    'city' => $companyProfile['city'] ?? '',
                    'postalCode' => $companyProfile['postal_code'] ?? '',
                    'country' => $companyProfile['country'] ?? 'IN'
                ],
                'contactEmail' => $companyProfile['email'] ?? '',
                'contactPhone' => $companyProfile['phone'] ?? ''
            ];
        }

        // Apply default seller if missing (works for both AI and regex results)
        if ((empty($parsedData['seller']['name']) || $parsedData['seller']['name'] === 'string') && $defaultSeller) {
             $parsedData['seller'] = $defaultSeller;
        }

        // Ensure totals are calculated correctly using our logic
        $parsedData = $this->calculateInvoiceTotals($parsedData);
        
        // Basic validation of AI output
        $validation = $this->validateParsedInvoice($parsedData);
        
        return $this->respond([
            'success' => true,
            'invoice' => $parsedData,
            'confidence' => 95, 
            'suggestions' => $validation['suggestions'],
            'errors' => $validation['errors']
        ]);
    }

    /**
     * Calculate invoice totals
     */
    private function calculateInvoiceTotals($invoice)
    {
        $lineExtensionAmount = 0;
        $taxTotals = [];

        foreach ($invoice['lines'] as &$line) {
            $lineAmount = $line['quantity'] * $line['unitPrice'];
            $line['lineExtensionAmount'] = $lineAmount;
            
            $taxAmount = $lineAmount * ($line['taxPercent'] / 100);
            $line['taxAmount'] = $taxAmount;
            $line['grossAmount'] = $lineAmount + $taxAmount;
            
            $lineExtensionAmount += $lineAmount;
            
            // Aggregate tax totals
            $taxKey = $line['taxPercent'];
            if (!isset($taxTotals[$taxKey])) {
                $taxTotals[$taxKey] = [
                    'taxType' => 'VAT',
                    'taxableAmount' => 0,
                    'taxAmount' => 0,
                    'taxPercent' => $line['taxPercent'],
                    'taxCategory' => $line['taxCategory']
                ];
            }
            $taxTotals[$taxKey]['taxableAmount'] += $lineAmount;
            $taxTotals[$taxKey]['taxAmount'] += $taxAmount;
        }

        $invoice['lineExtensionAmount'] = $lineExtensionAmount;
        $invoice['taxExclusiveAmount'] = $lineExtensionAmount;
        
        $totalTaxAmount = array_sum(array_column($taxTotals, 'taxAmount'));
        $invoice['taxInclusiveAmount'] = $lineExtensionAmount + $totalTaxAmount;
        $invoice['payableAmount'] = $invoice['taxInclusiveAmount'];
        $invoice['taxTotals'] = array_values($taxTotals);

        return $invoice;
    }

    /**
     * Validate parsed invoice data
     */
    private function validateParsedInvoice($invoice)
    {
        $errors = [];
        $suggestions = [];
        $confidence = 100;

        // Check buyer information
        if (empty($invoice['buyer']['name'])) {
            $errors[] = 'Buyer/Customer name not found in prompt';
            $suggestions[] = 'Please specify the customer company name';
            $confidence -= 20;
        }

        if (empty($invoice['buyer']['address']['city'])) {
            $suggestions[] = 'Consider adding customer city';
            $confidence -= 5;
        }

        if (empty($invoice['buyer']['address']['postalCode'])) {
            $suggestions[] = 'Consider adding customer postal code';
            $confidence -= 5;
        }

        // Check line items
        if (empty($invoice['lines'])) {
            $errors[] = 'No line items found in prompt';
            $suggestions[] = 'Please specify items with quantity and price';
            $confidence -= 30;
        }

        foreach ($invoice['lines'] as $line) {
            if (empty($line['description'])) {
                $errors[] = 'Line item missing description';
                $confidence -= 10;
            }
            if ($line['quantity'] <= 0) {
                $errors[] = 'Line item has invalid quantity';
                $confidence -= 10;
            }
            if ($line['unitPrice'] <= 0) {
                $errors[] = 'Line item has invalid price';
                $confidence -= 10;
            }
        }

        return [
            'confidence' => max(0, $confidence),
            'errors' => $errors,
            'suggestions' => $suggestions
        ];
    }
}
