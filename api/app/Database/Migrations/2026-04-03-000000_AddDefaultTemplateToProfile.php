<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDefaultTemplateToProfile extends Migration
{
    public function up()
    {
        $fields = [
            'default_template_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'company_type_id'
            ],
        ];
        $this->forge->addColumn('company_profiles', $fields);
        $this->forge->addForeignKey('default_template_id', 'invoice_templates', 'id', 'SET NULL', 'SET NULL', 'company_profiles_default_template_fk');
    }

    public function down()
    {
        $this->forge->dropForeignKey('company_profiles', 'company_profiles_default_template_fk');
        $this->forge->dropColumn('company_profiles', 'default_template_id');
    }
}
