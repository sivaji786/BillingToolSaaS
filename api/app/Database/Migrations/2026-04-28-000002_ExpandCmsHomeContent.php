<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ExpandCmsHomeContent extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();

        $fullContent = json_encode([
            // Hero
            'hero_badge'         => 'New: AI-Powered Invoice Processing',
            'hero_title'         => 'Modern Invoicing for',
            'hero_title_accent'  => 'Forward-Thinking',
            'hero_title_suffix'  => 'Businesses',
            'hero_subtitle'      => 'Streamline your billing with our compliant, multi-tenant SaaS platform. Create, manage, and track invoices with enterprise-grade security and design.',

            // Trusted By
            'trusted_by' => 'Trusted by innovative companies worldwide',

            // Features
            'features_tag'      => 'Everything you need',
            'features_subtitle' => 'Powerful features to help you get paid faster and manage your finances better.',
            'features' => [
                ['title' => 'Smart Invoicing',     'desc' => 'Create professional EN 16931 compliant invoices in seconds.'],
                ['title' => 'Custom Templates',    'desc' => 'Design beautiful invoice templates that match your brand identity.'],
                ['title' => 'Multi-Language',      'desc' => 'Support for 6+ languages including RTL support for Arabic.'],
                ['title' => 'Secure & Compliant',  'desc' => 'Bank-grade security with full audit trails and role-based access.'],
            ],

            // How It Works
            'how_it_works_tag'      => 'How it Works',
            'how_it_works_subtitle' => 'Three simple steps to streamline your billing process.',
            'how_it_works_steps' => [
                ['title' => 'Create',     'desc' => 'Use our lightning-fast editor or AI assistant to build invoices instantly.'],
                ['title' => 'Customize',  'desc' => 'Apply your brand colors and logo with beautifully designed templates.'],
                ['title' => 'Get Paid',   'desc' => 'Generate UBL compliance XML or add a payment QR code for instant payments.'],
            ],

            // About
            'about_title'       => 'Efficiency at Scale',
            'about_text'        => 'BillingTool is a modern invoicing platform designed to simplify the billing process for businesses of all sizes. We believe that professional invoicing should be accessible, secure, and compliant with the latest standards.',
            'about_text2'       => 'Our platform is built with a focus on user experience and regulatory compliance, ensuring that your invoices not only look great but also meet all legal requirements like EN 16931 and UBL 2.1.',
            'about_stat1_label' => 'Active Users',
            'about_stat2_label' => 'Invoices Sent',
            'about_image'       => '',

            // Pricing
            'pricing_tag'      => 'Simple, Transparent Pricing',
            'pricing_subtitle' => 'Choose the plan that fits your business needs. No hidden fees.',

            // Testimonials
            'testimonials_tag'      => 'Wall of Love',
            'testimonials_subtitle' => 'See what our customers have to say about BillingTool.',
            'testimonials' => [
                ['name' => 'Sivaji Kanchibhotla', 'role' => 'CEO at We4service', 'text' => 'BillingTool completely changed how we handle e-invoices. The UBL 2.1 support out-of-the-box saved our accounting team hours every week!'],
                ['name' => 'Bernhard Hnida',      'role' => 'CEO at Medianet',   'text' => 'Stunning invoice designs and ridiculous ease of use. I tested 5 different tools and this is by far the most intuitive.'],
                ['name' => 'Klaus Garms',          'role' => 'CEO at Voicepoint', 'text' => 'The multi-tenant features and immediate compliance with European standards made our switch totally painless.'],
            ],

            // FAQ
            'faq_tag'      => 'Frequently Asked Questions',
            'faq_subtitle' => 'Everything you need to know about BillingTool.',
            'faqs' => [
                ['q' => 'Is BillingTool compliant with European e-invoicing standards?', 'a' => 'Yes! All invoices generated are fully compliant with EN 16931 and UBL 2.1 standards, ensuring full interoperability.'],
                ['q' => 'Can I customize the invoice templates?',                        'a' => 'Absolutely. We provide a visual editor where you can adjust colors, fonts, and layouts to perfectly match your brand.'],
                ['q' => 'Do you offer a free plan?',                                     'a' => 'We offer a limited free plan where you can generate up to 5 invoices per month with our basic features. No credit card required.'],
                ['q' => 'Is my data secure?',                                            'a' => 'We employ bank-grade encryption and strictly adhere to GDPR regulations to ensure your data is always safe and completely private.'],
            ],

            // Bottom CTA
            'cta_title'   => 'Ready to streamline your invoicing?',
            'cta_subtitle' => 'Join over 10,000 businesses already using BillingTool to get paid faster.',
            'cta_context' => 'No credit card required. Cancel anytime.',
        ]);

        // Update all 'home' lang rows so they all get the expanded default content
        $db->query(
            "UPDATE cms_pages SET content = ? WHERE slug = 'home'",
            [$fullContent]
        );

        // If no home row exists yet (fresh install), insert one
        $existing = $db->query("SELECT id FROM cms_pages WHERE slug = 'home' AND lang = 'en'")->getRow();
        if (!$existing) {
            $db->query(
                "INSERT INTO cms_pages (slug, lang, title, content, updated_at) VALUES ('home', 'en', 'Home Page Content', ?, NOW())",
                [$fullContent]
            );
        }
    }

    public function down()
    {
        // Revert to minimal content
        $db = \Config\Database::connect();
        $minContent = json_encode([
            'hero_badge'    => 'Smart Invoicing Solutions',
            'hero_title'    => 'Invoice smarter, not harder',
            'hero_subtitle' => 'The complete platform for freelancers and small businesses.',
            'about_title'   => 'Efficiency at Scale',
            'about_text'    => 'We help thousands of professionals save time and get paid faster.',
        ]);
        $db->query("UPDATE cms_pages SET content = ? WHERE slug = 'home'", [$minContent]);
    }
}
