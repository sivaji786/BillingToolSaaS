import React, { useState, useEffect } from 'react';
import { Pencil, X, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { useInlineCms } from '../../contexts/InlineCmsContext';
import { useAdminStore } from '../../stores/adminStore';
import { adminCmsService } from '../../services/adminApi';
import { toast } from 'sonner';
import { useDockSlot } from '../../hooks/useDockSlot';

// ---------------------------------------------------------------------------
// EditModeBar — fixed bottom-right floating bar (SA admin only)
// Also renders a 1 px gradient banner along the top of the viewport when
// edit mode is active.
// ---------------------------------------------------------------------------

const BUILTIN_SLUGS = new Set([
    'home', 'package-comparison', 'legal-notice', 'privacy-policy', 'terms-conditions', 'cookie-settings',
]);

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function EditModeBar() {
    const isAuthenticated = useAdminStore((s) => s.isAuthenticated);
    const { editMode, setEditMode } = useInlineCms();

    // New page modal state
    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [showInNav, setShowInNav] = useState(false);
    const [navLabel, setNavLabel] = useState('');
    const [creating, setCreating] = useState(false);

    // Register floating bar in FloatingDock (order 3 = top slot, admin-only)
    const ping = useDockSlot('edit-mode', 3, () => {
        if (!isAuthenticated) return null;
        return (
            <div className="flex items-center gap-2" role="toolbar" aria-label="CMS edit mode controls">
                {editMode ? (
                    <>
                        <button
                            onClick={() => { window.location.hash = '#/SAdashboard'; }}
                            className="flex items-center gap-1.5 rounded-full border border-purple-300 bg-white px-4 py-2 text-body font-medium text-purple-700 shadow-lg transition-colors hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
                            type="button"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Admin Portal
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 rounded-full border border-purple-300 bg-white px-4 py-2 text-body font-medium text-purple-700 shadow-lg transition-colors hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
                            type="button"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            New Page
                        </button>
                        <div className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-body font-semibold text-white shadow-lg">
                            <span className="inline-block h-2 w-2 rounded-full bg-white" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} aria-hidden="true" />
                            EDITING LIVE
                        </div>
                        <button
                            onClick={() => setEditMode(false)}
                            className="flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-4 py-2 text-body font-medium text-red-600 shadow-lg transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                            type="button"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                            Exit Edit Mode
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-body font-semibold text-white shadow-md transition-all hover:bg-purple-700 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
                        type="button"
                    >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit Page
                    </button>
                )}
            </div>
        );
    });
    useEffect(() => { ping(); }, [isAuthenticated, editMode]);

    if (!isAuthenticated) return null;

    const handleCreate = async () => {
        const t = title.trim();
        const s = slug.trim();
        if (!t || !s) { toast.error('Title and slug are required'); return; }
        if (BUILTIN_SLUGS.has(s)) { toast.error('That slug is reserved'); return; }
        setCreating(true);
        try {
            await adminCmsService.createPage(s, 'en', t, showInNav, navLabel);
            toast.success(`Page "${t}" created`);
            setShowModal(false);
            setTitle(''); setSlug(''); setShowInNav(false); setNavLabel('');
            // Navigate to the new CMS page in edit mode
            window.location.hash = `#/cms/${s}`;
        } catch {
            toast.error('Failed to create page');
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            {/* Top-of-viewport gradient bar — visible in edit mode only */}
            {editMode && (
                <div
                    className="fixed top-0 left-0 w-full"
                    style={{
                        height: '3px',
                        zIndex: 9001,
                        background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 40%, #ec4899 70%, #7c3aed 100%)',
                    }}
                    aria-hidden="true"
                />
            )}

            {/* New Page Modal — rendered as a portal-like fixed overlay */}
            {showModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 9100 }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

                    {/* Panel */}
                    <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl dark:bg-slate-900 p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-heading-3 font-semibold text-slate-900 dark:text-white">Create New Page</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="text-body text-muted-foreground -mt-2">
                            The new page will be available at <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-micro">#/cms/{slug || 'your-slug'}</code>
                        </p>

                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="text-body font-medium text-slate-700 dark:text-slate-300">Page Title</label>
                            <input
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-body outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="e.g. About Us"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setSlug(slugify(e.target.value));
                                }}
                                autoFocus
                            />
                        </div>

                        {/* Slug */}
                        <div className="space-y-1.5">
                            <label className="text-body font-medium text-slate-700 dark:text-slate-300">URL Slug</label>
                            <div className="flex items-center gap-1.5">
                                <span className="text-micro text-muted-foreground whitespace-nowrap">#/cms/</span>
                                <input
                                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-body outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="about-us"
                                    value={slug}
                                    onChange={(e) => setSlug(slugify(e.target.value))}
                                />
                            </div>
                            <p className="text-micro text-muted-foreground">Auto-generated · lowercase letters, numbers, hyphens only</p>
                        </div>

                        {/* Show in Nav toggle */}
                        <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                            <div>
                                <p className="text-body font-medium text-slate-700 dark:text-slate-300">Show in Navigation</p>
                                <p className="text-micro text-muted-foreground mt-0.5">Adds a link in the header &amp; footer</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={showInNav}
                                onClick={() => setShowInNav(!showInNav)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 ${showInNav ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${showInNav ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {showInNav && (
                            <div className="space-y-1.5">
                                <label className="text-body font-medium text-slate-700 dark:text-slate-300">Navigation Label <span className="text-muted-foreground font-normal">(optional)</span></label>
                                <input
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-body outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder={title || 'e.g. About Us'}
                                    value={navLabel}
                                    onChange={(e) => setNavLabel(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-body font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={creating || !title.trim() || !slug.trim()}
                                onClick={handleCreate}
                                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-body font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {creating ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                                ) : (
                                    <><Plus className="h-4 w-4" /> Create Page</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.3; }
                }
            `}</style>
        </>
    );
}
