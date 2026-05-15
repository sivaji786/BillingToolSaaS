<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class MarkOverdueInvoices extends BaseCommand
{
    protected $group       = 'Invoices';
    protected $name        = 'invoices:mark-overdue';
    protected $description = 'Transitions sent invoices past their due_date to overdue status.';

    public function run(array $params)
    {
        $db      = \Config\Database::connect();
        $today   = date('Y-m-d');

        $affected = $db->table('invoices')
            ->set('status', 'overdue')
            ->where('status', 'sent')
            ->where('due_date <', $today)
            ->whereNotNull('due_date')
            ->update();

        $count = $db->affectedRows();
        CLI::write("Marked {$count} invoice(s) as overdue (due before {$today}).", 'green');
    }
}
