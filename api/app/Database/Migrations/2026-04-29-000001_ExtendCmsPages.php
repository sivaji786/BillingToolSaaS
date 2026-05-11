<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ExtendCmsPages extends Migration
{
    public function up()
    {
        $fields = [
            'show_in_nav' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 0,
                'after'      => 'meta_description',
            ],
            'nav_label' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'default'    => null,
                'after'      => 'show_in_nav',
            ],
            'nav_order' => [
                'type'       => 'INT',
                'null'       => false,
                'default'    => 999,
                'after'      => 'nav_label',
            ],
            'page_template' => [
                'type'       => 'ENUM',
                'constraint' => ['blank', 'legal', 'landing'],
                'null'       => false,
                'default'    => 'blank',
                'after'      => 'nav_order',
            ],
            'is_published' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'null'       => false,
                'default'    => 1,
                'after'      => 'page_template',
            ],
        ];

        $this->forge->addColumn('cms_pages', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('cms_pages', [
            'show_in_nav',
            'nav_label',
            'nav_order',
            'page_template',
            'is_published',
        ]);
    }
}
