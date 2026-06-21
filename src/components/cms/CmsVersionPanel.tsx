import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCmsService } from '../../services/adminApi';
import { Button } from '../ui/button';
import { History, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface CmsVersionPanelProps {
    slug: string;
    lang: string;
}

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export function CmsVersionPanel({ slug, lang }: CmsVersionPanelProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [restoringId, setRestoringId] = useState<number | null>(null);

    const { data: versions = [], isLoading } = useQuery({
        queryKey: ['cms-versions', slug, lang],
        queryFn: () => adminCmsService.listVersions(slug, lang),
        enabled: open,
    });

    const saveMutation = useMutation({
        mutationFn: () => adminCmsService.saveVersion(slug, lang),
        onSuccess: () => {
            toast.success('Version snapshot saved');
            queryClient.invalidateQueries({ queryKey: ['cms-versions', slug, lang] });
        },
        onError: () => toast.error('Failed to save version'),
    });

    async function handleRestore(id: number) {
        if (!confirm('Restore this version? Current content will be overwritten.')) return;
        setRestoringId(id);
        try {
            await adminCmsService.restoreVersion(id);
            toast.success('Version restored — reload to see changes');
            queryClient.invalidateQueries({ queryKey: ['admin-cms-pages'] });
        } catch {
            toast.error('Restore failed');
        } finally {
            setRestoringId(null);
        }
    }

    return (
        <div className="rounded-xl border bg-white/60 dark:bg-slate-900/60 backdrop-blur shadow-xl">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center justify-between w-full px-6 py-4 text-left"
            >
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-heading-3">Version History</span>
                </div>
                <span className="text-body text-muted-foreground">{open ? 'Hide' : 'Show'}</span>
            </button>

            {open && (
                <div className="border-t px-6 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-body text-muted-foreground">Save a snapshot before major edits to enable rollback.</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                        >
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            {saveMutation.isPending ? 'Saving…' : 'Save Snapshot'}
                        </Button>
                    </div>

                    {isLoading && <p className="text-heading-3 text-muted-foreground">Loading…</p>}

                    {!isLoading && versions.length === 0 && (
                        <p className="text-heading-3 text-muted-foreground text-center py-4">No versions saved yet.</p>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {(versions as any[]).map((v: any) => (
                            <div key={v.id} className="flex items-center justify-between rounded-lg border bg-slate-50 dark:bg-slate-900 px-3 py-2">
                                <div>
                                    <p className="text-body font-medium">{relativeTime(v.saved_at)}</p>
                                    <p className="text-body text-muted-foreground">{v.saved_by_label} · {new Date(v.saved_at).toLocaleString()}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-body"
                                    disabled={restoringId === v.id}
                                    onClick={() => handleRestore(v.id)}
                                >
                                    <RotateCcw className={cn('h-3 w-3 mr-1', restoringId === v.id && 'animate-spin')} />
                                    {restoringId === v.id ? 'Restoring…' : 'Restore'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
