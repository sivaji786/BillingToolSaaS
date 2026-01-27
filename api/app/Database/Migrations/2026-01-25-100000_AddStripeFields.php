<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddStripeFields extends Migration
{
    public function up()
    {
        // Add stripe_customer_id to tenants if not exists
        if (!$this->db->fieldExists('stripe_customer_id', 'tenants')) {
            $this->forge->addColumn('tenants', [
                'stripe_customer_id' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => true,
                    'after'      => 'uuid'
                ],
            ]);
        }

        // Add stripe_subscription_id to subscriptions if not exists (safeguard)
        if (!$this->db->fieldExists('stripe_subscription_id', 'subscriptions')) {
            $this->forge->addColumn('subscriptions', [
                'stripe_subscription_id' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => true,
                    'after'      => 'plan_id'
                ],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('stripe_customer_id', 'tenants')) {
            $this->forge->dropColumn('tenants', 'stripe_customer_id');
        }
    }
}
