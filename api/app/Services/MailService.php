<?php

namespace App\Services;

class MailService
{
    /**
     * Send an HTML email via the SMTP settings in .env.
     * Returns true on success; failures are logged, never thrown.
     */
    public function send(string $toEmail, string $subject, string $htmlBody): bool
    {
        try {
            $email = \Config\Services::email();
            $email->initialize($this->smtpConfig());

            $fromEmail = getenv('MAIL_FROM_EMAIL') ?: 'noreply@billingtool.com';
            $fromName  = getenv('MAIL_FROM_NAME') ?: 'BillingTool';

            $email->setFrom($fromEmail, $fromName);
            $email->setTo($toEmail);
            $email->setSubject($subject);
            $email->setMailType('html');
            $email->setMessage($htmlBody);

            if (!$email->send()) {
                log_message('error', '[MailService] Failed to send "' . $subject . '" to: ' . $toEmail);
                log_message('error', $email->printDebugger(['headers']));
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            log_message('error', '[MailService] ' . $e->getMessage());
            return false;
        }
    }

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
}
