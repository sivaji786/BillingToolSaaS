import { FileText, ArrowLeft, Mail, Phone, Printer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useCmsPage } from '../../hooks/useCmsPage';
import { InlineEditableRich } from '../cms/InlineEditableRich';

interface ImpressumProps {
    onBack: () => void;
    onNavigate: (screen: string) => void;
}

export function Impressum({ onBack, onNavigate }: ImpressumProps) {
    const { t, language } = useLanguage();

    const { content: cmsContent, isLoading } = useCmsPage('legal-notice', language);

    const sections = [
        {
            title: t('impressum.sections.legalNotice.title'),
            content: t('impressum.sections.legalNotice.content'),
        },
        {
            title: t('impressum.sections.vat.title'),
            content: t('impressum.sections.vat.content'),
        },
        {
            title: t('impressum.sections.dispute.title'),
            content: t('impressum.sections.dispute.content'),
        },
        {
            title: t('impressum.sections.liability.title'),
            content: t('impressum.sections.liability.content'),
        },
        {
            title: t('impressum.sections.links.title'),
            content: t('impressum.sections.links.content'),
        },
        {
            title: t('impressum.sections.copyright.title'),
            content: t('impressum.sections.copyright.content'),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
                        <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-body">BillingTool</span>
                </a>
                <div className="flex items-center gap-3">
                    <LanguageSwitcher variant="login" />
                    <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-body text-gray-600">
                        <ArrowLeft className="h-4 w-4" />
                        {t('legal.back')}
                    </Button>
                </div>
            </header>

            {/* Page content */}
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
                {/* Page title */}
                <div className="mb-8">
                    <h1 className="text-heading-1 font-bold text-gray-900 dark:text-gray-50 mb-1">
                        {t('impressum.title')}
                    </h1>
                    <p className="text-body text-gray-500">{t('impressum.subtitle')}</p>
                </div>

                <div className="space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                    ) : cmsContent ? (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm prose dark:prose-invert max-w-none">
                            <InlineEditableRich slug="impressum" field="content" lang={language} value={cmsContent} />
                        </div>
                    ) : (
                        <>
                            {/* Company block */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8 shadow-sm">
                                <p className="text-micro font-semibold uppercase tracking-wider text-purple-600 mb-3">
                                    {t('impressum.sections.legalNotice.title')}
                                </p>
                                <p className="font-semibold text-gray-900 dark:text-gray-50 text-heading-3">[mn]medianet</p>
                                <p className="text-gray-700 dark:text-gray-300 mt-0.5">Bernhard Hnida</p>
                                <p className="text-gray-600 dark:text-gray-400 text-body mt-1">Am Taubhaus 29</p>
                                <p className="text-gray-600 dark:text-gray-400 text-body">63303 Dreieich</p>

                                <div className="mt-4 space-y-1.5">
                                    <div className="flex items-center gap-2 text-body text-gray-600 dark:text-gray-400">
                                        <Phone className="h-3.5 w-3.5 text-purple-500" />
                                        <span>{t('impressum.phone')}: +49 (0) 6103 / 69 77 84</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-body text-gray-600 dark:text-gray-400">
                                        <Printer className="h-3.5 w-3.5 text-purple-500" />
                                        <span>{t('impressum.fax')}: +49 (0) 6103 / 69 77 85</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-body text-gray-600 dark:text-gray-400">
                                        <Mail className="h-3.5 w-3.5 text-purple-500" />
                                        <a href="mailto:info@medianet-home.de" className="text-purple-600 hover:underline">
                                            info@medianet-home.de
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Legal sections */}
                            <div className="space-y-6">
                                {sections.map((section, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
                                    >
                                        <h2 className="text-heading-2 font-semibold text-gray-900 dark:text-gray-50 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                                            {section.title}
                                        </h2>
                                        <p className="text-body text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                                            {section.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Source note */}
                <p className="text-micro text-gray-400 mt-8 text-center">
                    {t('impressum.sourceNote')}
                </p>
            </main>

            {/* Legal footer */}
            <footer className="border-t bg-white dark:bg-gray-900 py-5 px-4">
                <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-4 text-micro text-gray-400">
                    <button onClick={() => onNavigate('impressum')} className="hover:text-purple-600 transition-colors font-semibold text-purple-600">{t('legal.footer.impressum')}</button>
                    <button onClick={() => onNavigate('privacyPolicy')} className="hover:text-purple-600 transition-colors">{t('legal.footer.privacy')}</button>
                    <button onClick={() => onNavigate('termsAndConditions')} className="hover:text-purple-600 transition-colors">{t('legal.footer.terms')}</button>
                    <button onClick={() => onNavigate('cookiePolicy')} className="hover:text-purple-600 transition-colors">{t('legal.footer.cookies')}</button>
                </div>
                <p className="text-center text-micro text-gray-300 mt-3">© 2026 BillingTool Inc. · [mn]medianet</p>
            </footer>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}
