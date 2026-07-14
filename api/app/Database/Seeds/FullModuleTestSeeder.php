<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Comprehensive module-level test seed for ALL application modules.
 *
 * Run AFTER MainSeeder. Fills gaps that MainSeeder leaves so every
 * Playwright API/E2E test suite has the data it needs.
 *
 * Modules covered:
 *   - Invoices       : draft, sent, overdue, cancelled statuses
 *   - Invoice Templates : default + custom templates for nexus.ai
 *   - Business Letters  : template_type='business_letter' rows
 *   - Buyers (CRM)      : already seeded by BuyerSeeder, augmented here
 *   - Tickets           : all priorities and statuses for nexus.ai
 *   - Audit Logs        : rich event trail for nexus.ai
 *   - Workspace Files   : folder/file metadata entries
 *   - Onboarding        : 'nexus' subdomain fixture for ONB-02
 *   - Admin Wiki Docs   : markdown files in docs/en/ + docs/de/
 *
 * Usage:
 *   php spark db:seed FullModuleTestSeeder
 */
class FullModuleTestSeeder extends Seeder
{
    /** nexus.ai is always tenant #1 after MainSeeder runs */
    private const NEXUS_SUBDOMAIN = 'nexus_ai';

    public function run()
    {
        $db = \Config\Database::connect();

        $tenant = $db->table('tenants')->where('subdomain', self::NEXUS_SUBDOMAIN)->get()->getRow();
        if (!$tenant) {
            echo "FullModuleTestSeeder: nexus_ai tenant not found — run MainSeeder first.\n";
            return;
        }
        $tid     = (int) $tenant->id;
        $manager = $db->table('users')->where('email', 'alex.rivera@nexus.ai')->get()->getRow();
        $worker  = $db->table('users')->where('email', 'mark.davis@nexus.ai')->get()->getRow();

        $db->query('SET FOREIGN_KEY_CHECKS=0');

        $this->seedInvoiceTemplates($db, $tid);
        $this->seedInvoicesAllStatuses($db, $tid, $manager);
        $this->seedBusinessLetters($db, $tid, $manager);
        $this->seedTicketsAllStatuses($db, $tid, $manager, $worker);
        $this->seedAuditLogs($db, $tid, $manager);
        $this->seedWorkspaceEntries($db, $tid, $manager);
        $this->seedOnboardingFixture($db);
        $this->seedAdminWikiDocs();
        $this->seedPersonalTestAccounts($db);

        $db->query('SET FOREIGN_KEY_CHECKS=1');
        echo "FullModuleTestSeeder complete — all modules seeded.\n";
    }

    // ── 1. Invoice Templates ─────────────────────────────────────────────────

    private function seedInvoiceTemplates($db, int $tid): void
    {
        $existing = $db->table('invoice_templates')->where('tenant_id', $tid)->countAllResults();
        if ($existing >= 2) {
            echo "  Invoice templates: already present, skipping.\n";
            return;
        }

        $now = date('Y-m-d H:i:s');
        $db->table('invoice_templates')->insertBatch([
            [
                'tenant_id'              => $tid,
                'name'                   => 'Standard Invoice',
                'description'            => 'Default template for all standard invoices',
                'default_currency'       => 'EUR',
                'default_tax_category'   => 'S',
                'default_tax_percent'    => 19.00,
                'default_payment_terms_json' => json_encode(['days' => 14, 'text' => 'Payment due within 14 days']),
                'header_text'            => 'Nexus Quantum AI — Invoice',
                'footer_text'            => 'Thank you for your business. VAT ID: DE123456789',
                'is_default'             => 1,
                'created_at'             => $now,
                'updated_at'             => $now,
            ],
            [
                'tenant_id'              => $tid,
                'name'                   => 'Premium Branded',
                'description'            => 'White-label branded template for enterprise clients',
                'default_currency'       => 'EUR',
                'default_tax_category'   => 'S',
                'default_tax_percent'    => 19.00,
                'default_payment_terms_json' => json_encode(['days' => 30, 'text' => 'Net 30 days']),
                'header_text'            => 'Nexus Quantum AI | Enterprise Division',
                'footer_text'            => 'Questions? billing@nexus.ai | +49 30 1234567',
                'is_default'             => 0,
                'created_at'             => $now,
                'updated_at'             => $now,
            ],
        ]);
        echo "  Invoice templates: 2 seeded.\n";
    }

    // ── 2. Invoices — all statuses ───────────────────────────────────────────

    private function seedInvoicesAllStatuses($db, int $tid, $manager): void
    {
        $existing = $db->table('invoices')
            ->where('tenant_id', $tid)
            ->where('template_type', 'invoice')
            ->countAllResults();

        if ($existing >= 8) {
            echo "  Invoices: already present, skipping.\n";
            return;
        }

        $now      = date('Y-m-d H:i:s');
        $invoices = [
            [
                'status'      => 'draft',
                'number'      => 'INV-DRAFT-001',
                'buyer'       => 'Acme Corporation',
                'amount'      => 1250.00,
                'issue_date'  => date('Y-m-d'),
                'due'         => date('Y-m-d', strtotime('+14 days')),
            ],
            [
                'status'      => 'sent',
                'number'      => 'INV-SENT-001',
                'buyer'       => 'Globex Corporation',
                'amount'      => 3400.00,
                'issue_date'  => date('Y-m-d', strtotime('-5 days')),
                'due'         => date('Y-m-d', strtotime('+9 days')),
            ],
            [
                'status'      => 'overdue',
                'number'      => 'INV-OVRD-001',
                'buyer'       => 'Cyberdyne Systems',
                'amount'      => 780.00,
                'issue_date'  => date('Y-m-d', strtotime('-45 days')),
                'due'         => date('Y-m-d', strtotime('-15 days')),
            ],
            [
                'status'      => 'cancelled',
                'number'      => 'INV-CANC-001',
                'buyer'       => 'Initech LLC',
                'amount'      => 500.00,
                'issue_date'  => date('Y-m-d', strtotime('-20 days')),
                'due'         => date('Y-m-d', strtotime('-6 days')),
            ],
            [
                'status'      => 'paid',
                'number'      => 'INV-PAID-001',
                'buyer'       => 'Umbrella Corp',
                'amount'      => 2100.00,
                'issue_date'  => date('Y-m-d', strtotime('-30 days')),
                'due'         => date('Y-m-d', strtotime('-16 days')),
            ],
        ];

        foreach ($invoices as $inv) {
            $net = $inv['amount'];
            $db->table('invoices')->insert([
                'tenant_id'               => $tid,
                'template_type'           => 'invoice',
                'invoice_number'          => $inv['number'],
                'issue_date'              => $inv['issue_date'],
                'due_date'                => $inv['due'],
                'status'                  => $inv['status'],
                'currency'                => 'EUR',
                'seller_name'             => 'Nexus Quantum AI',
                'buyer_name'              => $inv['buyer'],
                'line_extension_amount'   => $net,
                'tax_exclusive_amount'    => $net,
                'tax_inclusive_amount'    => round($net * 1.19, 2),
                'payable_amount'          => round($net * 1.19, 2),
                'created_at'              => $now,
                'updated_at'              => $now,
            ]);
            $invId = $db->insertID();

            $db->table('invoice_lines')->insert([
                'invoice_id'             => $invId,
                'description'            => 'Professional Services — ' . $inv['buyer'],
                'quantity'               => 1,
                'unit_price'             => $net,
                'line_extension_amount'  => $net,
                'tax_percent'            => 19.00,
                'created_at'             => $now,
            ]);
        }
        echo '  Invoices: ' . count($invoices) . " seeded (draft/sent/overdue/cancelled/paid).\n";
    }

    // ── 3. Business Letters ──────────────────────────────────────────────────

    private function seedBusinessLetters($db, int $tid, $manager): void
    {
        $existing = $db->table('invoices')
            ->where('tenant_id', $tid)
            ->where('template_type', 'business_letter')
            ->countAllResults();

        if ($existing >= 2) {
            echo "  Business letters: already present, skipping.\n";
            return;
        }

        $now = date('Y-m-d H:i:s');
        $letters = [
            [
                'number'     => 'LTR-2026-001',
                'recipient'  => 'Acme Corporation',
                'subject'    => 'Service Agreement Renewal Notice',
                'salutation' => 'Dear valued partner,',
                'body'       => '<p>We are pleased to inform you that our annual service agreement is due for renewal. Please review the attached terms and confirm your continuation by the date indicated.</p>',
                'closing'    => 'With kind regards,',
            ],
            [
                'number'     => 'LTR-2026-002',
                'recipient'  => 'Globex Corporation',
                'subject'    => 'Updated Payment Terms — Effective July 2026',
                'salutation' => 'Dear Finance Team,',
                'body'       => '<p>Please be advised that effective 1 July 2026, our standard payment terms will change from Net 30 to Net 14. This applies to all new invoices issued after this date.</p>',
                'closing'    => 'Best regards,',
            ],
        ];

        foreach ($letters as $ltr) {
            $db->table('invoices')->insert([
                'tenant_id'              => $tid,
                'template_type'          => 'business_letter',
                'invoice_number'         => $ltr['number'],
                'issue_date'             => date('Y-m-d'),
                'status'                 => 'sent',
                'currency'               => 'EUR',
                'seller_name'            => 'Nexus Quantum AI',
                'buyer_name'             => $ltr['recipient'],
                'salutation'             => $ltr['salutation'],
                'body'                   => $ltr['body'],
                'closing'                => $ltr['closing'],
                'line_extension_amount'  => 0,
                'tax_exclusive_amount'   => 0,
                'tax_inclusive_amount'   => 0,
                'payable_amount'         => 0,
                'created_at'             => $now,
                'updated_at'             => $now,
            ]);
        }
        echo '  Business letters: ' . count($letters) . " seeded.\n";
    }

    // ── 4. Tickets — all priorities and statuses ─────────────────────────────

    private function seedTicketsAllStatuses($db, int $tid, $manager, $worker): void
    {
        $existing = $db->table('tickets')
            ->where('tenant_id', $tid)
            ->countAllResults();

        if ($existing >= 6) {
            echo "  Tickets: already present, skipping.\n";
            return;
        }

        $now     = date('Y-m-d H:i:s');
        $uid     = $manager ? $manager->id : null;
        $tickets = [
            ['subject' => 'Login page unresponsive on mobile',    'type' => 'bug',     'priority' => 'high',     'status' => 'open'],
            ['subject' => 'Add CSV export to buyer directory',    'type' => 'feature', 'priority' => 'medium',   'status' => 'open'],
            ['subject' => 'Invoice PDF missing tax line',         'type' => 'bug',     'priority' => 'critical', 'status' => 'in_progress'],
            ['subject' => 'API rate limit documentation request', 'type' => 'support', 'priority' => 'low',      'status' => 'resolved'],
            ['subject' => 'Stripe webhook timeout',               'type' => 'bug',     'priority' => 'high',     'status' => 'resolved'],
            ['subject' => 'Dark mode flicker on dashboard',       'type' => 'bug',     'priority' => 'low',      'status' => 'open'],
        ];

        foreach ($tickets as $tkt) {
            $db->table('tickets')->insert([
                'tenant_id'   => $tid,
                'user_id'     => $uid,
                'subject'     => $tkt['subject'],
                'description' => 'Automated test ticket: ' . $tkt['subject'],
                'type'        => $tkt['type'],
                'priority'    => $tkt['priority'],
                'status'      => $tkt['status'],
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
        echo '  Tickets: ' . count($tickets) . " seeded (all types, priorities, statuses).\n";
    }

    // ── 5. Audit Logs ────────────────────────────────────────────────────────

    private function seedAuditLogs($db, int $tid, $manager): void
    {
        $existing = $db->table('audit_logs')
            ->where('tenant_id', $tid)
            ->countAllResults();

        if ($existing >= 10) {
            echo "  Audit logs: already present, skipping.\n";
            return;
        }

        $userName = $manager ? $manager->name : 'Alex Rivera';
        $now      = date('Y-m-d H:i:s');
        $entries  = [
            ['action' => 'User Login',               'details' => 'Successful login from 192.168.1.10',           'signed' => 0],
            ['action' => 'Invoice Issued & Signed',  'details' => 'INV-PAID-001 generated and signed',            'signed' => 1, 'invoice_number' => 'INV-PAID-001'],
            ['action' => 'Invoice Issued & Signed',  'details' => 'INV-SENT-001 sent to Globex Corporation',      'signed' => 1, 'invoice_number' => 'INV-SENT-001'],
            ['action' => 'Invoice Cancelled',        'details' => 'INV-CANC-001 cancelled by user',               'signed' => 0, 'invoice_number' => 'INV-CANC-001'],
            ['action' => 'Buyer Created',            'details' => 'New buyer: Acme Corporation added to CRM',     'signed' => 0],
            ['action' => 'Company Profile Updated',  'details' => 'Company address updated',                      'signed' => 0],
            ['action' => 'User Role Changed',        'details' => 'mark.davis@nexus.ai assigned Manager role',   'signed' => 0],
            ['action' => 'Password Changed',         'details' => 'Password updated via user settings',           'signed' => 0],
            ['action' => 'Subscription Upgraded',    'details' => 'Plan changed from Starter to Professional',    'signed' => 0],
            ['action' => 'Invoice Template Created', 'details' => 'New template: Premium Branded created',        'signed' => 0],
        ];

        foreach ($entries as $i => $entry) {
            $db->table('audit_logs')->insert([
                'tenant_id'      => $tid,
                'timestamp'      => date('Y-m-d H:i:s', strtotime("-{$i} hours")),
                'action'         => $entry['action'],
                'invoice_number' => $entry['invoice_number'] ?? null,
                'user'           => $userName,
                'details'        => $entry['details'],
                'signed'         => $entry['signed'],
            ]);
        }
        echo '  Audit logs: ' . count($entries) . " seeded.\n";
    }

    // ── 6. Workspace File Entries ────────────────────────────────────────────

    private function seedWorkspaceEntries($db, int $tid, $manager): void
    {
        if (!$db->tableExists('workspace_files')) {
            echo "  Workspace: table not found, skipping.\n";
            return;
        }

        $existing = $db->table('workspace_files')
            ->where('tenant_id', $tid)
            ->countAllResults();

        if ($existing >= 3) {
            echo "  Workspace: already present, skipping.\n";
            return;
        }

        $uid = $manager ? $manager->id : null;
        $now = date('Y-m-d H:i:s');

        $db->table('workspace_files')->insertBatch([
            [
                'tenant_id'     => $tid,
                'user_id'       => $uid,
                'name'          => 'Contracts',
                'original_name' => 'Contracts',
                'path'          => 'Contracts',
                'is_dir'        => 1,
                'mime_type'     => null,
                'size'          => 0,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'tenant_id'     => $tid,
                'user_id'       => $uid,
                'name'          => 'Reports',
                'original_name' => 'Reports',
                'path'          => 'Reports',
                'is_dir'        => 1,
                'mime_type'     => null,
                'size'          => 0,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'tenant_id'     => $tid,
                'user_id'       => $uid,
                'name'          => 'README.txt',
                'original_name' => 'README.txt',
                'path'          => 'README.txt',
                'is_dir'        => 0,
                'mime_type'     => 'text/plain',
                'size'          => 128,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
        ]);
        echo "  Workspace: 2 folders + 1 file seeded.\n";
    }

    // ── 7. Onboarding subdomain fixture ─────────────────────────────────────

    /**
     * ONB-02 checks that subdomain 'nexus' is already taken.
     * We register a minimal placeholder tenant for this.
     */
    private function seedOnboardingFixture($db): void
    {
        $existing = $db->table('tenants')->where('subdomain', 'nexus')->get()->getRow();
        if ($existing) {
            echo "  Onboarding fixture: 'nexus' subdomain already exists, skipping.\n";
            return;
        }

        $db->table('tenants')->insert([
            'uuid'         => '00000000-0000-4000-8000-000000000001',
            'company_name' => 'Nexus Demo (test fixture)',
            'subdomain'    => 'nexus',
            'plan_id'      => 1,
            'status'       => 'active',
            'created_at'   => date('Y-m-d H:i:s'),
        ]);
        echo "  Onboarding fixture: 'nexus' placeholder tenant created.\n";
    }

    // ── 8.5 Personal test accounts ───────────────────────────────────────────

    /**
     * Seeds tenant + admin accounts for medianet-home.de and digitalks.in so
     * the developer can log in to the test environment with their real email.
     */
    private function seedPersonalTestAccounts($db): void
    {
        $accounts = [
            [
                'tenant_name' => 'Medianet Home',
                'subdomain'   => 'medianet-home',
                'email'       => 'sivaji@medianet-home.de',
                'name'        => 'Sivaji K',
                'uuid'        => '00000000-0000-4000-8000-000000000010',
            ],
            [
                'tenant_name' => 'Digitalks',
                'subdomain'   => 'digitalks',
                'email'       => 'sivaji@digitalks.in',
                'name'        => 'Sivaji K',
                'uuid'        => '00000000-0000-4000-8000-000000000011',
            ],
        ];

        foreach ($accounts as $acct) {
            $tenant = $db->table('tenants')->where('subdomain', $acct['subdomain'])->get()->getRow();
            if (!$tenant) {
                $db->table('tenants')->insert([
                    'uuid'         => $acct['uuid'],
                    'company_name' => $acct['tenant_name'],
                    'subdomain'    => $acct['subdomain'],
                    'plan_id'      => 1,
                    'status'       => 'active',
                    'created_at'   => date('Y-m-d H:i:s'),
                ]);
                $tid = $db->insertID();
            } else {
                $tid = $tenant->id;
            }

            $user = $db->table('users')->where('email', $acct['email'])->get()->getRow();
            if (!$user) {
                $db->table('users')->insert([
                    'tenant_id'     => $tid,
                    'email'         => $acct['email'],
                    'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
                    'name'          => $acct['name'],
                    'role'          => 'admin',
                    'created_at'    => date('Y-m-d H:i:s'),
                ]);
                echo "  Personal test account: {$acct['email']} created.\n";
            } else {
                echo "  Personal test account: {$acct['email']} already exists, skipping.\n";
            }
        }
    }

    // ── 8. Admin Wiki markdown docs ──────────────────────────────────────────

    /**
     * AdminWiki is file-based (reads ROOTPATH/../docs/).
     * Create a minimal docs tree so GET /admin/wiki returns articles.
     */
    private function seedAdminWikiDocs(): void
    {
        // ROOTPATH = api/ so docs live at project root docs/
        $docsBase = realpath(ROOTPATH . '..') . DIRECTORY_SEPARATOR . 'docs';

        $articles = [
            'en' => [
                'getting-started.md' => "# Getting Started\n\nWelcome to the BillingTool admin wiki.\n\n## First Steps\n\n1. Log in with your admin credentials.\n2. Navigate to **Settings** to configure the platform.\n3. Create your first tenant via **Onboarding**.\n",
                'invoices.md'        => "# Invoice Management\n\nThis article covers invoice creation, editing, and PDF export.\n\n## Creating an Invoice\n\n1. Click **New Invoice** in the billing module.\n2. Fill in buyer details and line items.\n3. Click **Save & Send** to dispatch.\n",
                'workhub.md'         => "# WorkHub — Field Service\n\nManage field technicians, tasks, and timesheets.\n\n## Workers\n\nAdd workers under **WorkHub → Team**. Each worker needs an email and role.\n\n## Tasks\n\nCreate tasks from the **Board** view and assign them to workers.\n",
                'troubleshooting.md' => "# Troubleshooting\n\n## API returns 401\n\nYour JWT token has expired. Log out and log in again.\n\n## Email not delivered\n\nCheck SMTP settings in Admin → Settings → Email.\n",
            ],
            'de' => [
                'erste-schritte.md'  => "# Erste Schritte\n\nWillkommen im BillingTool Admin-Wiki.\n\n## Erste Schritte\n\n1. Melden Sie sich mit Ihren Admin-Zugangsdaten an.\n2. Navigieren Sie zu **Einstellungen**.\n",
                'rechnungen.md'      => "# Rechnungsverwaltung\n\nDieser Artikel behandelt Rechnungserstellung und PDF-Export.\n",
            ],
        ];

        $created = 0;
        foreach ($articles as $lang => $files) {
            $langDir = $docsBase . DIRECTORY_SEPARATOR . $lang;
            if (!is_dir($langDir)) {
                mkdir($langDir, 0755, true);
            }
            foreach ($files as $filename => $content) {
                $filePath = $langDir . DIRECTORY_SEPARATOR . $filename;
                if (!file_exists($filePath)) {
                    file_put_contents($filePath, $content);
                    $created++;
                }
            }
        }
        echo "  Admin wiki docs: {$created} markdown files created in docs/.\n";
    }
}
