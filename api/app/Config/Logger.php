<?php
namespace Config;

use CodeIgniter\Config\BaseConfig;

class Logger extends BaseConfig
{
    public $threshold = 9; // Full logging for debug
    public $handlers = [
        'CodeIgniter\Log\Handlers\FileHandler' => [
            'handles' => ['critical', 'error', 'emergency', 'debug', 'info', 'notice', 'warning'],
            'path'    => WRITEPATH . 'logs/',
        ],
    ];
}
