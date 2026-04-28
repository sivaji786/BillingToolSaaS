<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class SeedCmsModules extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('cms_pages');

        // Fetch current home content
        $homePage = $builder->where('slug', 'home')->get()->getRowArray();
        $content = json_decode($homePage['content'], true) ?: [];

        // Add Testimonials Section
        $content['testimonials_tag'] = 'Wall of Love';
        $content['testimonials_subtitle'] = 'See what our customers have to say about BillingTool.';
        $content['testimonials'] = [
            [
                'name' => 'Sivaji kanchibhotla',
                'role' => 'CEO at We4service',
                'text' => 'BillingTool completely changed how we handle e-invoices. The UBL 2.1 support out-of-the-box saved our accounting team hours every week!'
            ],
            [
                'name' => 'Bernhard Hnida',
                'role' => 'CEO at Medianet',
                'text' => 'Stunning invoice designs and ridiculous ease of use. I tested 5 different tools and this is by far the most intuitive.'
            ],
            [
                'name' => 'Klaus Garms',
                'role' => 'CEO at Voicepoint',
                'text' => 'The multi-tenant features and immediate compliance with European standards made our switch totally painless.'
            ]
        ];

        // Add FAQ Section
        $content['faq_tag'] = 'Frequently Asked Questions';
        $content['faq_subtitle'] = 'Everything you need to know about BillingTool.';
        $content['faqs'] = [
            [
                'q' => 'Is BillingTool compliant with European e-invoicing standards?',
                'a' => 'Yes! All invoices generated are fully compliant with EN 16931 and UBL 2.1 standards, ensuring full interoperability.'
            ],
            [
                'q' => 'Can I customize the invoice templates?',
                'a' => 'Absolutely. We provide a visual editor where you can adjust colors, fonts, and layouts to perfectly match your brand.'
            ],
            [
                'q' => 'Do you offer a free plan?',
                'a' => 'We offer a limited free plan where you can generate up to 5 invoices per month with our basic features. No credit card required.'
            ],
            [
                'q' => 'Is my data secure?',
                'a' => 'We employ bank-grade encryption and strictly adhere to GDPR regulations to ensure your data is always safe and completely private.'
            ]
        ];

        $builder->where('slug', 'home')->update([
            'content' => json_encode($content),
            'updated_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function down()
    {
        // No changes needed
    }
}
