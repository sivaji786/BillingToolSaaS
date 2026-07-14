import { useEffect, useState } from 'react';
import { FileText, ArrowLeft, Folder, ChevronRight, ChevronDown, ExternalLink, LayoutTemplate } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
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

function collectAllFolderPaths(items: MockupItem[]): string[] {
    const paths: string[] = [];
    for (const item of items) {
        if (item.type === 'directory') {
            paths.push(item.path);
            if (item.children) paths.push(...collectAllFolderPaths(item.children));
        }
    }
    return paths;
}

export function Mockups({ onBack, onNavigate }: MockupsProps) {
    const { t } = useLanguage();
    const [tree, setTree] = useState<MockupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [previewFile, setPreviewFile] = useState<MockupItem | null>(null);

    useEffect(() => {
        publicMockupService.list()
            .then((data) => {
                setTree(data);
                // Expand all folders by default — guests have no reason to start collapsed.
                setExpandedFolders(new Set(collectAllFolderPaths(data)));
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    const toggleFolder = (path: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    const renderTree = (items: MockupItem[], depth = 0): React.ReactNode => items.map((item) => {
        const pl = depth * 16 + 8;

        if (item.type === 'directory') {
            const isExpanded = expandedFolders.has(item.path);
            return (
                <div key={item.path}>
                    <div
                        className="flex items-center gap-1.5 pr-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        style={{ paddingLeft: pl }}
                        onClick={() => toggleFolder(item.path)}
                    >
                        {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-[#2a8fbd] shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-[#2a8fbd] shrink-0" />}
                        <Folder className="h-4 w-4 text-[#2a8fbd] shrink-0" />
                        <span className="flex-1 min-w-0 text-body font-medium text-slate-700 truncate select-none">
                            {item.name}
                        </span>
                    </div>
                    {isExpanded && (
                        item.children && item.children.length > 0
                            ? <div>{renderTree(item.children, depth + 1)}</div>
                            : <p className="text-micro text-slate-400 italic py-1" style={{ paddingLeft: pl + 28 }}>Empty</p>
                    )}
                </div>
            );
        }

        const isSelected = previewFile?.path === item.path;
        return (
            <div
                key={item.path}
                className={cn(
                    'group flex items-center gap-2 pr-3 py-1.5 rounded-lg cursor-pointer transition-all border',
                    isSelected ? 'bg-[#f0f6ff] border-[rgba(30,58,95,0.15)]' : 'hover:bg-slate-50 border-transparent'
                )}
                style={{ paddingLeft: pl }}
                onClick={() => setPreviewFile(item)}
            >
                <FileText className={cn('h-4 w-4 shrink-0', isSelected ? 'text-[#2a8fbd]' : 'text-slate-400')} />
                <div className="flex-1 min-w-0">
                    <p className={cn('text-body truncate font-medium', isSelected ? 'text-[#1e3a5f]' : 'text-slate-700')}>
                        {item.name}
                    </p>
                    {item.size !== undefined && (
                        <p className="text-micro text-slate-400">{formatBytes(item.size)}</p>
                    )}
                </div>
                <button
                    title="Open in new tab"
                    onClick={(e) => { e.stopPropagation(); window.open(getMockupUrl(item.path), '_blank'); }}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    });

    return (
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="shrink-0 bg-white dark:bg-gray-900 border-b px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
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
            <main className="flex-1 w-full px-6 py-8 flex flex-col min-h-0 overflow-hidden">
                <div className="mb-6 shrink-0">
                    <h1 className="text-heading-1 font-medium text-gray-900 dark:text-gray-50 mb-1">
                        {t('mockups.title')}
                    </h1>
                    <p className="text-body text-gray-500">{t('mockups.subtitle')}</p>
                </div>

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
                ) : (
                    <div className="flex flex-1 min-h-0 gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        {/* Left — tree (hidden on mobile once a file is selected) */}
                        <div className={cn(
                            'w-full md:w-72 md:shrink-0 border-r border-gray-100 dark:border-gray-800 p-3 overflow-hidden',
                            previewFile ? 'hidden md:block' : 'block'
                        )}>
                            <ScrollArea className="h-full">
                                <div className="space-y-0.5">{renderTree(tree)}</div>
                            </ScrollArea>
                        </div>

                        {/* Right — preview */}
                        <div className={cn('flex-1 min-w-0 min-h-0 flex-col p-3', previewFile ? 'flex' : 'hidden md:flex')}>
                            {previewFile ? (
                                <>
                                    <div className="flex items-center justify-between mb-3 shrink-0">
                                        <button
                                            onClick={() => setPreviewFile(null)}
                                            className="md:hidden flex items-center gap-1 text-caption text-[#2a8fbd] hover:underline"
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" /> Back to list
                                        </button>
                                        <h2 className="hidden md:block text-heading-3 font-medium text-slate-700 truncate">
                                            {previewFile.name}
                                        </h2>
                                        <button
                                            onClick={() => window.open(getMockupUrl(previewFile.path), '_blank')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-micro font-medium rounded-md bg-[#f08a3c] text-white hover:bg-[#e07530] transition-colors shadow-sm"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            New Tab
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                        <iframe
                                            key={previewFile.path}
                                            src={getMockupUrl(previewFile.path)}
                                            title={previewFile.name}
                                            className="block w-full h-full border-0"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="hidden md:flex flex-1 items-center justify-center text-center text-gray-400">
                                    <p className="text-body">{t('mockups.selectPrompt')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Legal footer */}
            <footer className="shrink-0 border-t bg-white dark:bg-gray-900 py-5 px-4">
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
