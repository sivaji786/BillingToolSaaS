<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class CheckUsageLimits extends BaseCommand
{
    /**
     * The Command's Group
     *
     * @var string
     */
    protected $group = 'billing';

    /**
     * The Command's Name
     *
     * @var string
     */
    protected $name = 'usage:check';
    protected $description = 'Check all tenants for usage limit thresholds and send notifications.';
    protected $usage = 'usage:check';

    public function run(array $params)
    {
        CLI::write('Checking usage limits for all tenants...', 'yellow');
        $service = new \App\Services\UsageNotificationService();
        $service->checkAllTenants();
        CLI::write('Usage check complete.', 'green');
    }
}
