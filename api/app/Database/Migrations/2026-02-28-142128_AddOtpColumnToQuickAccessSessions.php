<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddOtpColumnToQuickAccessSessions extends Migration
{
    public function up()
    {
        $this->forge->addColumn('quick_access_sessions', [
            'otp' => [
                'type'       => 'VARCHAR',
                'constraint' => 6,
                'null'       => true,
                'comment'    => 'Raw OTP for testing (remove in prod)',
                'after'      => 'email'
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('quick_access_sessions', 'otp');
    }
}
