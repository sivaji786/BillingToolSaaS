<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCmsPagesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'slug' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
                'unique'     => true,
            ],
            'title' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
            ],
            'content' => [
                'type' => 'LONGTEXT',
                'null' => true,
            ],
            'meta_description' => [
                'type'       => 'TEXT',
                'null'       => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('cms_pages');

        // Insert default pages
        $db = \Config\Database::connect();
        $builder = $db->table('cms_pages');
        
        $now = date('Y-m-d H:i:s');
        $defaultPages = [
            [
                'slug' => 'home',
                'title' => 'Home Page Content',
                'content' => json_encode([
                    'hero_badge' => 'Smart Invoicing Solutions',
                    'hero_title' => 'Invoice smarter, not harder',
                    'hero_subtitle' => 'The complete platform for freelancers and small businesses to manage billing, tracking, and compliance.',
                    'about_title' => 'Efficiency at Scale',
                    'about_text' => 'We help thousands of professionals save time and get paid faster through automated workflows and beautiful templates.'
                ]),
                'updated_at' => $now
            ],
            [
                'slug' => 'privacy-policy',
                'title' => 'Privacy Policy',
                'content' => '<h1>Privacy Policy</h1><p>This is the privacy policy content...</p>',
                'updated_at' => $now
            ],
            [
                'slug' => 'terms-conditions',
                'title' => 'Terms & Conditions',
                'content' => '<h1>Terms & Conditions</h1><p>This is the terms and conditions content...</p>',
                'updated_at' => $now
            ],
            [
                'slug' => 'legal-notice',
                'title' => 'Legal Notice / Impressum',
                'content' => '<h1>Legal Notice</h1><p>This is the legal notice content...</p>',
                'updated_at' => $now
            ],
            [
                'slug' => 'cookie-settings',
                'title' => 'Cookie Settings',
                'content' => '<h1>Cookie Settings</h1><p>This is the cookie settings content...</p>',
                'updated_at' => $now
            ]
        ];
        
        $builder->insertBatch($defaultPages);
    }

    public function down()
    {
        $this->forge->dropTable('cms_pages');
    }
}
