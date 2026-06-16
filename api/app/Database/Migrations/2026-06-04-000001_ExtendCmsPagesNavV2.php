<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ExtendCmsPagesNavV2 extends Migration
{
    public function up()
    {
        $fields = [
            'nav_position' => [
                'type'       => 'ENUM',
                'constraint' => ['top', 'bottom', 'both', 'none'],
                'null'       => false,
                'default'    => 'none',
                'after'      => 'is_published',
            ],
            'parent_id' => [
                'type'    => 'INT',
                'null'    => true,
                'default' => null,
                'after'   => 'nav_position',
            ],
            'link_url' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'default'    => null,
                'after'      => 'parent_id',
            ],
            'link_target' => [
                'type'       => 'ENUM',
                'constraint' => ['_self', '_blank'],
                'null'       => false,
                'default'    => '_self',
                'after'      => 'link_url',
            ],
            'footer_group' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'default'    => null,
                'after'      => 'link_target',
            ],
            'meta_title' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'default'    => null,
                'after'      => 'footer_group',
            ],
            'og_description' => [
                'type'    => 'TEXT',
                'null'    => true,
                'default' => null,
                'after'   => 'meta_title',
            ],
            'og_image' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'default'    => null,
                'after'      => 'og_description',
            ],
        ];

        $this->forge->addColumn('cms_pages', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('cms_pages', [
            'nav_position',
            'parent_id',
            'link_url',
            'link_target',
            'footer_group',
            'meta_title',
            'og_description',
            'og_image',
        ]);
    }
}
