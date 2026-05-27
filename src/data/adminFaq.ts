import type { FaqEntry, CategoryDef } from './faqTypes';
export type { FaqEntry, CategoryDef } from './faqTypes';

export const ADMIN_FAQ: FaqEntry[] = [
    // ── Dashboard ─────────────────────────────────────────────────────────
    {
        id: 'sa-dashboard',
        category: 'dashboard',
        keywords: ['dashboard', 'overview', 'stats', 'metrics', 'revenue', 'users', 'subscriptions'],
        question: 'What does the SA dashboard show?',
        answer: 'The SA dashboard shows platform-wide metrics:\n• Total registered tenants and active subscriptions\n• Monthly revenue and recent billing activity\n• Open support tickets and recent user sign-ups\nUse the quick-action buttons to add packages, create users, or generate invoices directly.',
    },
    // ── User Management ───────────────────────────────────────────────────
    {
        id: 'sa-users-list',
        category: 'users',
        keywords: ['users', 'tenants', 'list', 'search', 'find', 'manage', 'all'],
        question: 'How do I find and manage users?',
        answer: 'Go to Users in the admin sidebar.\nYou can search by name or email, and paginate through all tenants.\nClick a user row to open their details — subscription, invoices, and account status.',
        related: ['sa-user-suspend', 'sa-user-password'],
    },
    {
        id: 'sa-user-suspend',
        category: 'users',
        keywords: ['suspend', 'deactivate', 'disable', 'block', 'user', 'account', 'activate'],
        question: 'How do I suspend or activate a user account?',
        answer: 'Open the user\'s details page (Users → click user row).\nUse the Suspend / Activate toggle at the top of the page.\nSuspended users cannot log in but their data is preserved.',
        related: ['sa-users-list'],
    },
    {
        id: 'sa-user-password',
        category: 'users',
        keywords: ['password', 'reset', 'user', 'forgot', 'change'],
        question: 'How do I reset a user\'s password?',
        answer: 'Open the user\'s detail page.\nClick "Reset Password" — this sends a password reset email to the user\'s registered email address.',
        related: ['sa-users-list'],
    },
    {
        id: 'sa-user-invoice',
        category: 'users',
        keywords: ['invoice', 'user', 'tenant', 'billing', 'generate', 'create', 'manual'],
        question: 'How do I generate an invoice for a user?',
        answer: 'Go to Users → open the user → click "Generate Invoice".\nOr use the quick-action button on the SA dashboard.\nYou can specify the amount, description and due date.',
    },
    // ── Package Management ────────────────────────────────────────────────
    {
        id: 'sa-packages-list',
        category: 'packages',
        keywords: ['packages', 'plans', 'list', 'view', 'manage', 'all'],
        question: 'How do I manage subscription packages?',
        answer: 'Go to Packages in the admin sidebar.\nAll available plans are listed with their pricing and features.\nClick a package to edit it inline, or click "New Package" to create one.',
        related: ['sa-package-create', 'sa-package-features'],
    },
    {
        id: 'sa-package-create',
        category: 'packages',
        keywords: ['create', 'new', 'package', 'plan', 'add'],
        question: 'How do I create a new subscription plan?',
        answer: 'Go to Packages → click "New Package".\nEnter the plan name, price, billing cycle and description.\nThen configure which features are included using the feature toggles.',
        related: ['sa-package-features'],
    },
    {
        id: 'sa-package-features',
        category: 'packages',
        keywords: ['features', 'toggle', 'enable', 'disable', 'package', 'plan', 'include'],
        question: 'How do I enable or disable features per package?',
        answer: 'Open the package and go to the Features section.\nEach feature has an on/off toggle.\nTenants on that plan will immediately gain or lose access to toggled features.',
        related: ['sa-package-create'],
    },
    {
        id: 'sa-package-services',
        category: 'packages',
        keywords: ['services', 'package', 'line', 'items', 'components'],
        question: 'What are package services?',
        answer: 'Package services are the individual billable components of a plan (e.g. "Storage 10 GB", "AI requests per month").\nGo to Packages → Package Services to manage them.\nServices are assigned to packages and appear on tenant invoices.',
    },
    // ── Billing ───────────────────────────────────────────────────────────
    {
        id: 'sa-billing-overview',
        category: 'billing',
        keywords: ['billing', 'revenue', 'overview', 'payments', 'income', 'admin'],
        question: 'Where can I see all tenant billing?',
        answer: 'Go to Billing in the admin sidebar.\nYou can see all tenant invoices, payment statuses and total revenue.\nFilter by date range, status or plan to drill down.',
    },
    // ── Support Tickets ───────────────────────────────────────────────────
    {
        id: 'sa-tickets-list',
        category: 'tickets',
        keywords: ['tickets', 'support', 'issues', 'bugs', 'requests', 'manage', 'list'],
        question: 'How do I manage support tickets?',
        answer: 'Go to Tickets in the admin sidebar to see all submitted tickets.\nTickets are listed with priority, status and the submitting user.\nClick a ticket to open details, view the screenshot, and respond.',
        related: ['sa-ticket-respond'],
    },
    {
        id: 'sa-ticket-respond',
        category: 'tickets',
        keywords: ['respond', 'reply', 'ticket', 'answer', 'close', 'resolve'],
        question: 'How do I respond to or close a support ticket?',
        answer: 'Open the ticket from the Tickets list.\nAdd your response in the reply field and click Send.\nChange the status to "Resolved" or "Closed" using the status dropdown at the top.',
        related: ['sa-tickets-list'],
    },
    // ── Wiki ──────────────────────────────────────────────────────────────
    {
        id: 'sa-wiki-overview',
        category: 'wiki',
        keywords: ['wiki', 'documentation', 'docs', 'knowledge', 'base', 'articles'],
        question: 'What is the SA Wiki?',
        answer: 'The SA Wiki is an internal documentation system for your platform.\nYou can create articles with Markdown formatting, headings, code blocks and Mermaid diagrams.\nOrganise articles into folders for easy navigation.',
        related: ['sa-wiki-create'],
    },
    {
        id: 'sa-wiki-create',
        category: 'wiki',
        keywords: ['wiki', 'create', 'new', 'article', 'write', 'add', 'page'],
        question: 'How do I create a wiki article?',
        answer: 'Go to Wiki in the admin sidebar.\nClick "New Article" or the "+" button on a folder.\nWrite using Markdown — headings, bold, lists, code blocks and Mermaid diagrams are all supported.\nClick Save when done.',
        related: ['sa-wiki-overview'],
    },
    {
        id: 'sa-wiki-search',
        category: 'wiki',
        keywords: ['wiki', 'search', 'find', 'article', 'filter'],
        question: 'How do I search the wiki?',
        answer: 'Use the search bar at the top of the Wiki section.\nIt searches article titles and content in real time.',
    },
    // ── CMS Pages ─────────────────────────────────────────────────────────
    {
        id: 'sa-pages-manage',
        category: 'pages',
        keywords: ['pages', 'cms', 'content', 'manage', 'website', 'landing', 'create'],
        question: 'How do I manage CMS pages?',
        answer: 'Go to Pages in the admin sidebar.\nYou can see all custom CMS pages, create new ones, and toggle their visibility in navigation.\nTo edit page content, click "Edit Page" on the live site to enter inline edit mode.',
        related: ['sa-pages-edit'],
    },
    {
        id: 'sa-pages-edit',
        category: 'pages',
        keywords: ['edit', 'page', 'content', 'inline', 'cms', 'live', 'text'],
        question: 'How do I edit the content of a CMS page?',
        answer: 'Navigate to the page you want to edit on the live site.\nClick "Edit Page" in the floating bar at the bottom-right.\nClick any text block to edit it directly.\nClick Save Changes when done, or Exit Edit Mode to discard.',
        related: ['sa-pages-manage'],
    },
    // ── Admin Settings ────────────────────────────────────────────────────
    {
        id: 'sa-settings',
        category: 'settings',
        keywords: ['settings', 'admin', 'configuration', 'configure', 'system', 'email', 'smtp'],
        question: 'What can I configure in Admin Settings?',
        answer: 'Go to Settings in the admin sidebar.\nYou can configure:\n• SMTP / email delivery settings\n• Platform name and branding\n• Default system-wide configurations\nClick "Test Email" to verify your SMTP setup.',
    },
    // ── Usage ─────────────────────────────────────────────────────────────
    {
        id: 'sa-usage',
        category: 'usage',
        keywords: ['usage', 'statistics', 'stats', 'analytics', 'activity', 'monitor'],
        question: 'Where can I see platform usage statistics?',
        answer: 'Go to Usage in the admin sidebar.\nIt shows platform-wide activity including invoice counts, AI request usage, storage consumption and active user trends over time.',
    },
];

export const ADMIN_CATEGORIES: CategoryDef[] = [
    { id: 'dashboard', label: 'Dashboard',  emoji: '📊' },
    { id: 'users',     label: 'Users',      emoji: '👥' },
    { id: 'packages',  label: 'Packages',   emoji: '📦' },
    { id: 'billing',   label: 'Billing',    emoji: '💳' },
    { id: 'tickets',   label: 'Tickets',    emoji: '🎫' },
    { id: 'wiki',      label: 'Wiki',       emoji: '📖' },
    { id: 'pages',     label: 'CMS Pages',  emoji: '📄' },
    { id: 'usage',     label: 'Usage',      emoji: '📈' },
    { id: 'settings',  label: 'Settings',   emoji: '⚙️'  },
];

export const ADMIN_SCREEN_MAP: Record<string, string> = {
    SAdashboard:       'dashboard',
    SAASusers:         'users',
    SAUserDetails:     'users',
    SApackages:        'packages',
    SAPackageServices: 'packages',
    SAPackageForm:     'packages',
    SAbilling:         'billing',
    SATickets:         'tickets',
    SATicketDetails:   'tickets',
    SAWiki:            'wiki',
    SAPages:           'pages',
    SAusage:           'usage',
    SAsettings:        'settings',
};
