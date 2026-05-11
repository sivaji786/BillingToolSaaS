<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class SecureQuickAccessSessions extends Migration
{
    public function up()
    {
        // Drop plaintext OTP column — verification uses otp_hash (bcrypt) only
        if ($this->db->fieldExists('otp', 'quick_access_sessions')) {
            $this->forge->dropColumn('quick_access_sessions', 'otp');
        }

        // Add client_ip for OTP rate limiting per IP address
        if (!$this->db->fieldExists('client_ip', 'quick_access_sessions')) {
            $this->forge->addColumn('quick_access_sessions', [
                'client_ip' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 45,
                    'null'       => true,
                    'comment'    => 'Client IP for rate limiting',
                    'after'      => 'email',
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('quick_access_sessions', 'client_ip');

        $this->forge->addColumn('quick_access_sessions', [
            'otp' => [
                'type'       => 'VARCHAR',
                'constraint' => 6,
                'null'       => true,
                'after'      => 'email',
            ],
        ]);
    }
}
