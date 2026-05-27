import type { FaqEntry, CategoryDef } from './faqTypes';
export type { FaqEntry, CategoryDef } from './faqTypes';

export const GUEST_FAQ: FaqEntry[] = [
    // ── About the App ─────────────────────────────────────────────────────
    {
        id: 'what-is',
        category: 'about',
        keywords: ['what', 'billing', 'tool', 'app', 'application', 'software', 'product', 'about'],
        question: 'What is BillingTool?',
        answer: 'BillingTool is an online invoicing and billing application for businesses.\nWith it you can:\n• Create and send professional invoices as PDFs\n• Write business letters\n• Manage your clients (buyers)\n• Use AI to create invoices from plain-language descriptions\n• Track payments and subscription billing',
        related: ['features', 'free-trial'],
    },
    {
        id: 'features',
        category: 'about',
        keywords: ['features', 'what', 'include', 'offer', 'can', 'do', 'capabilities'],
        question: 'What features does BillingTool include?',
        answer: 'Key features:\n• Invoice creation, editing, PDF download and sharing\n• Business letter composer\n• AI assistant — describe an invoice in plain language and it fills itself in\n• Voice input for invoices\n• Client (buyer) management\n• File workspace for storing documents\n• Audit log of all activity\n• Multi-language support\n• Custom templates and branding',
        related: ['what-is', 'plans'],
    },
    {
        id: 'who-for',
        category: 'about',
        keywords: ['who', 'for', 'suitable', 'target', 'business', 'freelancer', 'company', 'small'],
        question: 'Who is BillingTool for?',
        answer: 'BillingTool is designed for:\n• Freelancers who need to invoice clients quickly\n• Small and medium businesses that want professional invoices\n• Companies that need EU-compliant electronic invoices\n• Teams that want AI-powered invoice creation by voice or text',
    },
    // ── Pricing & Plans ───────────────────────────────────────────────────
    {
        id: 'plans',
        category: 'pricing',
        keywords: ['plans', 'pricing', 'packages', 'tiers', 'cost', 'price', 'how', 'much'],
        question: 'What plans are available?',
        answer: 'BillingTool offers multiple subscription plans to suit different business sizes.\nEach plan includes a different set of features and usage limits.\nClick "See Plans" or "Compare Packages" on this page to view the full pricing table.',
        related: ['free-trial', 'plan-difference'],
    },
    {
        id: 'plan-difference',
        category: 'pricing',
        keywords: ['difference', 'plans', 'compare', 'which', 'better', 'between', 'plan'],
        question: 'What is the difference between plans?',
        answer: 'Higher-tier plans include more features such as:\n• More invoices per month\n• AI invoice assistant access\n• File workspace storage\n• Priority support\n• Custom branding and templates\nClick "Compare Packages" at the top of this page to see the full feature comparison.',
        related: ['plans'],
    },
    {
        id: 'free-trial',
        category: 'pricing',
        keywords: ['free', 'trial', 'try', 'test', 'demo', 'sample', 'cost'],
        question: 'Is there a free trial?',
        answer: 'Yes! You can try BillingTool without signing up using the "Try Now" button.\nThis lets you create, preview and download a sample invoice instantly — no account needed.\nFor full features including saving invoices, sign up for a plan.',
        related: ['signup', 'plans'],
    },
    {
        id: 'cancel-plan',
        category: 'pricing',
        keywords: ['cancel', 'stop', 'subscription', 'refund', 'exit', 'leave'],
        question: 'Can I cancel my subscription at any time?',
        answer: 'Yes. You can cancel your subscription at any time from your account settings.\nYou will keep access until the end of your current billing period.\nNo long-term contracts — pay month to month.',
    },
    // ── Getting Started ───────────────────────────────────────────────────
    {
        id: 'signup',
        category: 'getting-started',
        keywords: ['signup', 'sign', 'up', 'register', 'create', 'account', 'start', 'join', 'new'],
        question: 'How do I sign up?',
        answer: 'Click the "Sign Up" or "Get Started" button on this page.\nChoose a plan, enter your business email and set a password.\nYou will receive a verification email — click the link to activate your account.\nAfter that, you can start creating invoices immediately.',
        related: ['free-trial', 'login'],
    },
    {
        id: 'login',
        category: 'getting-started',
        keywords: ['login', 'log', 'sign', 'in', 'access', 'account', 'existing'],
        question: 'How do I log in to my account?',
        answer: 'Click "Log In" at the top of this page.\nEnter your email and password.\nIf you have forgotten your password, click "Forgot Password" on the login page.',
        related: ['signup'],
    },
    {
        id: 'quick-access',
        category: 'getting-started',
        keywords: ['quick', 'access', 'try', 'without', 'account', 'guest', 'now', 'demo'],
        question: 'Can I try it without creating an account?',
        answer: 'Yes. Click "Try Now" on this page to use Quick Access.\nYou can create a full invoice, preview it and download it as a PDF — no sign-up needed.\nTo save your invoices and access all features, create a free account.',
        related: ['signup'],
    },
    // ── Technical ─────────────────────────────────────────────────────────
    {
        id: 'languages',
        category: 'technical',
        keywords: ['language', 'languages', 'multilingual', 'translate', 'german', 'english', 'international'],
        question: 'Is BillingTool available in multiple languages?',
        answer: 'Yes. BillingTool supports multiple languages including English and German.\nYou can switch language using the language selector in the top navigation.\nInvoice content (descriptions, notes) can be written in any language.',
    },
    {
        id: 'currencies',
        category: 'technical',
        keywords: ['currency', 'currencies', 'eur', 'usd', 'gbp', 'international', 'foreign'],
        question: 'What currencies are supported?',
        answer: 'BillingTool supports multiple currencies including EUR, USD, GBP and more.\nYou set a default currency in your company profile settings.\nEach invoice can use a different currency if needed.',
    },
    {
        id: 'mobile',
        category: 'technical',
        keywords: ['mobile', 'phone', 'tablet', 'app', 'ios', 'android', 'responsive'],
        question: 'Does it work on mobile?',
        answer: 'Yes. BillingTool is a web application that works on any modern browser, including on phones and tablets.\nThere is no separate app to install — just open it in your mobile browser.',
    },
    {
        id: 'data-security',
        category: 'technical',
        keywords: ['security', 'data', 'safe', 'secure', 'privacy', 'gdpr', 'compliant', 'protect'],
        question: 'Is my data safe and GDPR compliant?',
        answer: 'Yes. BillingTool takes data protection seriously:\n• All data is encrypted in transit (HTTPS)\n• Your invoices and client data are stored securely\n• The platform is operated in compliance with GDPR\nRead our Privacy Policy for full details.',
    },
    {
        id: 'ai-feature',
        category: 'technical',
        keywords: ['ai', 'artificial', 'intelligence', 'voice', 'natural', 'language', 'assistant'],
        question: 'How does the AI invoice assistant work?',
        answer: 'The AI assistant lets you describe an invoice in plain text or by speaking, and it fills in the form automatically.\nFor example: "Invoice for ABC Ltd — 10 bags cement at 700 EUR with 19% VAT"\nThe AI extracts the buyer, items, prices and taxes instantly.\nAvailable on selected plans.',
        related: ['plans'],
    },
    // ── Support & Contact ─────────────────────────────────────────────────
    {
        id: 'contact-support',
        category: 'support',
        keywords: ['contact', 'support', 'help', 'question', 'problem', 'issue', 'email', 'reach'],
        question: 'How do I contact support?',
        answer: 'You can reach us in two ways:\n• Use the Support button in the bottom-right corner of this page to submit a ticket\n• Email us at the address listed on our contact page\nSupport is available for both guests and registered users.',
    },
    {
        id: 'existing-data',
        category: 'support',
        keywords: ['import', 'existing', 'data', 'migrate', 'transfer', 'invoices', 'move'],
        question: 'Can I import existing invoices or data?',
        answer: 'Currently BillingTool does not have a bulk import feature.\nYou can enter existing clients and invoices manually, or contact support to discuss data migration options.',
        related: ['contact-support'],
    },
];

export const GUEST_CATEGORIES: CategoryDef[] = [
    { id: 'about',           label: 'About',          emoji: 'ℹ️'  },
    { id: 'pricing',         label: 'Pricing & Plans', emoji: '💰' },
    { id: 'getting-started', label: 'Get Started',    emoji: '🚀' },
    { id: 'technical',       label: 'Features',       emoji: '⚡' },
    { id: 'support',         label: 'Contact',        emoji: '💬' },
];
