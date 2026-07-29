<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMustSetPasswordToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'must_set_password' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 0,
                'after'      => 'email_verified',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'must_set_password');
    }
}
