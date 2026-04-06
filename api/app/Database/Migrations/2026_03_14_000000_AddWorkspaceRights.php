<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddWorkspaceRights extends Migration
{
    public function up()
    {
        $data = [
            [
                'module'      => 'workspace',
                'action'      => 'read',
                'code'        => 'workspace.read',
                'description' => 'View files and folders, download items'
            ],
            [
                'module'      => 'workspace',
                'action'      => 'create',
                'code'        => 'workspace.create',
                'description' => 'Upload files, create folders, extract zip archives'
            ],
            [
                'module'      => 'workspace',
                'action'      => 'update',
                'code'        => 'workspace.update',
                'description' => 'Rename files and folders'
            ],
            [
                'module'      => 'workspace',
                'action'      => 'delete',
                'code'        => 'workspace.delete',
                'description' => 'Delete files and folders'
            ],
            [
                'module'      => 'workspace',
                'action'      => 'ai',
                'code'        => 'workspace.ai',
                'description' => 'Perform AI-powered searches'
            ],
        ];

        $this->db->table('rights')->insertBatch($data);
    }

    public function down()
    {
        $this->db->table('rights')
                 ->whereIn('code', ['workspace.read', 'workspace.create', 'workspace.update', 'workspace.delete', 'workspace.ai'])
                 ->delete();
    }
}
