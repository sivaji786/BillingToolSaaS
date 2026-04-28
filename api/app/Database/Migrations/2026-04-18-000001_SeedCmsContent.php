<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class SeedCmsContent extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('cms_pages');

        // 1. Home Page
        $homeContent = [
            'hero_badge' => 'New: AI-Powered Invoice Processing',
            'hero_title' => 'Modern Invoicing for Forward-Thinking Businesses',
            'hero_subtitle' => 'Streamline your billing with our compliant, multi-tenant SaaS platform. Create, manage, and track invoices with enterprise-grade security and design.',
            'about_title' => 'Efficiency at Scale',
            'about_text' => 'BillingTool is a modern invoicing platform designed to simplify the billing process for businesses of all sizes. We believe that professional invoicing should be accessible, secure, and compliant with the latest standards. Our platform is built with a focus on user experience and regulatory compliance, ensuring that your invoices not only look great but also meet all legal requirements like EN 16931 and UBL 2.1.'
        ];

        // 2. Privacy Policy
        $privacyHtml = '<h1>Privacy Policy</h1><p>Information pursuant to Art. 13 GDPR — last updated March 2026</p>';
        $privacySections = [
            ['title' => 'Controller Responsible for Data Processing', 'content' => '[mn]medianet, Bernhard Hnida\nAm Taubhaus 29, 63303 Dreieich, Germany\nPhone: +49 (0) 6103 / 69 77 84\nE-Mail: info@medianet-home.de'],
            ['title' => 'General Information on Data Processing', 'content' => 'We process personal data only to the extent necessary to provide a functional website and our services. Data is collected and used only in accordance with applicable data protection law, in particular the GDPR and the German Federal Data Protection Act (BDSG).'],
            ['title' => 'Legal Basis of Processing under GDPR', 'content' => 'We process personal data on the following legal bases:\n\n• Art. 6(1)(a) GDPR — your consent\n• Art. 6(1)(b) GDPR — performance of a contract or pre-contractual measures\n• Art. 6(1)(c) GDPR — compliance with a legal obligation\n• Art. 6(1)(f) GDPR — protection of legitimate interests'],
            ['title' => 'Hosting and Server Log Files', 'content' => 'Our website is hosted on servers located within the European Union. When you visit our website, servers automatically record certain data (server log files), including your IP address, browser type, operating system, referring URL, and the time and date of your request. This data is stored for up to 7 days for security and troubleshooting purposes and is then deleted. It is not combined with other personal data.'],
            ['title' => 'User Registration and Accounts', 'content' => 'When you create an account, we collect your e-mail address and, optionally, profile details you provide. This data is used to create and manage your account and to provide you with access to the service. The legal basis is Art. 6(1)(b) GDPR (contract performance). You may delete your account at any time; personal data will be erased within 30 days.'],
            ['title' => 'Processing of Invoice and Customer Data', 'content' => 'To provide the invoicing service, we process business data you enter, including company names, addresses, VAT identification numbers, bank details, and invoice amounts. This data is processed solely on your behalf and is necessary for the performance of the service contract (Art. 6(1)(b) GDPR). We do not sell or share this data with third parties for any purpose other than providing the service.'],
            ['title' => 'Cookies and Tracking Technologies', 'content' => 'We use only technically necessary cookies to ensure the correct functioning of the website. These include session cookies for authentication and CSRF protection, and a cookie to remember your language preference. No analytics, advertising, or third-party tracking cookies are used. For more details, see our Cookie Policy.'],
            ['title' => 'Data Retention and Deletion', 'content' => 'Personal data is retained only for as long as necessary for the purpose it was collected, or as required by statutory retention periods (e.g. tax and commercial law require retention of invoicing records for up to 10 years). Account data is deleted within 30 days of account closure. Server log files are deleted after 7 days.'],
            ['title' => 'Rights of Data Subjects', 'content' => 'Under the GDPR you have the following rights:\n\n• Right of access (Art. 15 GDPR)\n• Right to rectification (Art. 16 GDPR)\n• Right to erasure (Art. 17 GDPR)\n• Right to restriction of processing (Art. 18 GDPR)\n• Right to data portability (Art. 20 GDPR)\n• Right to object to processing (Art. 21 GDPR)\n\nTo exercise your rights, contact us at info@medianet-home.de. You also have the right to lodge a complaint with the supervisory authority: Hessian Commissioner for Data Protection and Freedom of Information (HBDI), Wiesbaden.'],
            ['title' => 'Data Protection Contact', 'content' => 'For any questions regarding data protection or to exercise your rights, please contact:\n\ninfo@medianet-home.de\n+49 (0) 6103 / 69 77 84\n\n[mn]medianet, Bernhard Hnida, Am Taubhaus 29, 63303 Dreieich']
        ];
        foreach ($privacySections as $section) {
            $privacyHtml .= "<h2>{$section['title']}</h2><p>" . nl2br($section['content']) . "</p>";
        }

        // 3. Terms & Conditions
        $termsHtml = '<h1>Terms and Conditions</h1><p>General Terms and Conditions of Business — [mn]medianet / BillingTool</p>';
        $termsSections = [
            ['title' => 'Scope of Application', 'content' => 'These General Terms and Conditions (GTC) apply to all contracts concluded between [mn]medianet, Bernhard Hnida, Am Taubhaus 29, 63303 Dreieich, Germany (hereinafter "Provider") and users of the BillingTool platform (hereinafter "User"). Deviating terms and conditions of the User are not accepted unless the Provider expressly agrees to them in writing.'],
            ['title' => 'Subject Matter of the Contract (SaaS Service)', 'content' => 'BillingTool is a Software-as-a-Service (SaaS) platform for the creation, management, and distribution of invoices. Access to the software is provided via the internet. The Provider grants the User a non-exclusive, non-transferable right to use the platform within the scope of the selected subscription plan during the contract term.'],
            ['title' => 'Registration and User Account', 'content' => 'Use of the platform requires registration with a valid e-mail address. The User is responsible for maintaining the confidentiality of their credentials and for all activities that occur under their account. The User must notify the Provider immediately of any unauthorised use of their account. The Provider reserves the right to refuse registration without giving reasons.'],
            ['title' => 'Description of the Software Service', 'content' => 'BillingTool provides features including: invoice creation and management, PDF export, e-invoice generation (compliant with EN 16931 / ZUGFeRD / XRechnung), customer management, and a personal dashboard. The scope of features available depends on the selected subscription plan. The Provider is entitled to extend, modify, or restrict features with reasonable notice.'],
            ['title' => 'Pricing and Payment Terms', 'content' => 'The service is offered on a subscription basis. Current prices are displayed on the website and are subject to change with 30 days\' notice. The free tier is available with limited features. Paid subscriptions are billed in advance for the agreed period. All prices are net prices and are subject to applicable statutory VAT. Payment is processed via the payment providers listed on the website.'],
            ['title' => 'Contract Duration and Termination', 'content' => 'Subscriptions are concluded for the agreed contract period (monthly or annual). They are automatically renewed unless terminated with at least 30 days\' notice before the end of the current period. Free accounts may be deleted at any time. The right to terminate for good cause remains unaffected. Upon termination, the User\'s data will be deleted within 30 days unless statutory retention periods apply.'],
            ['title' => 'User Obligations', 'content' => 'The User agrees to:\n\n• Use the platform only in accordance with applicable law and these GTC\n• Not misuse, reverse-engineer, or attempt to disrupt the service\n• Ensure the accuracy of data entered for invoicing purposes\n• Keep login credentials confidential and not share access with unauthorised third parties\n• Not use the platform to create fraudulent or legally non-compliant invoices'],
            ['title' => 'Platform Availability', 'content' => 'The Provider aims for a monthly availability of 99% of the service, calculated on a 24/7 basis, excluding planned maintenance windows. Planned maintenance will be announced in advance where possible. The Provider does not guarantee completely uninterrupted service and accepts no liability for temporary unavailability due to technical issues beyond its reasonable control.'],
            ['title' => 'Limitation of Liability', 'content' => 'The Provider is liable without limitation for damages resulting from intentional misconduct or gross negligence, as well as for damages arising from injury to life, body, or health. For slight negligence, liability is limited to foreseeable, typically occurring damages and only in the event of a breach of a material contractual obligation. The Provider\'s aggregate liability for damages per calendar year shall not exceed the total fees paid by the User in the 12 months preceding the event giving rise to the claim.'],
            ['title' => 'Data Protection and Data Processing', 'content' => 'The processing of personal data is governed by the Provider\'s Privacy Policy, which forms an integral part of these GTC. Where the User processes personal data of third parties (e.g. customer data) via the platform, the User is responsible for ensuring a valid legal basis for such processing. A data processing agreement (DPA) pursuant to Art. 28 GDPR is available upon request.'],
            ['title' => 'Changes to the Service and GTC', 'content' => 'The Provider reserves the right to amend these GTC and the features of the service. Users will be notified of material changes via e-mail at least 30 days before the changes take effect. Continued use of the service after the effective date of the changes constitutes acceptance. If a User does not agree to the changes, they may terminate their account before the effective date.'],
            ['title' => 'Final Provisions and Jurisdiction', 'content' => 'These GTC are governed by the laws of the Federal Republic of Germany, excluding the UN Convention on Contracts for the International Sale of Goods (CISG). The exclusive place of jurisdiction for all disputes arising from or in connection with these GTC, where the User is a merchant, legal entity under public law, or a special fund under public law, is Darmstadt, Germany. Should any provision of these GTC be or become invalid, the remaining provisions shall remain in full force.']
        ];
        foreach ($termsSections as $section) {
            $termsHtml .= "<h2>{$section['title']}</h2><p>" . nl2br($section['content']) . "</p>";
        }

        // 4. Legal Notice
        $legalHtml = '<h1>Legal Notice</h1><p>Legal information according to § 5 TMG</p>';
        $legalSections = [
            ['title' => 'Legal Notice according to § 5 TMG', 'content' => '[mn]medianet, Bernhard Hnida\nAm Taubhaus 29, 63303 Dreieich, Germany\nPhone: +49 (0) 6103 / 69 77 84\nE-Mail: info@medianet-home.de'],
            ['title' => 'Value Added Tax', 'content' => 'VAT identification number pursuant to § 27a of the German Value Added Tax Act:\nDE 362.250.524'],
            ['title' => 'Dispute Resolution', 'content' => 'The European Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr.\nYou can find our email address in the legal notice above.\n\nWe are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.'],
            ['title' => 'Liability for Content', 'content' => 'As a service provider, we are responsible for our own content on these pages in accordance with general law pursuant to § 7 para. 1 TMG. According to §§ 8 to 10 TMG, however, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.\n\nObligations to remove or block the use of information under general law remain unaffected. However, liability in this regard is only possible from the point in time at which a concrete legal infringement becomes known. Upon becoming aware of corresponding legal infringements, we will remove such content immediately.'],
            ['title' => 'Liability for Links', 'content' => 'Our website contains links to external third-party websites, the content of which we have no influence over. Therefore, we cannot accept any liability for this external content. The respective provider or operator of the pages is always responsible for the content of the linked pages. The linked pages were checked for possible legal violations at the time of linking. No illegal content was apparent at the time of linking.\n\nHowever, permanent monitoring of the content of the linked pages is not reasonable without concrete evidence of a legal violation. If we become aware of legal violations, we will remove such links immediately.'],
            ['title' => 'Copyright', 'content' => 'The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution and any form of commercialisation of such material beyond the scope of the copyright law shall require the prior written consent of its respective author or creator. Downloads and copies of this site are only permitted for private, non-commercial use.\n\nInsofar as the content on this site was not created by the operator, the copyrights of third parties are respected. In particular, third-party content is identified as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. If we become aware of any legal violations, we will remove such content immediately.']
        ];
        foreach ($legalSections as $section) {
            $legalHtml .= "<h2>{$section['title']}</h2><p>" . nl2br($section['content']) . "</p>";
        }

        // 5. Cookie Policy
        $cookieHtml = '<h1>Cookie Information</h1><p>How BillingTool uses cookies on this website</p>';
        $cookieSections = [
            ['title' => 'What Are Cookies?', 'content' => 'Cookies are small text files that are stored on your device (computer, tablet, or smartphone) by your web browser when you visit a website. They are widely used to make websites work efficiently, improve user experience, and provide information to the website operators. Cookies can be "session cookies" (deleted when you close your browser) or "persistent cookies" (remain on your device for a set period).'],
            ['title' => 'Technically Necessary Cookies', 'content' => 'BillingTool uses only technically necessary cookies, which are essential for the operation of the website and cannot be disabled without impacting its functionality. These include:\n\n• Session cookie — keeps you logged in during your visit\n• CSRF protection cookie — protects against cross-site request forgery attacks\n• Language preference cookie — remembers your chosen display language\n\nNo personally identifying information is stored in these cookies beyond what is required for session management. These cookies are set based on our legitimate interest (Art. 6(1)(f) GDPR) in providing a functional and secure service.'],
            ['title' => 'Analytics or Tracking Cookies', 'content' => 'We do not currently use any analytics, advertising, or third-party tracking cookies. If we introduce such technologies in the future, this Cookie Policy will be updated accordingly and we will obtain your explicit consent before setting any non-essential cookies, in accordance with the GDPR and the German Telecommunications-Telemedia Data Protection Act (TTDSG).'],
            ['title' => 'Changing Cookie Settings', 'content' => 'You can control and manage cookies in your browser settings. Please note that disabling technically necessary cookies will affect the functionality of BillingTool and may prevent you from logging in or using key features.\n\nMost browsers offer options to:\n• View cookies stored on your device\n• Block cookies from specific websites\n• Delete all cookies when you close the browser\n\nFor browser-specific guidance, refer to the help pages of your browser (Chrome, Firefox, Safari, Edge, etc.).'],
            ['title' => 'Cookie Retention Duration', 'content' => 'Session cookies are deleted automatically when you close your browser. Persistent cookies used for preferences (such as language settings) are retained for a maximum of 12 months and are renewed each time you use the service. You can delete cookies at any time through your browser settings.']
        ];
        foreach ($cookieSections as $section) {
            $cookieHtml .= "<h2>{$section['title']}</h2><p>" . nl2br($section['content']) . "</p>";
        }

        $now = date('Y-m-d H:i:s');
        
        $builder->where('slug', 'home')->update(['content' => json_encode($homeContent), 'updated_at' => $now]);
        $builder->where('slug', 'privacy-policy')->update(['content' => $privacyHtml, 'updated_at' => $now]);
        $builder->where('slug', 'terms-conditions')->update(['content' => $termsHtml, 'updated_at' => $now]);
        $builder->where('slug', 'legal-notice')->update(['content' => $legalHtml, 'updated_at' => $now]);
        $builder->where('slug', 'cookie-settings')->update(['content' => $cookieHtml, 'updated_at' => $now]);
    }

    public function down()
    {
        // No changes needed for down, table remains
    }
}
