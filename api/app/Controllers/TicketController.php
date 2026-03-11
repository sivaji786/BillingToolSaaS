<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\TicketModel;
use App\Models\ProjectModel;
use App\Models\TicketTrackingModel;

class TicketController extends ResourceController
{
    use ResponseTrait;

    public function create()
    {
        $model = new TicketModel();


        $data = $this->request->getJSON(true); // Get JSON data

        if (!$data) {
             // Fallback to post data if JSON is null (e.g. form-data)
            $data = $this->request->getPost();
        }

        // Add user_id if authenticated (optional, depends on your auth setup)
        // For now we'll leave it nullable as per requirements or assume it comes from frontend
        
        // Simple validation
        if (empty($data['subject']) || empty($data['description'])) {
            return $this->fail('Subject and description are required', 400);
        }


        // Capture metadata
        $data['client_ip'] = $this->request->getIPAddress();
        
        // Handle screenshot saving
        if (!empty($data['screenshot'])) {
            try {
                $screenshotData = $data['screenshot'];
                // Remove header from base64 string
                if (preg_match('/^data:image\/(\w+);base64,/', $screenshotData, $type)) {
                    $screenshotData = substr($screenshotData, strpos($screenshotData, ',') + 1);
                    $type = strtolower($type[1]); // png, jpg, etc.

                    $decodedData = base64_decode($screenshotData);
                    if ($decodedData === false) {
                        log_message('error', '[TicketController] base64_decode failed');
                    } else {
                        // Create directory if not exists (Year/Month-wise)
                        $year = date('Y');
                        $month = strtoupper(date('M')); // JAN, FEB, etc.
                        $uploadPath = FCPATH . 'uploads/tickets/' . $year . '/' . $month . '/';
                        if (!is_dir($uploadPath)) {
                            mkdir($uploadPath, 0777, true);
                        }

                        $fileName = 'ticket_' . time() . '_' . uniqid() . '.jpg';
                        $fullPath = $uploadPath . $fileName;

                        // Save as JPG using GD library
                        $img = imagecreatefromstring($decodedData);
                        if ($img !== false) {
                            imagejpeg($img, $fullPath, 85); // 85% quality
                            imagedestroy($img);
                            $data['screenshot_path'] = 'uploads/tickets/' . $year . '/' . $month . '/' . $fileName;
                        }
                    }
                }
            } catch (\Throwable $e) {
                log_message('error', '[TicketController] Screenshot processing failed: ' . $e->getMessage());
            }
        }

        try {
            if ($model->save($data)) {
                $ticketId = $model->getInsertID();
                
                // Initial tracking entry
                $trackingModel = new TicketTrackingModel();
                $trackingModel->save((object)[
                    'ticket_id' => $ticketId,
                    'action' => 'created',
                    'new_value' => 'Ticket created',
                    'comment' => 'Initial creation'
                ]);

                return $this->respondCreated([
                    'status' => 'success', 
                    'message' => 'Ticket created successfully', 
                    'id' => $ticketId,
                    'path' => $data['screenshot_path'] ?? null
                ]);
            } else {
                return $this->fail($model->errors());
            }
        } catch (\Throwable $e) {
            log_message('error', '[TicketCreate] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return $this->failServerError('Server Error: ' . $e->getMessage());
        }
    }
    
    public function index() {
        // Optional: for verification later if needed
        $model = new TicketModel();
        return $this->response->setJSON($model->findAll())->setStatusCode(200);
    }

    public function update($id = null)
    {
        if (!$id) {
            return $this->fail('Ticket ID is required', 400);
        }

        $model = new TicketModel();
        $ticket = $model->find($id);

        if (!$ticket) {
            return $this->failNotFound('Ticket not found');
        }

        $data = $this->request->getJSON(true);
        if (!$data) {
            $data = $this->request->getRawInput();
        }

        $updateData = [];
        $trackingLogs = [];
        $comment = $data['comment'] ?? null;

        if (isset($data['status']) && $data['status'] !== $ticket['status']) {
            $updateData['status'] = $data['status'];
            $trackingLogs[] = [
                'action' => 'status_change',
                'old_value' => $ticket['status'],
                'new_value' => $data['status']
            ];
        }
        if (isset($data['priority']) && $data['priority'] !== $ticket['priority']) {
            $updateData['priority'] = $data['priority'];
            $trackingLogs[] = [
                'action' => 'priority_change',
                'old_value' => $ticket['priority'],
                'new_value' => $data['priority']
            ];
        }

        if (empty($updateData) && empty($comment)) {
             return $this->fail('No valid fields to update', 400);
        }

        try {
            $db = \Config\Database::connect();
            $db->transStart();

            if (!empty($updateData)) {
                $model->update($id, $updateData);
            }

            $trackingModel = new TicketTrackingModel();
            
            // If only comment is provided
            if (empty($trackingLogs) && !empty($comment)) {
                $trackingModel->save((object)[
                    'ticket_id' => $id,
                    'action' => 'comment',
                    'comment' => $comment
                ]);
            } else {
                // Log all changes with the comment
                foreach ($trackingLogs as $log) {
                    $log['ticket_id'] = $id;
                    $log['comment'] = $comment; // Attach same comment to all changes in this update
                    $trackingModel->save((object)$log);
                }
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->fail('Transaction failed');
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Ticket updated successfully',
            ]);
        } catch (\Throwable $e) {
            log_message('error', '[TicketUpdate] ' . $e->getMessage());
            return $this->failServerError('Server Error: ' . $e->getMessage());
        }
    }

    public function tracking($id = null)
    {
        if (!$id) {
            return $this->fail('Ticket ID is required', 400);
        }

        $trackingModel = new TicketTrackingModel();
        $tracking = $trackingModel->where('ticket_id', $id)
                                 ->orderBy('created_at', 'DESC')
                                 ->findAll();

        return $this->respond($tracking);
    }
}
