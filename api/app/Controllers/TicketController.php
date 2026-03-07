<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\TicketModel;
use App\Models\ProjectModel;

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
                return $this->respondCreated([
                    'status' => 'success', 
                    'message' => 'Ticket created successfully', 
                    'id' => $model->getInsertID(),
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
        if (isset($data['status'])) {
            $updateData['status'] = $data['status'];
        }
        if (isset($data['priority'])) {
            $updateData['priority'] = $data['priority'];
        }

        if (empty($updateData)) {
             return $this->fail('No valid fields to update', 400);
        }

        try {
            if ($model->update($id, $updateData)) {
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Ticket updated successfully',
                ]);
            } else {
                return $this->fail($model->errors());
            }
        } catch (\Throwable $e) {
            log_message('error', '[TicketUpdate] ' . $e->getMessage());
            return $this->failServerError('Server Error: ' . $e->getMessage());
        }
    }
}
