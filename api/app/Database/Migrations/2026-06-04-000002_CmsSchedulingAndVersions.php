<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CmsSchedulingAndVersions extends Migration
{
    public function up()
    {
        // Add published_at to cms_pages for scheduled publishing
        $this->forge->addColumn('cms_pages', [
            'published_at' => [
                'type'    => 'DATETIME',
                'null'    => true,
                'default' => null,
                'after'   => 'is_published',
            ],
        ]);

        // cms_page_versions — rollback history
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'page_id' => [
                'type'     => 'INT',
                'unsigned' => true,
                'null'     => false,
            ],
            'slug' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => false,
            ],
            'lang' => [
                'type'       => 'VARCHAR',
                'constraint' => 5,
                'null'       => false,
            ],
            'content' => [
                'type' => 'LONGTEXT',
                'null' => false,
            ],
            'saved_by_label' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'default'    => null,
            ],
            'saved_at' => [
                'type'    => 'DATETIME',
                'null'    => false,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('page_id');
        $this->forge->createTable('cms_page_versions');

        // cms_media — centralised media library
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'filename' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],
            'url' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => false,
            ],
            'alt_text' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'default'    => null,
            ],
            'width' => [
                'type'    => 'INT',
                'null'    => true,
                'default' => null,
            ],
            'height' => [
                'type'    => 'INT',
                'null'    => true,
                'default' => null,
            ],
            'file_size' => [
                'type'    => 'INT',
                'null'    => true,
                'default' => null,
            ],
            'uploaded_by_label' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'default'    => null,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('cms_media');
    }

    public function down()
    {
        $this->forge->dropColumn('cms_pages', ['published_at']);
        $this->forge->dropTable('cms_page_versions', true);
        $this->forge->dropTable('cms_media', true);
    }
}
