<?php

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;

/**
 * @internal
 */
final class ExampleDatabaseTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $migrate = false;
    protected $refresh = false;

    public function testModelFindAll(): void
    {
        $this->markTestSkipped('CI4 scaffold example — factories table not used in this project.');
    }

    public function testSoftDeleteLeavesRow(): void
    {
        $this->markTestSkipped('CI4 scaffold example — factories table not used in this project.');
    }
}
