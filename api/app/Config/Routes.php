<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Database Management
$routes->get('database/migrate', '\App\Controllers\Database::migrate');
$routes->get('database/seed', '\App\Controllers\Database::seed');

$routes->get('billing/plans', '\App\Controllers\Billing::plans');
$routes->get('billing/package-services', '\App\Controllers\Billing::packageServices');
$routes->group('billing', ['filter' => 'auth'], function($routes) {
    $routes->get('subscription', '\App\Controllers\Billing::subscription');
    $routes->post('upgrade', '\App\Controllers\Billing::upgrade');
    $routes->get('history', '\App\Controllers\Billing::history');
});

// SaaS Onboarding
$routes->get('api/countries', '\App\Controllers\CountryController::index');
$routes->get('api/public/cms/nav', '\App\Controllers\CmsController::nav');
$routes->get('api/public/cms/(:segment)', '\App\Controllers\CmsController::getPage/$1');
$routes->get('api/public/invoices/(:segment)', '\App\Controllers\InvoiceController::showByToken/$1');
$routes->group('onboarding', function($routes) {
    $routes->get('check-subdomain', '\App\Controllers\Onboarding::checkSubdomain');
    $routes->post('signup', '\App\Controllers\Onboarding::signup');
    $routes->post('verify-email', '\App\Controllers\Onboarding::verifyEmail');
    $routes->post('resend-verification', '\App\Controllers\Onboarding::resendVerification');
});

// Invoices Group (supports both JWT and session auth)
$routes->group('invoices', ['filter' => ['auth', 'rbac:invoices.read']], function($routes) {
    $routes->get('', '\App\Controllers\InvoiceController::index');
    $routes->get('(:segment)', '\App\Controllers\InvoiceController::show/$1');
});
$routes->group('invoices', ['filter' => ['auth', 'rbac:invoices.create']], function($routes) {
    $routes->post('', '\App\Controllers\InvoiceController::create');
});
$routes->group('invoices', ['filter' => ['auth', 'rbac:invoices.update']], function($routes) {
    $routes->put('(:segment)', '\App\Controllers\InvoiceController::update/$1');
});
$routes->group('invoices', ['filter' => ['auth', 'rbac:invoices.delete']], function($routes) {
    $routes->delete('(:segment)', '\App\Controllers\InvoiceController::delete/$1');
});
$routes->group('invoices', ['filter' => ['auth', 'rbac:invoices.read']], function($routes) {
    $routes->post('(:segment)/share', '\App\Controllers\InvoiceController::generateShareToken/$1');
});


// Business Letters
$routes->group('letters', ['filter' => ['auth', 'rbac:invoices.read']], function($routes) {
    $routes->get('', '\App\Controllers\BusinessLetterController::index');
    $routes->get('(:segment)', '\App\Controllers\BusinessLetterController::show/$1');
});
$routes->group('letters', ['filter' => ['auth', 'rbac:invoices.create']], function($routes) {
    $routes->post('', '\App\Controllers\BusinessLetterController::create');
});
$routes->group('letters', ['filter' => ['auth', 'rbac:invoices.update']], function($routes) {
    $routes->put('(:segment)', '\App\Controllers\BusinessLetterController::update/$1');
});
$routes->group('letters', ['filter' => ['auth', 'rbac:invoices.delete']], function($routes) {
    $routes->delete('(:segment)', '\App\Controllers\BusinessLetterController::delete/$1');
});

// Invoice Templates (supports both JWT and session auth)
$routes->group('invoice-templates', ['filter' => ['auth', 'rbac:company_profiles.read']], function($routes) {
    $routes->get('', '\App\Controllers\InvoiceTemplateController::index');
    $routes->get('(:segment)', '\App\Controllers\InvoiceTemplateController::show/$1');
});
$routes->group('invoice-templates', ['filter' => ['auth', 'rbac:company_profiles.update']], function($routes) {
    $routes->post('', '\App\Controllers\InvoiceTemplateController::create');
    $routes->put('(:segment)', '\App\Controllers\InvoiceTemplateController::update/$1');
    $routes->delete('(:segment)', '\App\Controllers\InvoiceTemplateController::delete/$1');
});

// Company Profiles (supports both JWT and session auth)
$routes->get('company-profiles', '\App\Controllers\CompanyProfileController::index', ['filter' => ['auth', 'rbac:company_profiles.read']]);
$routes->put('company-profiles/(:segment)', '\App\Controllers\CompanyProfileController::update/$1', ['filter' => ['auth', 'rbac:company_profiles.update']]);

$routes->group('company-types', ['filter' => 'rbac:company_profiles.read'], function($routes) {
    $routes->get('', '\App\Controllers\CompanyTypeController::index'); // Changed to company_profiles.read for wider access
    $routes->post('', '\App\Controllers\CompanyTypeController::create');
    $routes->put('(:segment)', '\App\Controllers\CompanyTypeController::update/$1');
    $routes->delete('(:segment)', '\App\Controllers\CompanyTypeController::delete/$1');
});

// Audit Logs (supports both JWT and session auth)
$routes->get('audit-logs', '\App\Controllers\AuditLogController::index', ['filter' => ['auth', 'rbac:audit_logs.read']]);

// AI Invoice Assistant
$routes->post('ai/parse-invoice', '\App\Controllers\AIInvoiceController::parseInvoice', ['filter' => 'rbac:invoices.create']);
$routes->post('ai/improve-letter-body', '\App\Controllers\AIInvoiceController::improveLetterBody', ['filter' => 'rbac:invoices.create']);

// Buyers Directory
$routes->group('buyers', ['filter' => ['auth', 'rbac:buyers.read']], function($routes) {
    $routes->get('', '\App\Controllers\BuyerController::index');
    $routes->get('export', '\App\Controllers\BuyerController::export');
    $routes->get('(:segment)', '\App\Controllers\BuyerController::show/$1');
});
$routes->group('buyers', ['filter' => ['auth', 'rbac:buyers.create']], function($routes) {
    $routes->post('', '\App\Controllers\BuyerController::create');
    $routes->post('import', '\App\Controllers\BuyerController::import');
});
$routes->group('buyers', ['filter' => ['auth', 'rbac:buyers.update']], function($routes) {
    $routes->put('(:segment)', '\App\Controllers\BuyerController::update/$1');
});
$routes->group('buyers', ['filter' => ['auth', 'rbac:buyers.delete']], function($routes) {
    $routes->delete('(:segment)', '\App\Controllers\BuyerController::delete/$1');
});

// Tickets
$routes->post('tickets', '\App\Controllers\TicketController::create');

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
    $routes->post('forgot-password', '\App\Controllers\Auth::forgotPassword');
    $routes->post('reset-password', '\App\Controllers\Auth::resetPassword');

    // Quick Access – OTP-based frictionless onboarding
    $routes->post('check-email', '\App\Controllers\QuickAccessAuth::checkEmail');
    $routes->post('quick-access', '\App\Controllers\QuickAccessAuth::sendOtp');
    $routes->get('quick-access/draft', '\App\Controllers\QuickAccessAuth::getDraft');
    $routes->post('quick-access/verify', '\App\Controllers\QuickAccessAuth::verifyOtp');
});

// Profile Management (requires auth)
$routes->group('profile', ['filter' => 'auth'], function($routes) {
    $routes->post('set-password', '\App\Controllers\ProfileController::setPassword');
});
// Customer Portal API Routes (requires authentication)
$routes->group('customer', ['filter' => 'auth'], function($routes) {
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

// Workspace Filesystem
$routes->group('workspace', ['filter' => 'auth'], function($routes) {
    // Read operations
    $routes->group('', ['filter' => 'rbac:workspace.read'], function($routes) {
        $routes->get('list', '\App\Controllers\WorkspaceController::list');
        $routes->get('download', '\App\Controllers\WorkspaceController::download');
        $routes->get('search', '\App\Controllers\WorkspaceController::search');
        $routes->get('ai-history', '\App\Controllers\WorkspaceController::getAiHistory');
    });

    // Create operations
    $routes->group('', ['filter' => 'rbac:workspace.create'], function($routes) {
        $routes->post('upload', '\App\Controllers\WorkspaceController::upload');
        $routes->post('mkdir', '\App\Controllers\WorkspaceController::mkdir');
        $routes->post('extract-zip', '\App\Controllers\WorkspaceController::extractZip');
    });

    // Update operations
    $routes->group('', ['filter' => 'rbac:workspace.update'], function($routes) {
        $routes->post('rename', '\App\Controllers\WorkspaceController::rename');
    });

    // Delete operations
    $routes->group('', ['filter' => 'rbac:workspace.delete'], function($routes) {
        $routes->post('delete', '\App\Controllers\WorkspaceController::delete');
    });

    // AI operations
    $routes->group('', ['filter' => 'rbac:workspace.ai'], function($routes) {
        $routes->post('ai-search', '\App\Controllers\WorkspaceController::aiSearch');
    });

    // Open (Local xdg-open) - treating as read for now
    $routes->post('open', '\App\Controllers\WorkspaceController::open', ['filter' => 'rbac:workspace.read']);
    
    // Download multiple as zip - read access
    $routes->post('download-zip', '\App\Controllers\WorkspaceController::downloadZip', ['filter' => 'rbac:workspace.read']);

    $routes->get('ping', function() { return 'pong'; });
});

// CORS preflight - must be BEFORE other routes
$routes->options('(:any)', 'Cors::options');

$routes->post('webhooks/stripe', '\App\Controllers\Webhooks::stripe');

// Admin Portal API Routes
$routes->group('admin', ['filter' => 'auth'], function($routes) {
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
    
    // Admin Package Services
    $routes->get('package-services', '\App\Controllers\AdminPackageServices::index');
    $routes->post('package-services', '\App\Controllers\AdminPackageServices::create');
    $routes->put('package-services/(:segment)', '\App\Controllers\AdminPackageServices::update/$1');
    $routes->delete('package-services/(:segment)', '\App\Controllers\AdminPackageServices::delete/$1');
    
    
    // Admin Users
    $routes->get('users', '\App\Controllers\AdminUsers::index');
    $routes->get('users/export', '\App\Controllers\AdminUsers::export');
    $routes->get('users/(:segment)', '\App\Controllers\AdminUsers::show/$1');
    $routes->post('users/(:segment)/suspend', '\App\Controllers\AdminUsers::suspend/$1');
    $routes->post('users/(:segment)/activate', '\App\Controllers\AdminUsers::activate/$1');
    $routes->post('users/(:segment)/upgrade', '\App\Controllers\AdminUsers::upgrade/$1');
    $routes->post('users/(:segment)/reset-password', '\App\Controllers\AdminUsers::resetPassword/$1');
    
    // Admin Billing
    $routes->get('invoices', '\App\Controllers\AdminBilling::index');
    $routes->post('invoices', '\App\Controllers\AdminBilling::create');
    $routes->get('invoices/(:segment)', '\App\Controllers\AdminBilling::show/$1');
    $routes->get('invoices/(:segment)/pdf', '\App\Controllers\AdminBilling::downloadPdf/$1');
    $routes->get('revenue', '\App\Controllers\AdminBilling::revenue');
    
    // Admin Analytics
    $routes->get('analytics/dashboard', '\App\Controllers\AdminAnalytics::dashboard');
    $routes->get('analytics/tenants', '\App\Controllers\AdminAnalytics::tenantUsage');
    $routes->get('usage', '\App\Controllers\AdminAnalytics::usage');
    $routes->get('usage/export', '\App\Controllers\AdminAnalytics::exportUsage');

    // Database Management
    $routes->get('database/migrate', '\App\Controllers\Database::migrate');
    $routes->get('database/seed', '\App\Controllers\Database::seed');

    // Admin Settings
    $routes->get('settings', '\App\Controllers\AdminSettings::index');
    $routes->put('settings/profile', '\App\Controllers\AdminSettings::updateProfile');
    $routes->post('settings/password', '\App\Controllers\AdminSettings::changePassword');
    $routes->post('settings/api-keys', '\App\Controllers\AdminSettings::generateApiKey');
    $routes->delete('settings/api-keys/(:segment)', '\App\Controllers\AdminSettings::revokeApiKey/$1');
    $routes->put('settings/system', '\App\Controllers\AdminSettings::updateSystemSettings');
    $routes->post('settings/test-email', '\App\Controllers\AdminSettings::testEmail');
    $routes->post('settings/test-telegram', '\App\Controllers\AdminSettings::testTelegram');
    $routes->get('settings/health', '\App\Controllers\AdminSettings::health');

    // Admin Tickets
    $routes->get('tickets', '\App\Controllers\TicketController::index');
    $routes->put('tickets/(:segment)', '\App\Controllers\TicketController::update/$1');
    $routes->get('tickets/(:segment)/tracking', '\App\Controllers\TicketController::tracking/$1');
    $routes->post('tickets/bulk-update', '\App\Controllers\TicketController::bulkUpdate');
    $routes->get('admins', '\App\Controllers\TicketController::listAdmins');

    // Admin Wiki
    $routes->get('wiki', '\App\Controllers\AdminWiki::index');
    $routes->get('wiki/read', '\App\Controllers\AdminWiki::read');
    $routes->put('wiki/write', '\App\Controllers\AdminWiki::write');

    // Admin CMS
    $routes->get('cms', '\App\Controllers\CmsController::listPages');
    $routes->put('cms/(:segment)', '\App\Controllers\CmsController::updatePage/$1');
    $routes->patch('cms/(:segment)', '\App\Controllers\CmsController::patchField/$1');
    $routes->post('cms/upload-image', '\App\Controllers\CmsController::uploadImage');
    $routes->delete('cms/(:segment)', '\App\Controllers\CmsController::deletePage/$1');
});



