<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Models\CompanyProfileModel;

class AIInvoiceController extends BaseController
{
    use ResponseTrait;

    /**
     * Parse natural language prompt and generate invoice data
     * POST /api/ai/parse-invoice
     */
    /**
     * Parse natural language prompt and generate invoice data
     * POST /api/ai/parse-invoice
     */
    public function parseInvoice()
    {
        $data = $this->request->getJSON(true);
        $prompt = $data['prompt'] ?? null;
        $context = $data['context'] ?? 'create';
        $language = $data['language'] ?? 'en';
        $existingInvoice = $data['existingInvoice'] ?? null;
        
        // If pre-parsed data is provided (legacy support), use it. 
        // Otherwise, call Gemini API from backend.
        if (isset($data['parsedInvoice']) && is_array($data['parsedInvoice'])) {
             $parsedData = $data['parsedInvoice'];
        } elseif ($prompt) {
             try {
                 $parsedData = $this->callGeminiAPI($prompt, $context, $existingInvoice, $language);
             } catch (\Exception $e) {
                 return $this->fail('AI Processing Error: ' . $e->getMessage(), 500);
             }
        } else {
             return $this->fail('Please provide either a "prompt" or "parsedInvoice" data.', 400);
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

        // Apply default seller if missing
        if ((empty($parsedData['seller']['name']) || $parsedData['seller']['name'] === 'string') && $defaultSeller) {
             $parsedData['seller'] = $defaultSeller;
        }

        // Ensure totals are calculated correctly using our logic
        $parsedData = $this->calculateInvoiceTotals($parsedData);
        
        // Basic validation of AI output
        $validation = $this->validateParsedInvoice($parsedData);
        
        return $this->response->setJSON([
            'success' => true,
            'invoice' => $parsedData,
            'confidence' => 95, 
            'suggestions' => $validation['suggestions'],
            'errors' => $validation['errors']
        ])->setStatusCode(200);
    }

    /**
     * Call Gemini API to parse natural language prompt
     */
    private function callGeminiAPI($prompt, $context, $existingInvoice, $language)
    {
        // USER REQUESTED: Maintain key in api/.env file
        $apiKey = env('GEMINI_API_KEY'); 
        
        if (empty($apiKey) || $apiKey === 'YOUR_GEMINI_API_KEY') {
            throw new \Exception("Backend Gemini API Key not configured in .env file.");
        }

        $currentDate = date('Y-m-d');
        $contextPrompt = "";
        
        if ($context === 'edit' && $existingInvoice) {
            $contextPrompt = "
            You are in EDIT mode for an existing invoice. 
            Existing Invoice Data: " . json_encode($existingInvoice) . "
            
            Your task is to update the fields in this JSON based on the user's instructions. 
            - If the user specifies changes to buyer, seller, or dates, update those fields.
            - If the user specifies adding, removing, or changing line items, update the 'lines' array.
            - Preserve all fields that are not explicitly mentioned for change.
            - Ensure totals are NOT required in your output as they are calculated by the backend.
            ";
        } else {
            $contextPrompt = "
            You are in CREATE mode for a new invoice.
            Extract invoice data from the user natural language prompt.
            ";
        }

        $systemPrompt = "
            You are an AI invoice assistant involved in a Billing Application. Your task is to extract or update invoice data into a structured JSON format.
            
            Current Date: $currentDate
            Context: $context
            LANGUAGE: $language
            $contextPrompt
            
            Output MUST be a valid JSON object matching this structure:
            {
                \"invoiceNumber\": \"string\",
                \"issueDate\": \"YYYY-MM-DD\",
                \"dueDate\": \"YYYY-MM-DD or null\",
                \"currency\": \"EUR\",
                \"status\": \"draft\",
                \"seller\": {
                    \"name\": \"string\",
                    \"address\": { \"street\": \"string\", \"city\": \"string\", \"postalCode\": \"string\", \"country\": \"ISO-2 codes like DE, AR, IN\" },
                    \"contactEmail\": \"string\", \"contactPhone\": \"string\"
                },
                \"buyer\": {
                    \"name\": \"string\",
                    \"address\": { \"street\": \"string\", \"city\": \"string\", \"postalCode\": \"string\", \"country\": \"ISO-2 codes like DE, AR, IN\" },
                    \"contactEmail\": \"string\", \"contactPhone\": \"string\"
                },
                \"lines\": [
                    {
                        \"id\": \"string (generate unique)\",
                        \"description\": \"string (Extract in user language: $language)\",
                        \"quantity\": number,
                        \"unitCode\": \"string (Use UN/ECE codes: 'XPK' for bags, 'EA' for items, 'KGM' for kg, 'LTR' for liters, 'MTR' for meters)\",
                        \"unitPrice\": number,
                        \"taxPercent\": number,
                        \"taxCategory\": \"S\"
                    }
                ],
                \"note\": \"string (Extract in user language: $language)\"
            }
            
            IMPORTANT RULES:
            1. Always return VALID JSON.
            2. Extracted money values should be numbers.
            3. Tax Category 'S' stands for Standard rate.
            4. If in EDIT mode, merge the changes into the provided JSON structure.
            5. Use user's language ($language) for descriptions and notes, but JSON keys remain in English.
        ";

        $client = \Config\Services::curlrequest();
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

        try {
            $response = $client->post($url, [
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $systemPrompt . "\n\nUser Input: " . $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'response_mime_type' => 'application/json',
                    ]
                ],
                'http_errors' => false // Prevent auto-throwing so we can check status
            ]);

            $statusCode = $response->getStatusCode();
            
            if ($statusCode === 429) {
                throw new \Exception("Rate limit exceeded (429). If you are using a free tier Gemini key, please wait a minute before trying again.");
            }
            
            if ($statusCode !== 200) {
                $errorBody = json_decode($response->getBody(), true);
                $errorMessage = $errorBody['error']['message'] ?? 'Unknown API error';
                throw new \Exception("Gemini API Error ($statusCode): " . $errorMessage);
            }

            $body = json_decode($response->getBody(), true);
            
            if (isset($body['candidates'][0]['content']['parts'][0]['text'])) {
                return json_decode($body['candidates'][0]['content']['parts'][0]['text'], true);
            }
        } catch (\Exception $e) {
            throw $e;
        }

        throw new \Exception("Failed to get valid response from Gemini API.");
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
