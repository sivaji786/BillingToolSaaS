<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddIsTrailingToPlans extends Migration
{
    public function up()
    {
        $fields = [
            'is_trailing' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'after'      => 'is_active'
            ],
        ];
        $this->forge->addColumn('plans', $fields);
        
        // Mark the first free plan (price 0) as trailing if exists, 
        // otherwise just the first plan to ensure we have a default.
        $db = \Config\Database::connect();
        $freePlan = $db->table('plans')->where('price', 0)->get()->getRow();
        if ($freePlan) {
            $db->table('plans')->where('id', $freePlan->id)->update(['is_trailing' => 1]);
        } else {
            $firstPlan = $db->table('plans')->limit(1)->get()->getRow();
            if ($firstPlan) {
                $db->table('plans')->where('id', $firstPlan->id)->update(['is_trailing' => 1]);
            }
        }
    }

    public function down()
    {
        $this->forge->dropColumn('plans', 'is_trailing');
    }
}
