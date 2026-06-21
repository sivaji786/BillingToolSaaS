import { FileText, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useCmsPage } from '../../hooks/useCmsPage';
import { InlineEditableRich } from '../cms/InlineEditableRich';

interface CookiePolicyProps {
    onBack: () => void;
    onNavigate: (screen: string) => void;
}

export function CookiePolicy({ onBack, onNavigate }: CookiePolicyProps) {
    const { t, language } = useLanguage();

    const { content: cmsContent, isLoading } = useCmsPage('cookie-settings', language);

    const sections = [
        { key: 'whatAre', num: '4.1' },
        { key: 'necessary', num: '4.2' },
        { key: 'analytics', num: '4.3' },
        { key: 'settings', num: '4.4' },
        { key: 'retention', num: '4.5' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <button onClick={onBack} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#3d5a80]">
                        <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-body">BillingTool</span>
                </button>
                <div className="flex items-center gap-3">
                    <LanguageSwitcher variant="login" />
                    <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-body text-gray-600">
                        <ArrowLeft className="h-4 w-4" />
                        {t('legal.back')}
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-heading-1 font-medium text-gray-900 dark:text-gray-50 mb-1">
                        {t('cookiePolicy.title')}
                    </h1>
                    <p className="text-body text-gray-500">{t('cookiePolicy.subtitle')}</p>
                </div>

                <div className="space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08a3c]"></div>
                        </div>
                    ) : cmsContent ? (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm prose dark:prose-invert max-w-none">
                            <InlineEditableRich slug="cookie-policy" field="content" lang={language} value={cmsContent} />
                        </div>
                    ) : (
                        sections.map(({ key, num }) => (
                            <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                                <h2 className="text-heading-2 font-medium text-gray-900 dark:text-gray-50 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                                    <span className="text-[#2a8fbd] mr-2">{num}</span>
                                    {t(`cookiePolicy.sections.${key}.title`)}
                                </h2>
                                <p className="text-body text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                                    {t(`cookiePolicy.sections.${key}.content`)}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Legal footer */}
            <footer className="border-t bg-white dark:bg-gray-900 py-5 px-4">
                <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-4 text-micro text-gray-400">
                    <button onClick={() => onNavigate('impressum')} className="hover:text-[#f08a3c] transition-colors">{t('legal.footer.impressum')}</button>
                    <button onClick={() => onNavigate('privacyPolicy')} className="hover:text-[#f08a3c] transition-colors">{t('legal.footer.privacy')}</button>
                    <button onClick={() => onNavigate('termsAndConditions')} className="hover:text-[#f08a3c] transition-colors">{t('legal.footer.terms')}</button>
                    <button onClick={() => onNavigate('cookiePolicy')} className="hover:text-[#f08a3c] transition-colors font-medium text-[#2a8fbd]">{t('legal.footer.cookies')}</button>
                </div>
                <p className="text-center text-micro text-gray-300 mt-3">© 2026 BillingTool Inc. · [mn]medianet</p>
            </footer>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}
