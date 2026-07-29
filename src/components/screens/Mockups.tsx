import { useEffect, useState } from 'react';
import { FileText, ArrowLeft, Folder, ChevronRight, ExternalLink, LayoutTemplate, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { publicMockupService } from '../../services/api';
import type { MockupItem } from '../../services/adminApi';
import { getMockupUrl } from '../../utils/mockupUrl';
import { cn } from '../../lib/utils';

interface MockupsProps {
    onBack: () => void;
    onNavigate: (screen: string) => void;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Mockups({ onBack, onNavigate }: MockupsProps) {
    const { t } = useLanguage();
    const [tree, setTree] = useState<MockupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    // Breadcrumb stack of the directory items we've drilled into.
    const [path, setPath] = useState<MockupItem[]>([]);

    useEffect(() => {
        publicMockupService.list()
            .then(setTree)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    const currentItems: MockupItem[] = path.length === 0 ? tree : (path[path.length - 1].children ?? []);

    const openFolder = (item: MockupItem) => setPath((p) => [...p, item]);
    const goToDepth = (depth: number) => setPath((p) => p.slice(0, depth));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#3d5a80]">
                        <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-100 text-body">BillingTool</span>
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
            <main className="flex-1 w-full px-6 py-8">
                {/* Persistent disclaimer — this public page lists client-mockup files, which may contain
                    fictional or client-preview data and must never be mistaken for live production data. */}
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-body text-amber-800 dark:text-amber-200">{t('mockups.disclaimer')}</p>
                </div>

                <div className="mb-6">
                    <h1 className="text-heading-1 font-medium text-gray-900 dark:text-gray-50 mb-1">
                        {t('mockups.title')}
                    </h1>
                    <p className="text-body text-gray-500">{t('mockups.subtitle')}</p>
                </div>

                {/* Breadcrumb */}
                {!loading && !error && tree.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-5 text-body flex-wrap">
                        <button
                            onClick={() => goToDepth(0)}
                            className={cn(
                                'transition-colors',
                                path.length === 0 ? 'font-medium text-[#1e3a5f]' : 'text-[#2a8fbd] hover:text-[#f08a3c]'
                            )}
                        >
                            {t('mockups.title')}
                        </button>
                        {path.map((p, i) => (
                            <span key={p.path} className="flex items-center gap-1.5">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                <button
                                    onClick={() => goToDepth(i + 1)}
                                    className={cn(
                                        'transition-colors truncate max-w-[200px]',
                                        i === path.length - 1 ? 'font-medium text-[#1e3a5f]' : 'text-[#2a8fbd] hover:text-[#f08a3c]'
                                    )}
                                >
                                    {p.name}
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08a3c]" />
                    </div>
                ) : error ? (
                    <p className="text-body text-gray-500 text-center py-12">{t('mockups.error')}</p>
                ) : tree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <LayoutTemplate className="h-10 w-10 text-slate-300" />
                        <p className="text-body text-gray-500">{t('mockups.empty')}</p>
                    </div>
                ) : currentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <Folder className="h-10 w-10 text-slate-300" />
                        <p className="text-body text-gray-500">{t('mockups.emptyFolder')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {currentItems.map((item) => item.type === 'directory' ? (
                            <button
                                key={item.path}
                                onClick={() => openFolder(item)}
                                className="flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-[#2a8fbd] hover:shadow-md transition-all text-center"
                            >
                                <Folder className="h-10 w-10 text-[#2a8fbd] shrink-0" />
                                <span className="text-body font-medium text-gray-800 dark:text-gray-100 truncate w-full">
                                    {item.name}
                                </span>
                                <span className="text-caption text-gray-400">
                                    {(item.children?.length ?? 0)} item{(item.children?.length ?? 0) !== 1 ? 's' : ''}
                                </span>
                            </button>
                        ) : (
                            <button
                                key={item.path}
                                onClick={() => window.open(getMockupUrl(item.path), '_blank')}
                                title={t('mockups.opensNewTab')}
                                className="group relative flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-[#f08a3c] hover:shadow-md transition-all text-center"
                            >
                                <ExternalLink className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-gray-300 group-hover:text-[#f08a3c] transition-colors" />
                                <FileText className="h-10 w-10 text-gray-400 group-hover:text-[#f08a3c] transition-colors shrink-0" />
                                <span className="text-body font-medium text-gray-800 dark:text-gray-100 truncate w-full">
                                    {item.name}
                                </span>
                                {item.size !== undefined && (
                                    <span className="text-caption text-gray-400">{formatBytes(item.size)}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Legal footer */}
            <footer className="border-t bg-white dark:bg-gray-900 py-5 px-4">
                <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-4 text-micro text-gray-400">
                    <button onClick={() => onNavigate('impressum')} className="hover:text-[#f08a3c] transition-colors">{t('legal.footer.impressum')}</button>
                    <button onClick={() => onNavigate('privacyPolicy')} className="hover:text-[#f08a3c] transition-colors">{t('legal.footer.privacy')}</button>
                    <button onClick={() => onNavigate('termsAndConditions')} className="hover:text-[#f08a3c] transition-colors">{t('legal.footer.terms')}</button>
                    <button onClick={() => onNavigate('cookiePolicy')} className="hover:text-[#f08a3c] transition-colors">{t('legal.footer.cookies')}</button>
                    <button onClick={() => onNavigate('mockups')} className="hover:text-[#f08a3c] transition-colors font-medium text-[#2a8fbd]">{t('legal.footer.mockups')}</button>
                </div>
                <p className="text-center text-micro text-gray-300 mt-3">© 2026 BillingTool Inc. · [mn]medianet</p>
            </footer>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}
