<?php

namespace App\Controllers;

use CodeIgniter\API\ResponseTrait;
use Config\Database as DBConfig;
use Config\Services;
use Exception;

class Database extends BaseController
{
    use ResponseTrait;

    /**
     * Run all pending migrations
     * URL: /database/migrate?token=YOUR_TOKEN
     */
    public function migrate()
    {
        if (!$this->verifyToken()) {
            return $this->failUnauthorized('Invalid migration token');
        }

        try {
            $runner = Services::migrations();
            $db     = db_connect();
            $forge  = DBConfig::forge($db);

            // All migration files on disk, keyed by UID
            $allMigrations = $runner->findMigrations();

            // Build a set of already-recorded UIDs from the history table
            $history  = $runner->getHistory('default');
            $doneUids = array_map(fn($h) => $runner->getObjectUid($h), (array) $history);

            // Pending = on disk but not yet in history table
            $pending = array_filter(
                $allMigrations,
                fn($m) => ! \in_array($runner->getObjectUid($m), $doneUids, true)
            );

            if (empty($pending)) {
                return $this->respond([
                    'status'  => 'info',
                    'message' => 'Database is already up to date. No pending migrations.',
                ]);
            }

            $batch   = $runner->getLastBatch() + 1;
            $ran     = [];   // ran cleanly
            $skipped = [];   // schema already applied — recorded and skipped
            $failed  = [];   // genuine errors

            foreach ($pending as $migration) {
                $label = $migration->version . '_' . $migration->name;

                try {
                    include_once $migration->path;

                    $class    = $migration->class;
                    $instance = new $class($forge);
                    $instance->up();

                    // Record in CI4's migrations history table
                    $db->table('migrations')->insert([
                        'version'   => $migration->version,
                        'class'     => $migration->class,
                        'group'     => 'default',
                        'namespace' => $migration->namespace,
                        'time'      => time(),
                        'batch'     => $batch,
                    ]);

                    $ran[] = $label;

                } catch (\Throwable $e) {
                    $msg = $e->getMessage();

                    // MySQL/MariaDB errors that mean the schema is already in place:
                    // 1060 = Duplicate column name
                    // 1050 = Table already exists
                    // 1091 = Can't DROP; check that column/key exists
                    $alreadyApplied = (bool) preg_match(
                        '/duplicate column|already exists|1060|1050|1091/i',
                        $msg
                    );

                    if ($alreadyApplied) {
                        // Schema is already there — just record it as done so it won't run again
                        $db->table('migrations')->insert([
                            'version'   => $migration->version,
                            'class'     => $migration->class,
                            'group'     => 'default',
                            'namespace' => $migration->namespace,
                            'time'      => time(),
                            'batch'     => $batch,
                        ]);
                        $skipped[] = $label . ' (schema already applied — recorded)';
                    } else {
                        // Real error — report but keep going so other migrations still run
                        $failed[] = $label . ': ' . $msg;
                    }
                }
            }

            $httpStatus = empty($failed) ? 200 : 207; // 207 = partial success
            return $this->respond([
                'status'  => empty($failed) ? 'success' : 'partial',
                'message' => \sprintf(
                    '%d ran, %d already-applied (skipped), %d failed.',
                    \count($ran), \count($skipped), \count($failed)
                ),
                'ran'     => $ran,
                'skipped' => $skipped,
                'failed'  => $failed,
            ], $httpStatus);

        } catch (Exception $e) {
            return $this->failServerError('Migration runner error: ' . $e->getMessage());
        }
    }

    /**
     * Run database seeders
     * URL: /database/seed?token=YOUR_TOKEN&class=SeederName
     */
    public function seed()
    {
        if (!$this->verifyToken()) {
            return $this->failUnauthorized('Invalid migration token');
        }

        $seeder = DBConfig::seeder();
        $class = $this->request->getGet('class') ?? 'DatabaseSeeder';

        try {
            $seeder->call($class);
            return $this->respond([
                'status' => 'success',
                'message' => "Seeder '$class' ran successfully."
            ]);
        } catch (Exception $e) {
            return $this->failServerError('Seeding failed: ' . $e->getMessage());
        }
    }

    /**
     * Verify the migration token against environment variable or admin session
     */
    private function verifyToken(): bool
    {
        // 1. Check for token in URL
        $token = $this->request->getGet('token');
        $expectedToken = getenv('MIGRATION_TOKEN') ?: 'debug_token_123';
        
        if (!empty($token) && $token === $expectedToken) {
            return true;
        }

        // 2. Check for authenticated admin user
        $authHeader = $this->request->getHeaderLine('Authorization');
        if ($authHeader) {
            $jwtoken = str_replace('Bearer ', '', $authHeader);
            try {
                $key = getenv('JWT_SECRET') ?: 'your-secret-key-change-this-in-production';
                $decoded = \Firebase\JWT\JWT::decode($jwtoken, new \Firebase\JWT\Key($key, 'HS256'));
                
                if (isset($decoded->data->role) && $decoded->data->role === 'super_admin') {
                    return true;
                }
            } catch (Exception $e) {
                // Invalid token — do not expose decode failure details
            }
        }

        return false;
    }
}
