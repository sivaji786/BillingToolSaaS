<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Test routes
$routes->get('test', '\App\Controllers\Test::index');
$routes->get('test/verify', '\App\Controllers\Test::verify');
$routes->get('test/database', '\App\Controllers\Test::database');
$routes->get('debug/users', '\App\Controllers\Debug::users');
$routes->get('debug/roles', '\App\Controllers\Debug::roles');
$routes->get('debug/find-role', '\App\Controllers\Debug::findRole');
$routes->get('debug/schema', '\App\Controllers\Debug::schema');
$routes->get('database/migrate', '\App\Controllers\Database::migrate');
$routes->get('database/seed', '\App\Controllers\Database::seed');




// Customer Authentication API
$routes->post('api/auth/signup', '\App\Controllers\Auth::signup');
$routes->post('api/auth/login', '\App\Controllers\Auth::login');
$routes->post('api/auth/logout', '\App\Controllers\Auth::logout');
$routes->post('api/auth/refresh', '\App\Controllers\Auth::refresh');
$routes->get('api/auth/me', '\App\Controllers\Auth::me');

$routes->get('billing/plans', '\App\Controllers\Billing::plans');
$routes->group('billing', ['filter' => 'hybridauth'], function($routes) {
    $routes->get('subscription', '\App\Controllers\Billing::subscription');
    $routes->post('upgrade', '\App\Controllers\Billing::upgrade');
    $routes->get('history', '\App\Controllers\Billing::history');
});

// SaaS Onboarding
$routes->get('api/countries', '\App\Controllers\CountryController::index');
$routes->group('onboarding', function($routes) {
    $routes->get('check-subdomain', '\App\Controllers\Onboarding::checkSubdomain');
    $routes->post('signup', '\App\Controllers\Onboarding::signup');
});

// Invoices Group (supports both JWT and session auth)
$routes->group('invoices', ['filter' => ['hybridauth', 'rbac:invoices.read']], function($routes) {
    $routes->get('', '\App\Controllers\InvoiceController::index');
    $routes->get('(:segment)', '\App\Controllers\InvoiceController::show/$1');
});
$routes->group('invoices', ['filter' => ['hybridauth', 'rbac:invoices.create']], function($routes) {
    $routes->post('', '\App\Controllers\InvoiceController::create');
});
$routes->group('invoices', ['filter' => ['hybridauth', 'rbac:invoices.update']], function($routes) {
    $routes->put('(:segment)', '\App\Controllers\InvoiceController::update/$1');
});
$routes->group('invoices', ['filter' => ['hybridauth', 'rbac:invoices.delete']], function($routes) {
    $routes->delete('(:segment)', '\App\Controllers\InvoiceController::delete/$1');
});


// Invoice Templates (supports both JWT and session auth)
$routes->group('invoice-templates', ['filter' => ['hybridauth', 'rbac:company_profiles.read']], function($routes) {
    $routes->get('', '\App\Controllers\InvoiceTemplateController::index');
    $routes->get('(:segment)', '\App\Controllers\InvoiceTemplateController::show/$1');
});
$routes->group('invoice-templates', ['filter' => ['hybridauth', 'rbac:company_profiles.update']], function($routes) {
    $routes->post('', '\App\Controllers\InvoiceTemplateController::create');
    $routes->put('(:segment)', '\App\Controllers\InvoiceTemplateController::update/$1');
    $routes->delete('(:segment)', '\App\Controllers\InvoiceTemplateController::delete/$1');
});

// Company Profiles (supports both JWT and session auth)
$routes->get('company-profiles', '\App\Controllers\CompanyProfileController::index', ['filter' => ['hybridauth', 'rbac:company_profiles.read']]);
$routes->put('company-profiles/(:segment)', '\App\Controllers\CompanyProfileController::update/$1', ['filter' => ['hybridauth', 'rbac:company_profiles.update']]);

$routes->group('company-types', ['filter' => 'rbac:company_profiles.read'], function($routes) {
    $routes->get('', '\App\Controllers\CompanyTypeController::index'); // Changed to company_profiles.read for wider access
    $routes->post('', '\App\Controllers\CompanyTypeController::create');
    $routes->put('(:segment)', '\App\Controllers\CompanyTypeController::update/$1');
    $routes->delete('(:segment)', '\App\Controllers\CompanyTypeController::delete/$1');
});

// Audit Logs (supports both JWT and session auth)
$routes->get('audit-logs', '\App\Controllers\AuditLogController::index', ['filter' => ['hybridauth', 'rbac:audit_logs.read']]);

// AI Invoice Assistant
$routes->post('ai/parse-invoice', '\App\Controllers\AIInvoiceController::parseInvoice', ['filter' => 'rbac:invoices.create']);

// Tickets
$routes->get('tickets', '\App\Controllers\TicketController::index', ['filter' => 'rbac:tickets.read']);
$routes->post('tickets', '\App\Controllers\TicketController::create', ['filter' => 'rbac:tickets.create']);

// Audit Logs
$routes->group('audit-logs', ['filter' => 'rbac:audit_logs.read'], function($routes) {
    $routes->get('', '\App\Controllers\AuditLogs::index');
    $routes->get('(:segment)', '\App\Controllers\AuditLogs::show/$1');
});

// Customer Authentication (No auth required)
$routes->group('auth', function($routes) {
    $routes->post('signup', '\App\Controllers\Auth::signup');
    $routes->post('login', '\App\Controllers\Auth::login');
    $routes->post('logout', '\App\Controllers\Auth::logout');
    $routes->post('refresh', '\App\Controllers\Auth::refresh');
    $routes->get('me', '\App\Controllers\Auth::me');
});

// Customer Portal API Routes (requires authentication)
$routes->group('customer', ['filter' => 'hybridauth'], function($routes) {
    $routes->get('dashboard', '\App\Controllers\Customer::dashboard');
    $routes->get('invoices', '\App\Controllers\Customer::invoices');
    $routes->get('invoices/(:segment)', '\App\Controllers\Customer::invoice/$1');
    $routes->get('subscription', '\App\Controllers\Customer::subscription');
    $routes->put('profile', '\App\Controllers\Customer::updateProfile');
    $routes->get('usage', '\App\Controllers\Customer::usage');
});

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

// CORS preflight - must be BEFORE other routes
$routes->options('(:any)', 'Cors::options');

$routes->post('webhooks/stripe', '\App\Controllers\Webhooks::stripe');

// Admin Portal API Routes
$routes->group('admin', function($routes) {
    // Admin Authentication (no auth filter) - Uses AdminAuth for admin login (supports demo credentials)
    $routes->post('auth/login', '\App\Controllers\AdminAuth::login');
    $routes->get('auth/me', '\App\Controllers\AdminAuth::me');
    $routes->post('auth/logout', '\App\Controllers\AdminAuth::logout');
    $routes->post('auth/refresh', '\App\Controllers\AdminAuth::refresh');
    
    // Admin Packages
    $routes->get('packages', '\App\Controllers\AdminPackages::index');
    $routes->get('packages/(:segment)', '\App\Controllers\AdminPackages::show/$1');
    $routes->post('packages', '\App\Controllers\AdminPackages::create');
    $routes->put('packages/(:segment)', '\App\Controllers\AdminPackages::update/$1');
    $routes->delete('packages/(:segment)', '\App\Controllers\AdminPackages::delete/$1');
    
    
    // Admin Users
    $routes->get('users', '\App\Controllers\AdminUsers::index');
    $routes->get('users/export', '\App\Controllers\AdminUsers::export');
    $routes->get('users/(:segment)', '\App\Controllers\AdminUsers::show/$1');
    $routes->post('users/(:segment)/suspend', '\App\Controllers\AdminUsers::suspend/$1');
    $routes->post('users/(:segment)/activate', '\App\Controllers\AdminUsers::activate/$1');
    $routes->post('users/(:segment)/upgrade', '\App\Controllers\AdminUsers::upgrade/$1');
    
    // Admin Billing
    $routes->get('invoices', '\App\Controllers\AdminBilling::index');
    $routes->get('invoices/(:segment)', '\App\Controllers\AdminBilling::show/$1');
    $routes->get('invoices/(:segment)/pdf', '\App\Controllers\AdminBilling::downloadPdf/$1');
    $routes->get('revenue', '\App\Controllers\AdminBilling::revenue');
    
    // Admin Analytics
    $routes->get('analytics/dashboard', '\App\Controllers\AdminAnalytics::dashboard');
    $routes->get('usage', '\App\Controllers\AdminAnalytics::usage');
    $routes->get('usage/export', '\App\Controllers\AdminAnalytics::exportUsage');
});

$routes->get('debug/model-check', 'Debug::modelCheck');


