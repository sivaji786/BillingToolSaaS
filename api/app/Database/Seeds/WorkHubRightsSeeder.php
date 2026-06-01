<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Inserts all WorkHub RBAC rights and maps them to roles.
 *
 * Run once after enabling WorkHub on a tenant:
 *   php spark db:seed WorkHubRightsSeeder
 *
 * Safe to re-run: skips rights that already exist (checked by code).
 */
class WorkHubRightsSeeder extends Seeder
{
    // WorkHub roles and the rights they receive
    private const ROLE_PERMISSIONS = [
        'WorkHub Worker' => [
            'workhub.task.view',
            'workhub.timer.start',
            'workhub.completion.submit',
            'workhub.reports.view',
        ],
        'WorkHub Planner' => [
            'workhub.task.view',
            'workhub.task.create',
            'workhub.task.edit',
            'workhub.task.assign',
            'workhub.timer.start',
            'workhub.completion.submit',
            'workhub.project.manage',
            'workhub.reports.view',
            'workhub.reports.export',
        ],
        'WorkHub Manager' => [
            'workhub.task.view',
            'workhub.task.create',
            'workhub.task.edit',
            'workhub.task.delete',
            'workhub.task.assign',
            'workhub.timer.start',
            'workhub.completion.submit',
            'workhub.completion.approve',
            'workhub.project.manage',
            'workhub.reports.view',
            'workhub.reports.export',
            'workhub.billing.view',
            'workhub.admin.manage',
        ],
        'WorkHub Client' => [
            'workhub.task.view',
            'workhub.reports.view',
        ],
        'WorkHub Finance' => [
            'workhub.task.view',
            'workhub.reports.view',
            'workhub.reports.export',
            'workhub.billing.view',
        ],
    ];

    public function run()
    {
        $db = \Config\Database::connect();

        // 1. Insert rights (skip if already exists)
        $rightsData = [
            ['module' => 'workhub', 'action' => 'task.view',           'code' => 'workhub.task.view',           'description' => 'View WorkHub tasks and task details'],
            ['module' => 'workhub', 'action' => 'task.create',         'code' => 'workhub.task.create',         'description' => 'Create new WorkHub tasks'],
            ['module' => 'workhub', 'action' => 'task.edit',           'code' => 'workhub.task.edit',           'description' => 'Edit WorkHub task details and status'],
            ['module' => 'workhub', 'action' => 'task.delete',         'code' => 'workhub.task.delete',         'description' => 'Soft-delete WorkHub tasks'],
            ['module' => 'workhub', 'action' => 'task.assign',         'code' => 'workhub.task.assign',         'description' => 'Assign WorkHub tasks to workers'],
            ['module' => 'workhub', 'action' => 'timer.start',         'code' => 'workhub.timer.start',         'description' => 'Start and stop the work timer'],
            ['module' => 'workhub', 'action' => 'completion.submit',   'code' => 'workhub.completion.submit',   'description' => 'Submit done reports and capture signatures'],
            ['module' => 'workhub', 'action' => 'completion.approve',  'code' => 'workhub.completion.approve',  'description' => 'Review and approve completion records'],
            ['module' => 'workhub', 'action' => 'project.manage',      'code' => 'workhub.project.manage',      'description' => 'Create, edit, and archive WorkHub projects'],
            ['module' => 'workhub', 'action' => 'reports.view',        'code' => 'workhub.reports.view',        'description' => 'View WorkHub timesheets and reports'],
            ['module' => 'workhub', 'action' => 'reports.export',      'code' => 'workhub.reports.export',      'description' => 'Export PDFs: work orders, timesheets, invoices'],
            ['module' => 'workhub', 'action' => 'billing.view',        'code' => 'workhub.billing.view',        'description' => 'View WorkHub-generated invoices and billing data'],
            ['module' => 'workhub', 'action' => 'admin.manage',        'code' => 'workhub.admin.manage',        'description' => 'Manage WorkHub module settings and worker profiles'],
        ];

        $insertedRightIds = []; // code => id

        foreach ($rightsData as $right) {
            $existing = $db->table('rights')->where('code', $right['code'])->get()->getRow();
            if ($existing) {
                $insertedRightIds[$right['code']] = $existing->id;
                continue;
            }
            $db->table('rights')->insert($right);
            $insertedRightIds[$right['code']] = $db->insertID();
        }

        echo 'WorkHub rights: ' . count($insertedRightIds) . " upserted.\n";

        // 2. Assign ALL WorkHub rights to existing Admin roles
        //    (Admin = super_admin flag, catches all tenant admin roles)
        $adminRoles = $db->table('roles')->where('is_super_admin', 1)->get()->getResult();
        foreach ($adminRoles as $role) {
            foreach ($insertedRightIds as $rightId) {
                $alreadyLinked = $db->table('role_rights')
                    ->where('role_id', $role->id)
                    ->where('right_id', $rightId)
                    ->countAllResults();
                if (!$alreadyLinked) {
                    $db->table('role_rights')->insert([
                        'role_id'  => $role->id,
                        'right_id' => $rightId,
                    ]);
                }
            }
        }
        echo 'WorkHub rights assigned to ' . count($adminRoles) . " Admin role(s).\n";

        // 3. Create WorkHub-specific roles (per company type, if company_types table exists)
        //    These are created once per company_type so each tenant's RBAC setup can use them.
        $companyTypes = $db->table('company_types')->get()->getResult();
        if (empty($companyTypes)) {
            // Fallback: create roles without a company_type binding (company_type_id = NULL)
            $companyTypes = [(object)['id' => null]];
        }

        foreach ($companyTypes as $ct) {
            foreach (self::ROLE_PERMISSIONS as $roleName => $rights) {
                // Skip if this role already exists for this company_type
                $query = $db->table('roles')->where('name', $roleName);
                if ($ct->id !== null) {
                    $query->where('company_type_id', $ct->id);
                }
                $existing = $query->get()->getRow();

                if ($existing) {
                    $roleId = $existing->id;
                } else {
                    $db->table('roles')->insert([
                        'company_type_id' => $ct->id,
                        'name'            => $roleName,
                        'department'      => 'WorkHub',
                        'description'     => $roleName . ' — WorkHub field service module',
                        'is_super_admin'  => 0,
                    ]);
                    $roleId = $db->insertID();
                }

                // Assign the role's specific rights
                foreach ($rights as $rightCode) {
                    $rightId = $insertedRightIds[$rightCode] ?? null;
                    if (!$rightId) continue;

                    $alreadyLinked = $db->table('role_rights')
                        ->where('role_id', $roleId)
                        ->where('right_id', $rightId)
                        ->countAllResults();

                    if (!$alreadyLinked) {
                        $db->table('role_rights')->insert([
                            'role_id'  => $roleId,
                            'right_id' => $rightId,
                        ]);
                    }
                }
            }
        }

        echo "WorkHub roles created/updated for all company types.\n";
        echo "WorkHubRightsSeeder complete.\n";
    }
}
