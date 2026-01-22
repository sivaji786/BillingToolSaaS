<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMoreIndexes extends Migration
{
    public function up()
    {
        // Add index on tenants.subdomain for faster lookup during tenant identification
        $indexes = $this->db->getIndexData('tenants');
        $indexNames = array_column($indexes, 'name');
        if (!in_array('idx_tenants_subdomain', $indexNames)) {
            $this->db->query("ALTER TABLE `tenants` ADD INDEX `idx_tenants_subdomain` (`subdomain`) ");
        }

        // Add index on subscriptions.tenant_id to speed up billing checks
        $indexes = $this->db->getIndexData('subscriptions');
        $indexNames = array_column($indexes, 'name');
        if (!in_array('idx_subscriptions_tenant', $indexNames)) {
            $this->db->query("ALTER TABLE `subscriptions` ADD INDEX `idx_subscriptions_tenant` (`tenant_id`) ");
        }

        // Add index on invoices.tenant_id for multi-tenant filtering
        $indexes = $this->db->getIndexData('invoices');
        $indexNames = array_column($indexes, 'name');
        if (!in_array('idx_invoices_tenant', $indexNames)) {
            $this->db->query("ALTER TABLE `invoices` ADD INDEX `idx_invoices_tenant` (`tenant_id`) ");
        }
    }

    public function down()
    {
        $this->db->query("ALTER TABLE `tenants` DROP INDEX `idx_tenants_slug` ");
        $this->db->query("ALTER TABLE `subscriptions` DROP INDEX `idx_subscriptions_tenant` ");
        $this->db->query("ALTER TABLE `invoices` DROP INDEX `idx_invoices_tenant` ");
    }
}
