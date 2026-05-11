import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { publicCmsService } from '../../services/api';
import { adminCmsService } from '../../services/adminApi';
import { Button } from '../ui/button';
import { ArrowLeft, FileText, Loader2, Pencil, Trash2 } from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { EditModeBar } from '../cms/EditModeBar';
import { useInlineCms } from '../../contexts/InlineCmsContext';
import { toast } from 'sonner';

interface CmsPageViewProps {
    slug: string;
    onBack: () => void;
    onNavigate: (screen: string) => void;
}

export function CmsPageView({ slug, onBack, onNavigate }: CmsPageViewProps) {
    const { language } = useLanguage();
    const { editMode } = useInlineCms();
    const [page, setPage] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setLoading(true);
        setNotFound(false);
        setDeleteConfirm(false);
        publicCmsService.getPage(slug, language)
            .then((res) => {
                const data = res?.data;
                if (!data || (!data.title && !data.content)) {
                    setNotFound(true);
                } else {
                    setPage(data);
                }
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug, language]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await adminCmsService.deleteCmsPage(slug);
            toast.success('Page deleted');
            onNavigate('landing');
        } catch {
            toast.error('Failed to delete page');
            setDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
                <FileText className="h-16 w-16 text-muted-foreground opacity-20" />
                <h1 className="text-2xl font-bold">Page not found</h1>
                <p className="text-muted-foreground">The page you are looking for does not exist or has not been published yet.</p>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                </Button>
                <EditModeBar />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <div className="h-5 w-px bg-border" />
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
                            <FileText className="h-5 w-5 text-purple-600" />
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
                                BillingTool
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {editMode && (
                            <>
                                {/* Edit in admin */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-1.5"
                                    onClick={() => {
                                        sessionStorage.setItem('cms_edit_slug', slug);
                                        window.location.hash = '#/SAPages';
                                    }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                </Button>

                                {/* Delete — two-step inline confirm */}
                                {!deleteConfirm ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                                        onClick={() => setDeleteConfirm(true)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5">
                                        <span className="text-xs font-medium text-red-700 whitespace-nowrap">Delete this page?</span>
                                        <button
                                            disabled={deleting}
                                            onClick={handleDelete}
                                            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                        >
                                            {deleting ? 'Deleting…' : 'Yes, delete'}
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(false)}
                                            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        <LanguageSwitcher variant="login" />
                    </div>
                </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 container px-4 md:px-6 py-12 max-w-4xl mx-auto">
                {page?.title && (
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{page.title}</h1>
                )}
                {page?.content ? (
                    <div
                        className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-purple-600 hover:prose-a:text-purple-700"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                    />
                ) : (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>This page has no content yet.</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t bg-slate-50 dark:bg-slate-950 py-8 mt-auto">
                <div className="container px-4 md:px-6 text-center text-sm text-muted-foreground">
                    © 2026 BillingTool Inc.
                </div>
            </footer>

            <EditModeBar />
        </div>
    );
}
