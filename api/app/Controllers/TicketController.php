<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\TicketModel;
use App\Models\TicketTrackingModel;

class TicketController extends ResourceController
{
    use ResponseTrait;

    // ── Email helpers ─────────────────────────────────────────────────────────

    private function smtpConfig(): array
    {
        return [
            'protocol'   => getenv('MAIL_PROTOCOL')   ?: 'smtp',
            'SMTPHost'   => getenv('MAIL_HOST')        ?: 'localhost',
            'SMTPPort'   => (int)(getenv('MAIL_PORT')  ?: 587),
            'SMTPUser'   => getenv('MAIL_USERNAME')    ?: '',
            'SMTPPass'   => getenv('MAIL_PASSWORD')    ?: '',
            'SMTPCrypto' => getenv('MAIL_ENCRYPTION')  ?: 'tls',
            'mailType'   => 'html',
            'charset'    => 'utf-8',
            'newline'    => "\r\n",
        ];
    }

    private function sendTicketEmail(string $to, string $subject, string $body): void
    {
        try {
            $email = \Config\Services::email();
            $email->initialize($this->smtpConfig());
            $fromEmail = getenv('MAIL_FROM_EMAIL') ?: 'noreply@billingtool.com';
            $fromName  = getenv('MAIL_FROM_NAME')  ?: 'BillingTool Support';
            $email->setFrom($fromEmail, $fromName);
            $email->setTo($to);
            $email->setSubject($subject);
            $email->setMailType('html');
            $email->setMessage($body);
            if (!$email->send()) {
                log_message('error', '[TicketEmail] Failed to ' . $to . ': ' . $email->printDebugger(['headers']));
            }
        } catch (\Throwable $e) {
            log_message('error', '[TicketEmail] ' . $e->getMessage());
        }
    }

    private function notifySuperAdmins(array $ticket, int $ticketId): void
    {
        $adminModel = new \App\Models\AdminUserModel();
        $admins     = $adminModel->findAll();
        if (empty($admins)) {
            return;
        }
        $subject      = '[New Ticket #' . $ticketId . '] ' . $ticket['subject'];
        $priority     = strtoupper($ticket['priority'] ?? 'medium');
        $type         = ucfirst($ticket['type'] ?? 'bug');
        $attachCount  = 0;
        if (!empty($ticket['attachments'])) {
            $paths = json_decode($ticket['attachments'], true);
            $attachCount = is_array($paths) ? count($paths) : 0;
        }
        $attachLine = $attachCount > 0
            ? "<p><strong>Attachments:</strong> {$attachCount} file(s) attached</p>"
            : '';
        $body = "
            <h2>New Support Ticket Submitted</h2>
            <p><strong>Ticket #:</strong> {$ticketId}</p>
            <p><strong>Subject:</strong> " . htmlspecialchars($ticket['subject']) . "</p>
            <p><strong>Type:</strong> {$type}</p>
            <p><strong>Priority:</strong> {$priority}</p>
            <p><strong>Description:</strong></p>
            <blockquote style='border-left:3px solid #ccc;padding-left:12px;color:#555'>"
                . nl2br(htmlspecialchars($ticket['description']))
            . "</blockquote>
            {$attachLine}
            <p><strong>IP:</strong> " . ($ticket['client_ip'] ?? 'N/A') . "</p>
            <p>Log in to the admin panel to respond.</p>
        ";
        foreach ($admins as $admin) {
            if (!empty($admin['email'])) {
                $this->sendTicketEmail($admin['email'], $subject, $body);
            }
        }
    }

    private function notifySubmitter(array $ticket, string $comment, string $newStatus = ''): void
    {
        if (empty($ticket['user_id'])) {
            return;
        }
        $userModel = new \App\Models\UserModel();
        $user      = $userModel->withoutTenant()->find((int)$ticket['user_id']);
        if (empty($user['email'])) {
            return;
        }
        $subject      = '[Ticket #' . $ticket['id'] . ' Updated] ' . $ticket['subject'];
        $statusLine   = $newStatus ? "<p><strong>Status:</strong> " . htmlspecialchars($newStatus) . "</p>" : '';
        $commentBlock = $comment
            ? "<p><strong>Admin reply:</strong></p><blockquote style='border-left:3px solid #6366f1;padding-left:12px;color:#555'>"
                . nl2br(htmlspecialchars($comment))
                . "</blockquote>"
            : '';
        $body = "
            <h2>Your Support Ticket Has Been Updated</h2>
            <p><strong>Ticket #:</strong> {$ticket['id']}</p>
            <p><strong>Subject:</strong> " . htmlspecialchars($ticket['subject']) . "</p>
            {$statusLine}
            {$commentBlock}
            <p>Log in to view the full ticket details.</p>
        ";
        $this->sendTicketEmail($user['email'], $subject, $body);
    }

    private function notifyAssignee(int $adminId, array $ticket): void
    {
        $adminModel = new \App\Models\AdminUserModel();
        $assignee   = $adminModel->find($adminId);
        if (empty($assignee['email'])) {
            return;
        }
        $subject = '[Ticket #' . $ticket['id'] . ' Assigned to You] ' . $ticket['subject'];
        $body = "
            <h2>A Ticket Has Been Assigned to You</h2>
            <p><strong>Ticket #:</strong> {$ticket['id']}</p>
            <p><strong>Subject:</strong> " . htmlspecialchars($ticket['subject']) . "</p>
            <p><strong>Priority:</strong> " . strtoupper($ticket['priority'] ?? 'medium') . "</p>
            <p>Log in to the admin panel to review and respond.</p>
        ";
        $this->sendTicketEmail($assignee['email'], $subject, $body);
    }

    private function telegram(): \App\Services\TelegramService
    {
        static $svc = null;
        return $svc ??= new \App\Services\TelegramService();
    }

    private function getAdminName(?int $adminId): ?string
    {
        if (!$adminId) {
            return null;
        }
        $adminModel = new \App\Models\AdminUserModel();
        $admin      = $adminModel->find($adminId);
        return $admin ? $admin['name'] : null;
    }

    // ── Public endpoint: create ticket ────────────────────────────────────────

    public function create()
    {
        $model = new TicketModel();
        $data  = $this->request->getJSON(true) ?: $this->request->getPost();

        if (empty($data['subject']) || empty($data['description'])) {
            return $this->fail('Subject and description are required', 400);
        }

        $data['client_ip'] = $this->request->getIPAddress();

        // Sanitise type
        $allowedTypes = ['bug', 'feature', 'billing', 'other'];
        $data['type'] = in_array($data['type'] ?? '', $allowedTypes) ? $data['type'] : 'bug';

        // Build dated upload directory
        $year       = date('Y');
        $month      = strtoupper(date('M'));
        $uploadPath = FCPATH . 'uploads/tickets/' . $year . '/' . $month . '/';
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0777, true);
        }

        // Screenshot (base64 data-URL → JPG)
        if (!empty($data['screenshot'])) {
            try {
                $screenshotData = $data['screenshot'];
                if (preg_match('/^data:image\/(\w+);base64,/', $screenshotData)) {
                    $screenshotData = substr($screenshotData, strpos($screenshotData, ',') + 1);
                    $decoded        = base64_decode($screenshotData);
                    if ($decoded !== false) {
                        $img = imagecreatefromstring($decoded);
                        if ($img !== false) {
                            $fileName = 'screenshot_' . time() . '_' . uniqid() . '.jpg';
                            imagejpeg($img, $uploadPath . $fileName, 85);
                            imagedestroy($img);
                            $data['screenshot_path'] = 'uploads/tickets/' . $year . '/' . $month . '/' . $fileName;
                        }
                    }
                }
            } catch (\Throwable $e) {
                log_message('error', '[TicketController] Screenshot: ' . $e->getMessage());
            }
        }
        unset($data['screenshot']);

        // File attachments (multipart upload)
        $attachmentPaths = [];
        $allowedMimes    = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        $maxFileSize     = 10 * 1024 * 1024; // 10 MB

        $uploadedFiles = $this->request->getFiles();
        $attachFiles   = $uploadedFiles['attachments'] ?? [];
        if (!is_array($attachFiles)) {
            $attachFiles = [$attachFiles];
        }

        foreach ($attachFiles as $file) {
            if (!$file || !$file->isValid() || $file->hasMoved()) {
                continue;
            }
            if ($file->getSizeByUnit('b') > $maxFileSize) {
                log_message('warning', '[TicketController] Attachment too large: ' . $file->getClientName());
                continue;
            }
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                log_message('warning', '[TicketController] Rejected MIME: ' . $file->getMimeType());
                continue;
            }
            try {
                $newName = $file->getRandomName();
                $file->move($uploadPath, $newName);
                $attachmentPaths[] = 'uploads/tickets/' . $year . '/' . $month . '/' . $newName;
            } catch (\Throwable $e) {
                log_message('error', '[TicketController] Attachment upload: ' . $e->getMessage());
            }
        }

        if (!empty($attachmentPaths)) {
            $data['attachments'] = json_encode($attachmentPaths);
        }

        try {
            if ($model->save($data)) {
                $ticketId      = $model->getInsertID();
                $trackingModel = new TicketTrackingModel();
                $trackingModel->save((object)[
                    'ticket_id' => $ticketId,
                    'action'    => 'created',
                    'new_value' => 'Ticket created',
                    'comment'   => 'Initial creation',
                ]);

                $this->notifySuperAdmins($data, $ticketId);
                $this->telegram()->ticketCreated($data, $ticketId);

                return $this->respondCreated([
                    'status'      => 'success',
                    'message'     => 'Ticket created successfully',
                    'id'          => $ticketId,
                    'path'        => $data['screenshot_path'] ?? null,
                    'attachments' => $attachmentPaths,
                ]);
            }
            return $this->fail($model->errors());
        } catch (\Throwable $e) {
            log_message('error', '[TicketCreate] ' . $e->getMessage());
            return $this->failServerError('Server Error: ' . $e->getMessage());
        }
    }

    // ── Admin: list tickets ───────────────────────────────────────────────────

    public function index()
    {
        $model = new TicketModel();
        return $this->response->setJSON($model->findAll())->setStatusCode(200);
    }

    // ── Admin: update ticket (S4-07 notify + S4-08 assign + S4-09 SLA) ───────

    public function update($id = null)
    {
        if (!$id) {
            return $this->fail('Ticket ID is required', 400);
        }

        $model  = new TicketModel();
        $ticket = $model->find($id);
        if (!$ticket) {
            return $this->failNotFound('Ticket not found');
        }

        $data    = $this->request->getJSON(true) ?: $this->request->getRawInput();
        $comment = $data['comment'] ?? null;
        $now     = date('Y-m-d H:i:s');

        $updateData   = [];
        $trackingLogs = [];

        // Status change
        if (isset($data['status']) && $data['status'] !== $ticket['status']) {
            $updateData['status'] = $data['status'];
            $trackingLogs[] = [
                'action'    => 'status_change',
                'old_value' => $ticket['status'],
                'new_value' => $data['status'],
            ];
            // S4-09: auto-stamp resolved_at
            if (in_array($data['status'], ['resolved', 'closed']) && empty($ticket['resolved_at'])) {
                $updateData['resolved_at'] = $now;
            }
        }

        // Priority change
        if (isset($data['priority']) && $data['priority'] !== $ticket['priority']) {
            $updateData['priority'] = $data['priority'];
            $trackingLogs[] = [
                'action'    => 'priority_change',
                'old_value' => $ticket['priority'],
                'new_value' => $data['priority'],
            ];
        }

        // S4-08: assignment change
        $incomingAssigned = isset($data['assigned_to']) ? ((int)$data['assigned_to'] ?: null) : false;
        if ($incomingAssigned !== false) {
            $currentAssigned = isset($ticket['assigned_to']) ? (int)$ticket['assigned_to'] : null;
            if ($incomingAssigned !== $currentAssigned) {
                $updateData['assigned_to'] = $incomingAssigned;
                $trackingLogs[] = [
                    'action'    => 'assignment_change',
                    'old_value' => $this->getAdminName($currentAssigned) ?? 'Unassigned',
                    'new_value' => $this->getAdminName($incomingAssigned) ?? 'Unassigned',
                ];
                // S4-07: notify newly assigned admin
                if ($incomingAssigned) {
                    $this->notifyAssignee($incomingAssigned, $ticket);
                }
            }
        }

        // S4-09: auto first_response_at on first admin comment
        if (!empty($comment) && empty($ticket['first_response_at'])) {
            $updateData['first_response_at'] = $now;
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
            if (empty($trackingLogs) && !empty($comment)) {
                $trackingModel->save((object)[
                    'ticket_id' => $id,
                    'action'    => 'comment',
                    'comment'   => $comment,
                ]);
            } else {
                foreach ($trackingLogs as $log) {
                    $log['ticket_id'] = $id;
                    $log['comment']   = $comment;
                    $trackingModel->save((object)$log);
                }
            }

            $db->transComplete();
            if ($db->transStatus() === false) {
                return $this->fail('Transaction failed');
            }

            // S4-07: notify submitter if there is a comment
            if (!empty($comment)) {
                $this->notifySubmitter($ticket, $comment, $updateData['status'] ?? '');
            }

            $this->telegram()->ticketUpdated(
                (int)$id,
                $ticket['subject'],
                $trackingLogs,
                $comment
            );

            return $this->respond(['status' => 'success', 'message' => 'Ticket updated successfully']);
        } catch (\Throwable $e) {
            log_message('error', '[TicketUpdate] ' . $e->getMessage());
            return $this->failServerError('Server Error: ' . $e->getMessage());
        }
    }

    // ── Admin: bulk update (S4-10) ────────────────────────────────────────────

    public function bulkUpdate()
    {
        $data   = $this->request->getJSON(true) ?: [];
        $ids    = $data['ids']    ?? [];
        $status = $data['status'] ?? null;

        if (empty($ids) || !is_array($ids) || !$status) {
            return $this->fail('ids (array) and status are required', 400);
        }
        if (!in_array($status, ['open', 'in_progress', 'resolved', 'closed'])) {
            return $this->fail('Invalid status value', 400);
        }

        $model         = new TicketModel();
        $trackingModel = new TicketTrackingModel();
        $now           = date('Y-m-d H:i:s');
        $db            = \Config\Database::connect();
        $db->transStart();

        foreach ($ids as $rawId) {
            $ticketId = (int)$rawId;
            $ticket   = $model->find($ticketId);
            if (!$ticket || $ticket['status'] === $status) {
                continue;
            }
            $fields = ['status' => $status];
            if (in_array($status, ['resolved', 'closed']) && empty($ticket['resolved_at'])) {
                $fields['resolved_at'] = $now;
            }
            $model->update($ticketId, $fields);
            $trackingModel->save((object)[
                'ticket_id' => $ticketId,
                'action'    => 'status_change',
                'old_value' => $ticket['status'],
                'new_value' => $status,
                'comment'   => 'Bulk update',
            ]);
        }

        $db->transComplete();
        if ($db->transStatus() === false) {
            return $this->fail('Bulk update failed');
        }

        $this->telegram()->ticketsBulkUpdated($ids, $status);

        return $this->respond(['status' => 'success', 'message' => 'Tickets updated']);
    }

    // ── Admin: ticket tracking history ───────────────────────────────────────

    public function tracking($id = null)
    {
        if (!$id) {
            return $this->fail('Ticket ID is required', 400);
        }
        $trackingModel = new TicketTrackingModel();
        return $this->respond(
            $trackingModel->where('ticket_id', $id)->orderBy('created_at', 'DESC')->findAll()
        );
    }

    // ── Admin: list admin users for assignee dropdown (S4-08) ────────────────

    public function listAdmins()
    {
        $adminModel = new \App\Models\AdminUserModel();
        $admins     = $adminModel->select('id, name, email, role')->findAll();
        return $this->respond($admins);
    }
}
