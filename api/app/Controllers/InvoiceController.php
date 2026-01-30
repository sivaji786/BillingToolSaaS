<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\InvoiceModel;
use App\Models\InvoiceLineModel;
use CodeIgniter\API\ResponseTrait;

use App\Traits\AuditTrait;

class InvoiceController extends BaseController
{
    use ResponseTrait, AuditTrait;

    public function index()
    {
        try {
            $model = new InvoiceModel();
            
            // Filtering
            $search = $this->request->getGet('search');
            if ($search) {
                $model->groupStart()
                    ->like('invoice_number', $search)
                    ->orLike('buyer_name', $search)
                    ->orLike('seller_name', $search)
                    ->groupEnd();
            }

            $status = $this->request->getGet('status');
            if ($status && $status !== 'all') {
                $model->where('status', $status);
            }

            $dateFilter = $this->request->getGet('dateFilter');
            if ($dateFilter && $dateFilter !== 'anyDate') {
                $now = date('Y-m-d');
                switch ($dateFilter) {
                    case 'last7Days':
                        $model->where('issue_date >=', date('Y-m-d', strtotime('-7 days')));
                        break;
                    case 'last30Days':
                        $model->where('issue_date >=', date('Y-m-d', strtotime('-30 days')));
                        break;
                    case 'last90Days':
                        $model->where('issue_date >=', date('Y-m-d', strtotime('-90 days')));
                        break;
                    case 'thisMonth':
                        $model->where('issue_date >=', date('Y-m-01'));
                        $model->where('issue_date <=', date('Y-m-t'));
                        break;
                    case 'lastMonth':
                        $model->where('issue_date >=', date('Y-m-01', strtotime('first day of last month')));
                        $model->where('issue_date <=', date('Y-m-t', strtotime('last day of last month')));
                        break;
                    case 'thisYear':
                        $model->where('issue_date >=', date('Y-01-01'));
                        $model->where('issue_date <=', date('Y-12-31'));
                        break;
                }
            }

            // Sorting
            $sort = $this->request->getGet('sort') ?? 'dateDesc';
            switch ($sort) {
                case 'dateDesc':
                    $model->orderBy('issue_date', 'DESC');
                    break;
                case 'dateAsc':
                    $model->orderBy('issue_date', 'ASC');
                    break;
                case 'amountDesc':
                    $model->orderBy('payable_amount', 'DESC');
                    break;
                case 'amountAsc':
                    $model->orderBy('payable_amount', 'ASC');
                    break;
                case 'numberDesc':
                    $model->orderBy('invoice_number', 'DESC');
                    break;
                case 'numberAsc':
                    $model->orderBy('invoice_number', 'ASC');
                    break;
                default:
                    $model->orderBy('issue_date', 'DESC');
            }

            $invoices = $model->findAll();
            
            $transformed = array_map([$this, 'transformInvoice'], $invoices);
            
            return $this->response->setJSON($transformed)->setStatusCode(200);
        } catch (\Throwable $e) {
            return $this->failServerError('INVOICE LIST ERROR: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        }
    }

    public function show($id = null)
    {
        $model = new InvoiceModel();
        $invoice = $model->find($id);
        
        if (!$invoice) {
            return $this->failNotFound('Invoice not found');
        }
        
        $transformed = $this->transformInvoice($invoice);
        
        // Fetch lines
        $lineModel = new \App\Models\InvoiceLineModel();
        $lines = $lineModel->where('invoice_id', $id)->findAll();
        
        // Transform lines
        $transformed['lines'] = array_map([$this, 'transformLine'], $lines);
        
        return $this->respond($transformed);
    }

    private function transformLine($line)
    {
        return [
            'id' => $line['id'],
            'invoiceId' => $line['invoice_id'],
            'description' => $line['description'],
            'quantity' => (float)$line['quantity'],
            'unitCode' => $line['unit_code'],
            'unitPrice' => (float)$line['unit_price'],
            'taxCategory' => $line['tax_category'],
            'taxPercent' => (float)$line['tax_percent'],
            'lineExtensionAmount' => (float)$line['line_extension_amount'],
        ];
    }

    private function transformInvoice($invoice)
    {
        // Robust decoding: if decode returns null (invalid/empty), default to empty array
        $sellerContact = json_decode($invoice['seller_contact_json'] ?? '{}', true) ?: [];
        $buyerContact = json_decode($invoice['buyer_contact_json'] ?? '{}', true) ?: [];

        return [
            'id' => $invoice['id'],
            'invoiceNumber' => $invoice['invoice_number'],
            'issueDate' => $invoice['issue_date'],
            'dueDate' => $invoice['due_date'],
            'currency' => $invoice['currency'],
            'status' => $invoice['status'],
            'payableAmount' => (float)$invoice['payable_amount'],
            'seller' => [
                'name' => $invoice['seller_name'],
                'vatId' => $invoice['seller_vat_id'],
                'address' => json_decode($invoice['seller_address_json'] ?? '{}', true),
                'contactEmail' => $sellerContact['email'] ?? null,
                'contactPhone' => $sellerContact['phone'] ?? null,
            ],
            'buyer' => [
                'name' => $invoice['buyer_name'],
                'vatId' => $invoice['buyer_vat_id'],
                'address' => json_decode($invoice['buyer_address_json'] ?? '{}', true),
                'contactEmail' => $buyerContact['email'] ?? null,
                'contactPhone' => $buyerContact['phone'] ?? null,
            ],
            'lines' => [], // Default empty lines for list view
            'taxTotals' => [], // Placeholder
            'lineExtensionAmount' => 0, // Placeholder
            'taxExclusiveAmount' => 0, // Placeholder
            'taxInclusiveAmount' => 0, // Placeholder
        ];
    }

    public function create()
    {
        $model = new InvoiceModel();
        $lineModel = new InvoiceLineModel();
        
        $data = $this->request->getJSON(true);
        
        // Map frontend data to database columns
        $dbData = $this->mapInvoiceData($data);
        
        // Get Authenticated User ID (from Session or JWT)
        $userId = session()->get('userId');
        if (!$userId) {
             // Try JWT if session empty
             $authHeader = $this->request->getHeaderLine('Authorization');
             if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                 $key = getenv('JWT_SECRET') ?: 'billing_tool_secret_key';
                 try {
                     $decoded = \Firebase\JWT\JWT::decode($matches[1], new \Firebase\JWT\Key($key, 'HS256'));
                     $userId = $decoded->uid ?? $decoded->user_id;
                 } catch (\Exception $e) {}
             }
        }
        
        $dbData['created_by'] = $userId ?: 1; // Fallback to 1 if not found (should be caught by RBAC filter anyway)
        
        if ($model->insert($dbData)) {
            $invoiceId = $model->getInsertID();
            
            // Insert lines
            if (!empty($data['lines'])) {
                foreach ($data['lines'] as $line) {
                    $lineData = $this->mapLineData($line, $invoiceId);
                    $lineModel->insert($lineData);
                }
            }
            
            $this->logAction('created', $dbData['invoice_number'], "Invoice created for {$dbData['buyer_name']}");
            return $this->respondCreated(['id' => $invoiceId, 'message' => 'Invoice created']);
        }
        
        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new InvoiceModel();
        $lineModel = new InvoiceLineModel();
        
        $data = $this->request->getJSON(true);
        
        // Check if invoice exists
        if (!$model->find($id)) {
            return $this->failNotFound('Invoice not found');
        }
        
        // Map frontend data to database columns
        $dbData = $this->mapInvoiceData($data);
        
        if ($model->update($id, $dbData)) {
            // Update lines: Delete existing and insert new ones
            // This is a simple strategy; for more complex scenarios, diffing might be better
            $lineModel->where('invoice_id', $id)->delete();
            
            if (!empty($data['lines'])) {
                foreach ($data['lines'] as $line) {
                    $lineData = $this->mapLineData($line, $id);
                    $lineModel->insert($lineData);
                }
            }
            
            $action = 'updated';
            if ($dbData['status'] === 'validated') $action = 'validated';
            if ($dbData['status'] === 'sent') $action = 'sent';
            if ($dbData['signed']) $action = 'signed';

            $this->logAction($action, $dbData['invoice_number'], "Invoice {$action}. Status: {$dbData['status']}", (bool)($dbData['signed'] ?? false));
            return $this->respond(['id' => $id, 'message' => 'Invoice updated']);
        }
        
        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new InvoiceModel();
        $lineModel = new InvoiceLineModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('Invoice not found');
        }
        
        // Delete lines first (though foreign key cascade might handle this)
        $lineModel->where('invoice_id', $id)->delete();
        
        if ($model->delete($id)) {
            $this->logAction('deleted', $invoice['invoice_number'] ?? 'Unknown', "Invoice deleted");
            return $this->respondDeleted(['id' => $id, 'message' => 'Invoice deleted']);
        }
        
        return $this->fail($model->errors());
    }

    private function mapInvoiceData($data)
    {
        return [
            'invoice_number' => $data['invoiceNumber'],
            'issue_date' => $data['issueDate'],
            'due_date' => $data['dueDate'] ?? null,
            'currency' => $data['currency'],
            'status' => $data['status'],
            'seller_name' => $data['seller']['name'],
            'seller_vat_id' => $data['seller']['vatId'] ?? null,
            'seller_address_json' => json_encode($data['seller']['address']),
            'seller_contact_json' => json_encode([
                'email' => $data['seller']['contactEmail'] ?? null,
                'phone' => $data['seller']['contactPhone'] ?? null,
            ]),
            'buyer_name' => $data['buyer']['name'],
            'buyer_vat_id' => $data['buyer']['vatId'] ?? null,
            'buyer_address_json' => json_encode($data['buyer']['address']),
            'buyer_contact_json' => json_encode([
                'email' => $data['buyer']['contactEmail'] ?? null,
                'phone' => $data['buyer']['contactPhone'] ?? null,
            ]),
            'line_extension_amount' => $data['lineExtensionAmount'],
            'tax_exclusive_amount' => $data['taxExclusiveAmount'],
            'tax_inclusive_amount' => $data['taxInclusiveAmount'],
            'payable_amount' => $data['payableAmount'],
            'payment_terms_json' => isset($data['paymentTerms']) ? json_encode($data['paymentTerms']) : null,
            'payment_means_json' => isset($data['paymentMeans']) ? json_encode($data['paymentMeans']) : null,
            'note' => $data['note'] ?? null,
            'signed' => $data['signed'] ?? 0,
            'signature_date' => $data['signatureDate'] ?? null,
        ];
    }

    private function mapLineData($line, $invoiceId)
    {
        return [
            'invoice_id' => $invoiceId,
            'description' => $line['description'],
            'quantity' => $line['quantity'],
            'unit_code' => $line['unitCode'],
            'unit_price' => $line['unitPrice'],
            'tax_category' => $line['taxCategory'],
            'tax_percent' => $line['taxPercent'],
            'line_extension_amount' => $line['quantity'] * $line['unitPrice'],
        ];
    }
}
