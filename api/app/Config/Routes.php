<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Test routes
$routes->get('test', '\App\Controllers\Test::index');
$routes->get('test/verify', '\App\Controllers\Test::verify');
$routes->get('test/database', '\App\Controllers\Test::database');

$routes->post('auth/login', '\App\Controllers\AuthController::login');
$routes->get('auth/me', '\App\Controllers\AuthController::me');

// Invoices Group
$routes->group('invoices', ['filter' => 'rbac:invoices.read'], function($routes) {
    $routes->get('', '\App\Controllers\InvoiceController::index');
    $routes->get('(:segment)', '\App\Controllers\InvoiceController::show/$1');
});
$routes->group('invoices', ['filter' => 'rbac:invoices.create'], function($routes) {
    $routes->post('', '\App\Controllers\InvoiceController::create');
});
$routes->group('invoices', ['filter' => 'rbac:invoices.update'], function($routes) {
    $routes->put('(:segment)', '\App\Controllers\InvoiceController::update/$1');
});
$routes->group('invoices', ['filter' => 'rbac:invoices.delete'], function($routes) {
    $routes->delete('(:segment)', '\App\Controllers\InvoiceController::delete/$1');
});

// Invoice Templates
$routes->group('invoice-templates', ['filter' => 'rbac:company_profiles.read'], function($routes) {
    $routes->get('', '\App\Controllers\InvoiceTemplateController::index');
    $routes->get('(:segment)', '\App\Controllers\InvoiceTemplateController::show/$1');
});
$routes->group('invoice-templates', ['filter' => 'rbac:company_profiles.update'], function($routes) {
    $routes->post('', '\App\Controllers\InvoiceTemplateController::create');
    $routes->put('(:segment)', '\App\Controllers\InvoiceTemplateController::update/$1');
    $routes->delete('(:segment)', '\App\Controllers\InvoiceTemplateController::delete/$1');
});

// Company Profiles
$routes->get('company-profiles', '\App\Controllers\CompanyProfileController::index', ['filter' => 'rbac:company_profiles.read']);
$routes->put('company-profiles/(:segment)', '\App\Controllers\CompanyProfileController::update/$1', ['filter' => 'rbac:company_profiles.update']);

$routes->group('company-types', ['filter' => 'rbac:roles.manage'], function($routes) {
    $routes->get('', '\App\Controllers\CompanyTypeController::index'); // Anyone with roles.manage can view (or maybe general read?) - sticking to manage for now as per plan
    $routes->post('', '\App\Controllers\CompanyTypeController::create');
    $routes->put('(:segment)', '\App\Controllers\CompanyTypeController::update/$1');
    $routes->delete('(:segment)', '\App\Controllers\CompanyTypeController::delete/$1');
});

// Audit Logs
$routes->get('audit-logs', '\App\Controllers\AuditLogController::index', ['filter' => 'rbac:audit_logs.read']);

// AI Invoice Assistant
$routes->post('ai/parse-invoice', '\\App\\Controllers\\AIInvoiceController::parseInvoice', ['filter' => 'rbac:invoices.create']);

// Tickets
$routes->get('tickets', '\App\Controllers\TicketController::index', ['filter' => 'rbac:tickets.read']);
$routes->post('tickets', '\App\Controllers\TicketController::create', ['filter' => 'rbac:tickets.create']);

// Admin Routes
$routes->group('roles', ['filter' => 'rbac:roles.manage'], function($routes) {
    $routes->get('', '\App\Controllers\RoleController::index');
    $routes->get('(:segment)', '\App\Controllers\RoleController::show/$1');
    $routes->post('', '\App\Controllers\RoleController::create');
    $routes->put('(:segment)', '\App\Controllers\RoleController::update/$1');
    $routes->delete('(:segment)', '\App\Controllers\RoleController::delete/$1');
});

$routes->group('rights', ['filter' => 'rbac:roles.manage'], function($routes) {
    $routes->get('', '\App\Controllers\RightController::index');
});

$routes->group('users', ['filter' => 'rbac:users.manage'], function($routes) {
    $routes->get('', '\App\Controllers\UserController::index');
    $routes->post('', '\App\Controllers\UserController::create');
    $routes->put('(:segment)', '\App\Controllers\UserController::update/$1');
});



$routes->options('(:any)', 'Cors::options');
