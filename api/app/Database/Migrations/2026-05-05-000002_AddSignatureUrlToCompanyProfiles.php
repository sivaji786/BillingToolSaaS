<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSignatureUrlToCompanyProfiles extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('signature_url', 'company_profiles')) {
            $this->forge->addColumn('company_profiles', [
                'signature_url' => [
                    'type'    => 'TEXT',
                    'null'    => true,
                    'comment' => 'Base64-encoded or URL signature image',
                    'after'   => 'logo_url',
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('company_profiles', 'signature_url');
    }
}
