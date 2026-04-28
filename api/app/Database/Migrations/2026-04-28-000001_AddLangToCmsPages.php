<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddLangToCmsPages extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();

        // Add lang column
        $this->forge->addColumn('cms_pages', [
            'lang' => [
                'type'       => 'VARCHAR',
                'constraint' => '5',
                'default'    => 'en',
                'after'      => 'slug',
            ],
        ]);

        // Set existing rows to 'en'
        $db->query("UPDATE cms_pages SET lang = 'en' WHERE lang IS NULL OR lang = ''");

        // Drop old unique index on slug and add composite unique on (slug, lang)
        $db->query("ALTER TABLE cms_pages DROP INDEX slug");
        $db->query("ALTER TABLE cms_pages ADD UNIQUE KEY slug_lang (slug, lang)");
    }

    public function down()
    {
        $db = \Config\Database::connect();

        // Keep only 'en' rows and restore single-column unique index
        $db->query("DELETE FROM cms_pages WHERE lang != 'en'");
        $db->query("ALTER TABLE cms_pages DROP INDEX slug_lang");
        $db->query("ALTER TABLE cms_pages ADD UNIQUE KEY slug (slug)");

        $this->forge->dropColumn('cms_pages', 'lang');
    }
}
