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
$routes->get('api/public/mockups', '\App\Controllers\AdminWiki::publicListMockups');
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

// Company Types — read is public to authenticated tenants; mutations are SA-admin only
$routes->get('company-types', '\App\Controllers\CompanyTypeController::index', ['filter' => 'auth']);

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

    // SSO — OAuth 2.0 social login (public; no auth required)
    $routes->get('sso/providers', '\App\Controllers\SsoController::providers');
    $routes->group('sso', ['filter' => 'sso_ratelimit'], function($routes) {
        $routes->get('(:segment)/redirect',  '\App\Controllers\SsoController::redirect/$1');
        $routes->get('(:segment)/callback',  '\App\Controllers\SsoController::callback/$1');
    });

});

// SSO-007: identities list + unlink (authenticated)
$routes->get('auth/sso/identities',           '\App\Controllers\SsoController::identities',  ['filter' => 'auth']);
$routes->delete('auth/sso/(:segment)/unlink', '\App\Controllers\SsoController::unlink/$1',   ['filter' => ['auth', 'sso_ratelimit']]);

// SSO link callback (session-validated, NOT JWT — OAuth provider redirect)
$routes->get('auth/sso/(:segment)/link', '\App\Controllers\SsoController::link/$1');

// SAML 2.0 (public — IdP must be able to reach ACS and metadata)
$routes->get( 'auth/saml/metadata', '\App\Controllers\SamlController::metadata');
$routes->get( 'auth/saml/login',    '\App\Controllers\SamlController::login');
$routes->post('auth/saml/acs',      '\App\Controllers\SamlController::acs');
$routes->get( 'auth/saml/slo',      '\App\Controllers\SamlController::slo');

// Generic OIDC (public — OIDC callback must not require auth)
$routes->get('auth/oidc/redirect',  '\App\Controllers\OidcController::redirect');
$routes->get('auth/oidc/callback',  '\App\Controllers\OidcController::callback');
$routes->post('auth/oidc/test-discovery', '\App\Controllers\OidcController::testDiscovery', ['filter' => 'auth']);

// SSO Settings — tenant admin (SSO-017)
$routes->get('settings/sso', '\App\Controllers\SsoSettingsController::show',   ['filter' => 'auth']);
$routes->put('settings/sso', '\App\Controllers\SsoSettingsController::update', ['filter' => 'auth']);

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

// Public health/ping — no auth, no tenant required (used by OfflineBanner)
$routes->match(['get', 'head'], 'ping', function() {
    header('Content-Type: application/json');
    echo json_encode(['ok' => true]);
    exit;
});

$routes->post('webhooks/stripe', '\App\Controllers\Webhooks::stripe');

// Admin Portal API Routes
$routes->group('admin', ['filter' => 'auth'], function($routes) {
    // Admin Authentication (no auth filter) - Uses AdminAuth for admin login (supports demo credentials)
    $routes->post('auth/login', '\App\Controllers\AdminAuth::login');
    $routes->get('auth/me', '\App\Controllers\AdminAuth::me');
    $routes->post('auth/logout', '\App\Controllers\AdminAuth::logout');
    $routes->post('auth/refresh', '\App\Controllers\AdminAuth::refresh');
    
    // Company Types (mutations SA-admin only; GET is open to tenants via /company-types)
    $routes->get('company-types', '\App\Controllers\CompanyTypeController::index');
    $routes->post('company-types', '\App\Controllers\CompanyTypeController::create');
    $routes->put('company-types/(:segment)', '\App\Controllers\CompanyTypeController::update/$1');
    $routes->delete('company-types/(:segment)', '\App\Controllers\CompanyTypeController::delete/$1');

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
    $routes->post('wiki/create', '\App\Controllers\AdminWiki::create');
    $routes->get('wiki/mockups', '\App\Controllers\AdminWiki::listMockups');
    $routes->post('wiki/mockups/folder', '\App\Controllers\AdminWiki::createMockupFolder');
    $routes->post('wiki/mockups', '\App\Controllers\AdminWiki::uploadMockup');
    $routes->patch('wiki/mockups', '\App\Controllers\AdminWiki::renameMockup');
    $routes->delete('wiki/mockups', '\App\Controllers\AdminWiki::deleteMockup');

    // Admin CMS — pages
    $routes->get('cms', '\App\Controllers\CmsController::listPages');
    $routes->patch('cms/nav/reorder', '\App\Controllers\CmsController::reorderNav');
    $routes->post('cms/upload-image', '\App\Controllers\CmsController::uploadImage');
    // Admin CMS — media library
    $routes->get('cms/media', '\App\Controllers\CmsController::listMedia');
    $routes->patch('cms/media/(:num)', '\App\Controllers\CmsController::updateMedia/$1');
    $routes->delete('cms/media/(:num)', '\App\Controllers\CmsController::deleteMedia/$1');
    // Admin CMS — versions
    $routes->get('cms/versions/(:segment)', '\App\Controllers\CmsController::listVersions/$1');
    $routes->post('cms/versions/restore/(:num)', '\App\Controllers\CmsController::restoreVersion/$1');
    $routes->post('cms/versions/(:segment)', '\App\Controllers\CmsController::saveVersion/$1');
    // Admin CMS — page CRUD (must come after specific prefixes)
    $routes->put('cms/(:segment)', '\App\Controllers\CmsController::updatePage/$1');
    $routes->patch('cms/(:segment)', '\App\Controllers\CmsController::patchField/$1');
    $routes->delete('cms/(:segment)', '\App\Controllers\CmsController::deletePage/$1');
});


// =============================================================================
// WorkHub M-08 — Field Service Work Management
// Sprint 2: Task CRUD, Timer, Timesheet, Completion, AI (WH-013 to WH-028)
// =============================================================================

// Read access — tasks, timesheet, completions
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    // batch-location must come before (:num) to avoid segment conflict
    $routes->get('tasks/batch-location', '\App\Controllers\WorkHub\TaskController::batchLocation');
    $routes->get('tasks', '\App\Controllers\WorkHub\TaskController::index');
    $routes->get('tasks/(:num)', '\App\Controllers\WorkHub\TaskController::show/$1');
    $routes->get('timesheet', '\App\Controllers\WorkHub\TimesheetController::index');
    $routes->get('timesheet/export', '\App\Controllers\WorkHub\TimesheetController::export');
    $routes->get('timesheet/signoff-status', '\App\Controllers\WorkHub\TimesheetController::signoffStatus');
    $routes->get('completions/(:num)', '\App\Controllers\WorkHub\CompletionController::show/$1');
});

// Task create — includes plan-limit check inside controller
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.create']], function ($routes) {
    $routes->post('tasks', '\App\Controllers\WorkHub\TaskController::create');
});

// Task update
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.edit']], function ($routes) {
    $routes->put('tasks/(:num)', '\App\Controllers\WorkHub\TaskController::update/$1');
});

// Task delete — Manager only
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.delete']], function ($routes) {
    $routes->delete('tasks/(:num)', '\App\Controllers\WorkHub\TaskController::delete/$1');
});

// Timer — Worker
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.timer.start']], function ($routes) {
    $routes->post('tasks/(:num)/timer/start', '\App\Controllers\WorkHub\TimerController::start/$1');
    $routes->post('tasks/(:num)/timer/pause', '\App\Controllers\WorkHub\TimerController::pause/$1');
    $routes->post('tasks/(:num)/timer/stop',  '\App\Controllers\WorkHub\TimerController::stop/$1');
    $routes->post('timer/stop-current',       '\App\Controllers\WorkHub\TimerController::stopCurrent');
    $routes->get('timer/active',              '\App\Controllers\WorkHub\TimerController::active');
});

// Completion records — Worker
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.completion.submit']], function ($routes) {
    $routes->post('tasks/(:num)/completion',              '\App\Controllers\WorkHub\CompletionController::submit/$1');
    $routes->post('completions/(:num)/customer-signature', '\App\Controllers\WorkHub\CompletionController::customerSignature/$1');
    $routes->post('timesheet/signoff',                    '\App\Controllers\WorkHub\TimesheetController::signoff');
});

// AI services — rate limited (60/min tenant, 10/min user) per WH-080
$routes->group('workhub/ai', ['filter' => ['auth', 'rbac:workhub.task.view', 'wh_ratelimit']], function ($routes) {
    $routes->post('correct',   '\App\Controllers\WorkHub\AIController::correct');
    $routes->post('translate', '\App\Controllers\WorkHub\AIController::translate');
});

// Epics 6–8: Files, Print, Workers, Projects, Customers, Inbox (WH-029–035)

// File upload — completion.submit so workers can upload
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.completion.submit']], function ($routes) {
    $routes->post('files/upload', '\App\Controllers\WorkHub\FileController::upload');
});

// Documents list — read access
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get('tasks/(:num)/documents', '\App\Controllers\WorkHub\FileController::listForTask/$1');
});

// Local dev file proxy (no S3) — HMAC-signed URL is the auth mechanism (like S3 presign)
$routes->get('workhub/files/proxy', '\App\Controllers\WorkHub\FileController::proxy');

// Print / PDF generation — reports.export
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.reports.export']], function ($routes) {
    $routes->get('print/(:any)/(:any)', '\App\Controllers\WorkHub\PrintController::generate/$1/$2');
});

// Workers — read + management
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get('workers',                '\App\Controllers\WorkHub\WorkerController::index');
    $routes->get('workers/available',      '\App\Controllers\WorkHub\WorkerController::available');
    $routes->get('workers/(:num)',         '\App\Controllers\WorkHub\WorkerController::show/$1');
    $routes->post('workers',               '\App\Controllers\WorkHub\WorkerController::store');
    $routes->patch('workers/(:num)/role',  '\App\Controllers\WorkHub\WorkerController::setRole/$1');
    $routes->delete('workers/(:num)',      '\App\Controllers\WorkHub\WorkerController::destroy/$1');
});

// Worker profile — auth only (no RBAC): bootstraps role for new/existing workers
$routes->group('workhub', ['filter' => 'auth'], function ($routes) {
    $routes->get('profile',   '\App\Controllers\WorkHub\WorkerController::profile');
    $routes->patch('profile', '\App\Controllers\WorkHub\WorkerController::updateProfile');
});

// Projects — read access
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get('projects',       '\App\Controllers\WorkHub\ProjectController::index');
    $routes->get('projects/(:num)', '\App\Controllers\WorkHub\ProjectController::show/$1');
});

// Projects — manage (planner/manager)
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.project.manage']], function ($routes) {
    $routes->post(  'projects',       '\App\Controllers\WorkHub\ProjectController::create');
    $routes->put(   'projects/(:num)', '\App\Controllers\WorkHub\ProjectController::update/$1');
    $routes->delete('projects/(:num)', '\App\Controllers\WorkHub\ProjectController::delete/$1');
});

// Customers — read access
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get('customers',       '\App\Controllers\WorkHub\CustomerController::index');
    $routes->get('customers/(:num)', '\App\Controllers\WorkHub\CustomerController::show/$1');
});

// Customers — manage
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.project.manage']], function ($routes) {
    $routes->post(  'customers',       '\App\Controllers\WorkHub\CustomerController::create');
    $routes->put(   'customers/(:num)', '\App\Controllers\WorkHub\CustomerController::update/$1');
    $routes->delete('customers/(:num)', '\App\Controllers\WorkHub\CustomerController::delete/$1');
});

// Inbox — all authenticated workhub users
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get( 'inbox/messages',              '\App\Controllers\WorkHub\InboxController::index');
    $routes->post('inbox/messages',              '\App\Controllers\WorkHub\InboxController::create');
    // mark-all-read must precede (:num)/read to avoid segment conflict
    $routes->put( 'inbox/messages/mark-all-read', '\App\Controllers\WorkHub\InboxController::markAllRead');
    $routes->put( 'inbox/messages/(:num)/read',   '\App\Controllers\WorkHub\InboxController::markRead/$1');
    $routes->get( 'inbox/unread-count',           '\App\Controllers\WorkHub\InboxController::unreadCount');
});

// Sprint 4: WorkHub Settings (WH-061)
// GET available to all WorkHub users; PUT restricted to managers/admins
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get('settings', '\App\Controllers\WorkHub\SettingsController::index');
});
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.admin.manage']], function ($routes) {
    $routes->put('settings', '\App\Controllers\WorkHub\SettingsController::update');
});

// Sprint 4: SA Admin — WorkHub management (WH-062, WH-063, WH-066)
$routes->group('admin/workhub', ['filter' => ['auth']], function ($routes) {
    $routes->get('compliance-report', '\App\Controllers\AdminWorkHub::complianceReport');
    $routes->put('tenants/(:num)/toggle', '\App\Controllers\AdminWorkHub::toggleTenant/$1');
    $routes->put('tenants/(:num)/quota',  '\App\Controllers\AdminWorkHub::overrideQuota/$1');
});

// Sprint D: External module webhooks — HMAC-signed, no session auth (machine-to-machine)
// Signature verified inside WebhookController::verifySignature() via WORKHUB_WEBHOOK_SECRET.
$routes->group('workhub/webhooks', function ($routes) {
    $routes->post('receive',    '\App\Controllers\WorkHub\WebhookController::receive');
    $routes->post('pc13-fault', '\App\Controllers\WorkHub\WebhookController::pc13Fault');
    $routes->post('pfe-task',   '\App\Controllers\WorkHub\WebhookController::pfeTask');
});

// Sprint C: GDPR Art. 15 — data subject access (auth only; no RBAC — available to all roles)
$routes->group('workhub', ['filter' => 'auth'], function ($routes) {
    $routes->get('my-data', '\App\Controllers\WorkHub\GdprController::myData');
});

// Sprint C: Time entries — read + planner/manager correction
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get('time-entries', '\App\Controllers\WorkHub\TimeEntryController::index');
});
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.edit']], function ($routes) {
    $routes->put('time-entries/(:num)/correct', '\App\Controllers\WorkHub\TimeEntryController::correct/$1');
});

// Sprint E: Aggregate endpoints
$routes->group('workhub', ['filter' => ['auth', 'rbac:workhub.task.view']], function ($routes) {
    $routes->get('kanban',          '\App\Controllers\WorkHub\AggregateController::kanban');
    $routes->get('capacity',        '\App\Controllers\WorkHub\AggregateController::capacity');
    $routes->get('finance/summary', '\App\Controllers\WorkHub\AggregateController::financeSummary');
});

// Sprint E: Offline sync — all authenticated workers
$routes->group('workhub', ['filter' => 'auth'], function ($routes) {
    $routes->post('sync', '\App\Controllers\WorkHub\SyncController::sync');
});

