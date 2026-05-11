<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\BuyerModel;
use CodeIgniter\API\ResponseTrait;
use App\Traits\AuditTrait;

class BuyerController extends BaseController
{
    use ResponseTrait, AuditTrait, \App\Traits\PlanLimitTrait;

    public function index()
    {
        try {
            $model = new BuyerModel();
            $buyers = $model->findAll();
            
            $transformed = array_map([$this, 'transformBuyer'], $buyers);
            
            return $this->response->setJSON($transformed)->setStatusCode(200);
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER LIST ERROR: ' . $e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $model = new BuyerModel();
            $buyer = $model->find($id);
            
            if (!$buyer) {
                return $this->failNotFound('Buyer not found');
            }
            
            return $this->response->setJSON($this->transformBuyer($buyer))->setStatusCode(200);
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER SHOW ERROR: ' . $e->getMessage());
        }
    }

    public function create()
    {
        if (!$this->withinPlanLimit('buyers')) {
            return $this->fail('Buyer directory limit reached. Please upgrade your plan.', 429);
        }

        try {
            $model = new BuyerModel();
            $data = $this->request->getJSON(true);
            
            $dbData = $this->mapToDb($data);
            
            if ($id = $model->insert($dbData)) {
                $this->logAction('created', 'BUYER', "Buyer created: " . ($dbData['name'] ?? 'Unknown'));
                return $this->respondCreated(['id' => $id, 'message' => 'Buyer created']);
            }
            
            return $this->fail($model->errors());
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER CREATE ERROR: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        try {
            $model = new BuyerModel();
            $data = $this->request->getJSON(true);
            
            $dbData = $this->mapToDb($data);

            if ($model->update($id, $dbData)) {
                $this->logAction('updated', 'BUYER', "Buyer updated: " . ($dbData['name'] ?? 'Unknown'));
                return $this->respond(['id' => $id, 'message' => 'Buyer updated']);
            }
            
            return $this->fail($model->errors());
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER UPDATE ERROR: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            $model = new BuyerModel();
            $buyer = $model->find($id);

            if (!$buyer) {
                return $this->failNotFound('Buyer not found');
            }

            if ($model->delete($id)) {
                $this->logAction('deleted', 'BUYER', "Buyer deleted: " . ($buyer['name'] ?? 'Unknown'));
                return $this->respondDeleted(['id' => $id, 'message' => 'Buyer deleted']);
            }

            return $this->fail('Delete failed');
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER DELETE ERROR: ' . $e->getMessage());
        }
    }

    /**
     * Bulk import buyers from a parsed CSV payload.
     * POST /buyers/import
     * Body: { buyers: [ { name, vatId, legalOrganizationId, contactEmail, contactPhone, address } ] }
     * Duplicate detection: skips rows whose email OR vatId already exist for this tenant.
     */
    public function import()
    {
        try {
            $model  = new BuyerModel();
            $input  = $this->request->getJSON(true);
            $rows   = $input['buyers'] ?? [];

            if (empty($rows)) {
                return $this->fail('No buyers provided', 400);
            }

            // Fetch existing emails and vat_ids for duplicate detection
            $existing   = $model->findAll();
            $existEmails = array_filter(array_column($existing, 'contact_json'), fn($j) => $j !== null);
            $emailSet    = [];
            foreach ($existEmails as $j) {
                $c = json_decode($j, true);
                if (!empty($c['email'])) {
                    $emailSet[strtolower($c['email'])] = true;
                }
            }
            $vatSet = [];
            foreach ($existing as $e) {
                if (!empty($e['vat_id'])) {
                    $vatSet[strtolower($e['vat_id'])] = true;
                }
            }

            $created   = 0;
            $skipped   = 0;
            $errors    = 0;
            $now       = date('Y-m-d H:i:s');

            foreach ($rows as $row) {
                $email  = strtolower(trim($row['contactEmail'] ?? ''));
                $vatId  = strtolower(trim($row['vatId'] ?? ''));

                // Skip duplicates
                if (($email && isset($emailSet[$email])) || ($vatId && $vatId !== '' && isset($vatSet[$vatId]))) {
                    $skipped++;
                    continue;
                }

                $dbData = $this->mapToDb($row);
                $dbData['created_at'] = $now;
                $dbData['updated_at'] = $now;

                if ($model->insert($dbData)) {
                    $created++;
                    if ($email) $emailSet[$email] = true;
                    if ($vatId) $vatSet[$vatId]   = true;
                } else {
                    $errors++;
                }
            }

            $this->logAction('imported', 'BUYER', "Bulk import: {$created} created, {$skipped} skipped, {$errors} errors");

            return $this->respond([
                'success' => true,
                'created' => $created,
                'skipped' => $skipped,
                'errors'  => $errors,
            ]);
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER IMPORT ERROR: ' . $e->getMessage());
        }
    }

    /**
     * Export all buyers as CSV.
     * GET /buyers/export
     */
    public function export()
    {
        try {
            $model  = new BuyerModel();
            $buyers = $model->findAll();

            $headers = ['Name', 'VAT ID', 'Legal Org ID', 'Email', 'Phone', 'Street', 'City', 'Postal Code', 'Country'];
            $rows    = [implode(',', $headers)];

            foreach ($buyers as $b) {
                $contact = json_decode($b['contact_json'] ?? '{}', true);
                $address = json_decode($b['address_json'] ?? '{}', true);
                $row = [
                    $this->csvCell($b['name'] ?? ''),
                    $this->csvCell($b['vat_id'] ?? ''),
                    $this->csvCell($b['legal_organization_id'] ?? ''),
                    $this->csvCell($contact['email'] ?? ''),
                    $this->csvCell($contact['phone'] ?? ''),
                    $this->csvCell($address['street'] ?? ''),
                    $this->csvCell($address['city'] ?? ''),
                    $this->csvCell($address['postalCode'] ?? ''),
                    $this->csvCell($address['country'] ?? ''),
                ];
                $rows[] = implode(',', $row);
            }

            $csv = implode("\n", $rows);

            return $this->response
                ->setHeader('Content-Type', 'text/csv; charset=UTF-8')
                ->setHeader('Content-Disposition', 'attachment; filename="buyers.csv"')
                ->setBody($csv);
        } catch (\Throwable $e) {
            return $this->failServerError('BUYER EXPORT ERROR: ' . $e->getMessage());
        }
    }

    private function csvCell(string $value): string
    {
        if (strpbrk($value, '",\n') !== false) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }

    private function mapToDb($data)
    {
        return [
            'name' => $data['name'] ?? null,
            'vat_id' => $data['vatId'] ?? null,
            'legal_organization_id' => $data['legalOrganizationId'] ?? null,
            'address_json' => isset($data['address']) ? json_encode($data['address']) : null,
            'contact_json' => isset($data['contact']) ? json_encode($data['contact']) : null,
        ];
    }

    private function transformBuyer($buyer)
    {
        $contact = isset($buyer['contact_json']) ? json_decode($buyer['contact_json'], true) : [];
        return [
            'id' => $buyer['id'],
            'name' => $buyer['name'],
            'vatId' => $buyer['vat_id'],
            'legalOrganizationId' => $buyer['legal_organization_id'] ?? null,
            'address' => isset($buyer['address_json']) ? json_decode($buyer['address_json'], true) : null,
            'contactEmail' => $contact['email'] ?? null,
            'contactPhone' => $contact['phone'] ?? null,
            'createdAt' => $buyer['created_at'],
            'updatedAt' => $buyer['updated_at'],
        ];
    }
}
