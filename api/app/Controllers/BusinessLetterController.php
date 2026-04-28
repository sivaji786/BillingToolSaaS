<?php

namespace App\Controllers;

use App\Models\BusinessLetterModel;
use App\Models\InvoiceLineModel;

class BusinessLetterController extends InvoiceController
{
    public function index()
    {
        try {
            $model = new BusinessLetterModel();
            $model->letters(); // scope to business_letter only

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
                }
            }

            $sort = $this->request->getGet('sort') ?? 'dateDesc';
            switch ($sort) {
                case 'dateAsc':  $model->orderBy('issue_date', 'ASC'); break;
                case 'numberDesc': $model->orderBy('invoice_number', 'DESC'); break;
                case 'numberAsc':  $model->orderBy('invoice_number', 'ASC'); break;
                default:         $model->orderBy('issue_date', 'DESC');
            }

            $letters = $model->findAll();
            $transformed = array_map([$this, 'transformInvoice'], $letters);

            return $this->response->setJSON($transformed)->setStatusCode(200);
        } catch (\Throwable $e) {
            return $this->failServerError('LETTER LIST ERROR: ' . $e->getMessage());
        }
    }

    public function show($id = null)
    {
        $model = new BusinessLetterModel();
        $letter = $model->letters()->find($id);

        if (!$letter) {
            return $this->failNotFound('Letter not found');
        }

        $transformed = $this->transformInvoice($letter);
        // Letters have no line items but keep the key for API consistency
        $transformed['lines'] = [];

        return $this->respond($transformed);
    }

    public function create()
    {
        $model = new BusinessLetterModel();
        $data  = $this->request->getJSON(true);

        $dbData = $this->mapInvoiceData($data);
        $dbData['template_type'] = 'business_letter'; // always enforce

        // Zero-out financial fields — letters have no monetary value
        $dbData['line_extension_amount'] = 0;
        $dbData['tax_exclusive_amount']  = 0;
        $dbData['tax_inclusive_amount']  = 0;
        $dbData['payable_amount']        = 0;

        // Resolve authenticated user
        $userId = session()->get('userId');
        if (!$userId) {
            $authHeader = $this->request->getHeaderLine('Authorization');
            if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                $key = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? 'e88f7de29c95b084f1eb22e69093c3dafaa85f84eca6bbe0c8a94b8f4590df3e';
                try {
                    $decoded = \Firebase\JWT\JWT::decode($matches[1], new \Firebase\JWT\Key($key, 'HS256'));
                    $userId  = $decoded->uid ?? $decoded->user_id;
                } catch (\Exception $e) {}
            }
        }
        $dbData['created_by'] = $userId ?: 1;

        if ($model->insert($dbData)) {
            $letterId = $model->getInsertID();
            $this->syncBuyer($data['buyer'] ?? []);
            $this->logAction('created', $dbData['invoice_number'], "Letter created for {$dbData['buyer_name']}");
            return $this->respondCreated(['id' => (string)$letterId, 'message' => 'Letter created']);
        }

        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new BusinessLetterModel();

        if (!$model->letters()->find($id)) {
            return $this->failNotFound('Letter not found');
        }

        $data   = $this->request->getJSON(true);
        $dbData = $this->mapInvoiceData($data);
        $dbData['template_type']         = 'business_letter';
        $dbData['line_extension_amount'] = 0;
        $dbData['tax_exclusive_amount']  = 0;
        $dbData['tax_inclusive_amount']  = 0;
        $dbData['payable_amount']        = 0;

        if ($model->update($id, $dbData)) {
            $this->syncBuyer($data['buyer'] ?? []);
            $this->logAction('updated', $dbData['invoice_number'], "Letter updated. Status: {$dbData['status']}");
            return $this->respond(['id' => $id, 'message' => 'Letter updated']);
        }

        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new BusinessLetterModel();

        if (!$model->letters()->find($id)) {
            return $this->failNotFound('Letter not found');
        }

        if ($model->delete($id)) {
            $this->logAction('deleted', 'Unknown', 'Letter deleted');
            return $this->respondDeleted(['id' => $id, 'message' => 'Letter deleted']);
        }

        return $this->fail($model->errors());
    }
}
