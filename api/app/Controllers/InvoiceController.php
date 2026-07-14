<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\InvoiceModel;
use App\Models\InvoiceLineModel;
use App\Models\BuyerModel;
use CodeIgniter\API\ResponseTrait;

use App\Traits\AuditTrait;

class InvoiceController extends BaseController
{
    use ResponseTrait, AuditTrait, \App\Traits\PlanLimitTrait;

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
                    case 'customRange':
                        $dateFrom = $this->request->getGet('customDateFrom');
                        $dateTo   = $this->request->getGet('customDateTo');
                        if ($dateFrom) {
                            $model->where('issue_date >=', $dateFrom);
                        }
                        if ($dateTo) {
                            $model->where('issue_date <=', $dateTo);
                        }
                        break;
                }
            }

            // Always return only invoices — business letters use /letters endpoint
            $model->groupStart()
                ->where('template_type', 'invoice')
                ->orWhere('template_type IS NULL', null, false)
            ->groupEnd();

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

            $page     = (int)$this->request->getGet('page');
            $pageSize = max(1, (int)($this->request->getGet('pageSize') ?? 50));

            if ($page >= 1) {
                $total    = $model->countAllResults(false);
                $invoices = $model->findAll($pageSize, ($page - 1) * $pageSize);
                $transformed = array_map([$this, 'transformInvoice'], $invoices);
                return $this->response->setJSON([
                    'data'     => $transformed,
                    'total'    => $total,
                    'page'     => $page,
                    'pageSize' => $pageSize,
                ])->setStatusCode(200);
            }

            $invoices    = $model->findAll();
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

    protected function transformLine($line)
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

    protected function transformInvoice($invoice)
    {
        // Robust decoding: if decode returns null (invalid/empty), default to empty array
        $sellerContact = json_decode($invoice['seller_contact_json'] ?? '{}', true) ?: [];
        $buyerContact = json_decode($invoice['buyer_contact_json'] ?? '{}', true) ?: [];

        return [
            'id' => (string)$invoice['id'],
            'templateType' => $invoice['template_type'] ?? 'invoice',
            'templateId' => $invoice['template_id'] ?? null,
            'invoiceNumber' => $invoice['invoice_number'],
            'issueDate' => $invoice['issue_date'],
            'dueDate' => $invoice['due_date'],
            'currency' => $invoice['currency'],
            'status' => $invoice['status'],
            'payableAmount' => (float)$invoice['payable_amount'],
            'note'    => $invoice['note'] ?? null,
            'subject' => $invoice['note'] ?? null,
            'body'    => $invoice['body'] ?? null,
            'salutation' => $invoice['salutation'] ?? null,
            'closing' => $invoice['closing'] ?? null,
            'seller' => [
                'name' => $invoice['seller_name'] ?? '',
                'vatId' => $invoice['seller_vat_id'] ?? null,
                'address' => json_decode($invoice['seller_address_json'] ?? '{}', true) ?: (object)[],
                'contactEmail' => $sellerContact['email'] ?? null,
                'contactPhone' => $sellerContact['phone'] ?? null,
            ],
            'buyer' => [
                'name' => $invoice['buyer_name'] ?? '',
                'vatId' => $invoice['buyer_vat_id'] ?? null,
                'address' => json_decode($invoice['buyer_address_json'] ?? '{}', true) ?: (object)[],
                'contactEmail' => $buyerContact['email'] ?? null,
                'contactPhone' => $buyerContact['phone'] ?? null,
            ],
            'lines' => [],
            'taxTotals' => [],
            'lineExtensionAmount' => (float)($invoice['line_extension_amount'] ?? 0),
            'taxExclusiveAmount'  => (float)($invoice['tax_exclusive_amount'] ?? 0),
            'taxInclusiveAmount'  => (float)($invoice['tax_inclusive_amount'] ?? 0),
        ];
    }

    public function create()
    {
        // Enforce monthly invoice limit from plan
        $data = $this->request->getJSON(true);
        $isLetter = ($data['templateType'] ?? '') === 'business_letter';
        $limitKey = $isLetter ? 'letters' : 'invoices';
        if (!$this->withinPlanLimit($limitKey)) {
            return $this->fail('Monthly ' . $limitKey . ' limit reached. Please upgrade your plan.', 429);
        }

        $model = new InvoiceModel();
        $lineModel = new InvoiceLineModel();

        // Map frontend data to database columns
        $dbData = $this->mapInvoiceData($data);
        
        // Get Authenticated User ID (from Session or JWT)
        $userId = session()->get('userId');
        if (!$userId) {
             // Try JWT if session empty
             $authHeader = $this->request->getHeaderLine('Authorization');
             if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                 $key = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? 'e88f7de29c95b084f1eb22e69093c3dafaa85f84eca6bbe0c8a94b8f4590df3e';
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
            
            // Sync buyer to directory
            $this->syncBuyer($data['buyer'] ?? []);
            
            $this->logAction('created', $dbData['invoice_number'], "Invoice created for {$dbData['buyer_name']}");
            return $this->respondCreated(['id' => (string)$invoiceId, 'message' => 'Invoice created']);
        }
        
        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new InvoiceModel();
        $lineModel = new InvoiceLineModel();
        
        $data = $this->request->getJSON(true);

        // Check if invoice exists
        $existing = $model->find($id);
        if (!$existing) {
            return $this->failNotFound('Invoice not found');
        }

        // Enforce status transition rules
        $allowedTransitions = [
            'draft'     => ['draft', 'validated', 'cancelled'],
            'validated' => ['validated', 'draft', 'sent', 'cancelled'],
            'sent'      => ['sent', 'paid', 'cancelled', 'overdue'],
            'overdue'   => ['overdue', 'paid', 'cancelled'],
            'paid'      => ['paid'],
            'cancelled' => ['cancelled'],
        ];
        $currentStatus = $existing['status'] ?? 'draft';
        $newStatus     = $data['status'] ?? $currentStatus;
        $permitted     = $allowedTransitions[$currentStatus] ?? [$currentStatus];
        if (!in_array($newStatus, $permitted, true)) {
            return $this->fail("Invalid status transition: {$currentStatus} → {$newStatus}", 422);
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
            
            // Sync buyer to directory
            $this->syncBuyer($data['buyer'] ?? []);

            $this->logAction($action, $dbData['invoice_number'], "Invoice {$action}. Status: {$dbData['status']}", (bool)($dbData['signed'] ?? false));
            return $this->respond(['id' => $id, 'message' => 'Invoice updated']);
        }
        
        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new InvoiceModel();
        $lineModel = new InvoiceLineModel();

        $invoice = $model->find($id);
        if (!$invoice) {
            return $this->failNotFound('Invoice not found');
        }

        $lineModel->where('invoice_id', $id)->delete();

        if ($model->delete($id)) {
            $this->logAction('deleted', $invoice['invoice_number'] ?? 'Unknown', "Invoice deleted");
            return $this->respondDeleted(['id' => $id, 'message' => 'Invoice deleted']);
        }

        return $this->fail($model->errors());
    }

    protected function mapInvoiceData($data)
    {
        $seller = $data['seller'] ?? [];
        $buyer  = $data['buyer']  ?? [];

        return [
            'invoice_number'       => $data['invoiceNumber'] ?? $data['invoice_number'] ?? ('INV-' . strtoupper(substr(uniqid(), -6))),
            'issue_date'           => $data['issueDate']     ?? $data['issue_date']     ?? $data['date'] ?? date('Y-m-d'),
            'due_date'             => $data['dueDate']       ?? $data['due_date']       ?? null,
            'currency'             => $data['currency']      ?? 'EUR',
            'status'               => $data['status']        ?? 'draft',
            'seller_name'          => $seller['name']        ?? $data['seller_name']    ?? '',
            'seller_vat_id'        => $seller['vatId']       ?? $data['seller_vat_id']  ?? null,
            'seller_address_json'  => json_encode($seller['address']   ?? $data['seller_address']  ?? []),
            'seller_contact_json'  => json_encode([
                'email' => $seller['contactEmail'] ?? null,
                'phone' => $seller['contactPhone'] ?? null,
            ]),
            'buyer_name'           => $buyer['name']         ?? $data['buyer_name']     ?? $data['recipient_name']    ?? '',
            'buyer_vat_id'         => $buyer['vatId']        ?? $data['buyer_vat_id']   ?? null,
            'buyer_address_json'   => json_encode($buyer['address']    ?? $data['buyer_address']   ?? $data['recipient_address'] ?? []),
            'buyer_contact_json'   => json_encode([
                'email' => $buyer['contactEmail'] ?? null,
                'phone' => $buyer['contactPhone'] ?? null,
            ]),
            'line_extension_amount'=> $data['lineExtensionAmount'] ?? $data['line_extension_amount'] ?? 0,
            'tax_exclusive_amount' => $data['taxExclusiveAmount']  ?? $data['tax_exclusive_amount']  ?? 0,
            'tax_inclusive_amount' => $data['taxInclusiveAmount']  ?? $data['tax_inclusive_amount']  ?? 0,
            'payable_amount'       => $data['payableAmount']       ?? $data['payable_amount']        ?? 0,
            'template_type'        => $data['templateType']        ?? $data['template_type']         ?? 'invoice',
            'template_id'          => $data['templateId']          ?? $data['template_id']           ?? null,
            'payment_terms_json'   => isset($data['paymentTerms'])  ? json_encode($data['paymentTerms'])  : null,
            'payment_means_json'   => isset($data['paymentMeans'])  ? json_encode($data['paymentMeans'])  : null,
            'note'                 => $data['note']            ?? $data['subject'] ?? null,
            'body'                 => $data['body']           ?? null,
            'salutation'           => $data['salutation']     ?? null,
            'closing'              => $data['closing']        ?? null,
            'signed'               => $data['signed']         ?? 0,
            'signature_date'       => $data['signatureDate']  ?? $data['signature_date'] ?? null,
        ];
    }

    protected function mapLineData($line, $invoiceId)
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

    public function generateShareToken($id = null)
    {
        $model   = new InvoiceModel();
        $invoice = $model->find($id);

        if (!$invoice) {
            return $this->failNotFound('Invoice not found');
        }

        $baseUrl = rtrim(getenv('FRONTEND_URL') ?: ($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173'), '/');

        // Return existing token unless caller explicitly requests a fresh one (?force=1)
        if (!empty($invoice['share_token']) && $this->request->getGet('force') !== '1') {
            $shareUrl = $baseUrl . '/#/shared/' . $invoice['share_token'];
            return $this->respond(['shareUrl' => $shareUrl, 'token' => $invoice['share_token']]);
        }

        $token = bin2hex(random_bytes(32));
        $model->update($id, ['share_token' => $token]);

        $shareUrl = $baseUrl . '/#/shared/' . $token;
        return $this->respond(['shareUrl' => $shareUrl, 'token' => $token]);
    }

    public function showByToken($token = null)
    {
        $model   = new InvoiceModel();
        $invoice = $model->where('share_token', $token)->first();

        if (!$invoice) {
            return $this->failNotFound('Invoice not found or link has expired');
        }

        $transformed          = $this->transformInvoice($invoice);
        $lineModel            = new \App\Models\InvoiceLineModel();
        $transformed['lines'] = array_map([$this, 'transformLine'], $lineModel->where('invoice_id', $invoice['id'])->findAll());

        return $this->respond($transformed);
    }

    protected function syncBuyer($buyerData)
    {
        if (empty($buyerData['name']) || strlen($buyerData['name']) < 3) {
            return;
        }

        $buyerModel = new BuyerModel();
        
        // Check if buyer already exists for this tenant
        $existing = $buyerModel->where('name', $buyerData['name'])->first();

        if (!$existing) {
            $buyerModel->insert([
                'name'                  => $buyerData['name'],
                'vat_id'               => $buyerData['vatId'] ?? null,
                'legal_organization_id' => $buyerData['legalOrganizationId'] ?? null,
                'address_json'         => json_encode($buyerData['address'] ?? []),
                'contact_json'         => json_encode([
                    'email' => $buyerData['contactEmail'] ?? null,
                    'phone' => $buyerData['contactPhone'] ?? null,
                ]),
            ]);
        } else {
            $buyerModel->update($existing['id'], [
                'vat_id'       => $buyerData['vatId'] ?? $existing['vat_id'],
                'address_json' => json_encode($buyerData['address'] ?? []),
                'contact_json' => json_encode([
                    'email' => $buyerData['contactEmail'] ?? null,
                    'phone' => $buyerData['contactPhone'] ?? null,
                ]),
            ]);
        }
    }
}
