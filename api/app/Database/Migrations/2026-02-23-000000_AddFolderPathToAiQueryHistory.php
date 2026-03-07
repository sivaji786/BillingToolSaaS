<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddFolderPathToAiQueryHistory extends Migration
{
    public function up()
    {
        $fields = [
            'folder_path' => [
                'type' => 'TEXT',
                'null' => true,
            ]
        ];

        $this->forge->addColumn('aiquery_history', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('aiquery_history', 'folder_path');
    }
}
