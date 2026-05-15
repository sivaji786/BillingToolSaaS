<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class SeedSignupPanelCmsPage extends Migration
{
    private const SLUG = 'signup-panel';

    private array $content = [
        'en' => [
            'heading'   => "The smarter way\nto manage invoices",
            'subheading' => 'Create, send and track professional invoices — all in one place.',
            'feature_0' => 'EN 16931 compliant invoices in seconds',
            'feature_1' => 'Real-time revenue & payment tracking',
            'feature_2' => 'Multi-user with role-based access control',
            'feature_3' => 'Bank-grade security & full audit trail',
            'badge_text' => 'No credit card required',
        ],
        'de' => [
            'heading'   => "Rechnungen smarter\nverwalten",
            'subheading' => 'Erstellen, versenden und verfolgen Sie professionelle Rechnungen — alles an einem Ort.',
            'feature_0' => 'EN 16931-konforme Rechnungen in Sekunden',
            'feature_1' => 'Echtzeit-Umsatz- & Zahlungsverfolgung',
            'feature_2' => 'Mehrbenutzer mit rollenbasierter Zugriffskontrolle',
            'feature_3' => 'Bank-Sicherheit & vollständiger Prüfpfad',
            'badge_text' => 'Keine Kreditkarte erforderlich',
        ],
        'ar' => [
            'heading'   => "الطريقة الأذكى\nلإدارة الفواتير",
            'subheading' => 'أنشئ وأرسل وتتبع الفواتير الاحترافية — كل ذلك في مكان واحد.',
            'feature_0' => 'فواتير متوافقة مع EN 16931 في ثوانٍ',
            'feature_1' => 'تتبع الإيرادات والمدفوعات في الوقت الفعلي',
            'feature_2' => 'متعدد المستخدمين مع التحكم في الوصول القائم على الأدوار',
            'feature_3' => 'أمان بمستوى بنكي وسجل تدقيق كامل',
            'badge_text' => 'لا يلزم بطاقة ائتمانية',
        ],
        'pl' => [
            'heading'   => "Inteligentniejszy sposób\nzarządzania fakturami",
            'subheading' => 'Twórz, wysyłaj i śledź profesjonalne faktury — wszystko w jednym miejscu.',
            'feature_0' => 'Faktury zgodne z EN 16931 w kilka sekund',
            'feature_1' => 'Śledzenie przychodów i płatności w czasie rzeczywistym',
            'feature_2' => 'Wielu użytkowników z kontrolą dostępu opartą na rolach',
            'feature_3' => 'Bezpieczeństwo bankowe i pełny ślad audytu',
            'badge_text' => 'Nie wymaga karty kredytowej',
        ],
    ];

    public function up(): void
    {
        $now = date('Y-m-d H:i:s');

        foreach ($this->content as $lang => $fields) {
            $existing = $this->db->table('cms_pages')
                ->where('slug', self::SLUG)
                ->where('lang', $lang)
                ->get()->getRowArray();

            if ($existing) {
                continue;
            }

            $this->db->table('cms_pages')->insert([
                'slug'        => self::SLUG,
                'lang'        => $lang,
                'title'       => 'Signup Panel',
                'content'     => json_encode($fields, JSON_UNESCAPED_UNICODE),
                'show_in_nav' => 0,
                'is_published'=> 1,
                'updated_at'  => $now,
            ]);
        }
    }

    public function down(): void
    {
        $this->db->table('cms_pages')->where('slug', self::SLUG)->delete();
    }
}
