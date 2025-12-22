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

$routes->get('invoices', '\App\Controllers\InvoiceController::index');
$routes->post('invoices', '\App\Controllers\InvoiceController::create');
$routes->get('invoices/(:segment)', '\App\Controllers\InvoiceController::show/$1');
$routes->put('invoices/(:segment)', '\App\Controllers\InvoiceController::update/$1');
$routes->delete('invoices/(:segment)', '\App\Controllers\InvoiceController::delete/$1');

$routes->get('invoice-templates', '\App\Controllers\InvoiceTemplateController::index');
$routes->get('invoice-templates/(:segment)', '\App\Controllers\InvoiceTemplateController::show/$1');
$routes->post('invoice-templates', '\App\Controllers\InvoiceTemplateController::create');
$routes->put('invoice-templates/(:segment)', '\App\Controllers\InvoiceTemplateController::update/$1');
$routes->delete('invoice-templates/(:segment)', '\App\Controllers\InvoiceTemplateController::delete/$1');
$routes->get('company-profiles', '\App\Controllers\CompanyProfileController::index');
$routes->put('company-profiles/(:segment)', '\App\Controllers\CompanyProfileController::update/$1');
$routes->get('audit-logs', '\App\Controllers\AuditLogController::index');

$routes->get('tickets', '\App\Controllers\TicketController::index');
$routes->post('tickets', '\App\Controllers\TicketController::create');



$routes->options('(:any)', 'Cors::options');
