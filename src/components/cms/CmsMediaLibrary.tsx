import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCmsService } from '../../services/adminApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import { Images, Trash2, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface CmsMediaLibraryProps {
    open: boolean;
    onClose: () => void;
    onSelect?: (url: string, altText: string) => void;
}

export function CmsMediaLibrary({ open, onClose, onSelect }: CmsMediaLibraryProps) {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editAlt, setEditAlt] = useState('');
    const [selected, setSelected] = useState<number | null>(null);

    const { data: media = [], isLoading } = useQuery({
        queryKey: ['cms-media'],
        queryFn: adminCmsService.listMedia,
        enabled: open,
    });

    const deleteMutation = useMutation({
        mutationFn: adminCmsService.deleteMedia,
        onSuccess: () => {
            toast.success('Deleted');
            queryClient.invalidateQueries({ queryKey: ['cms-media'] });
        },
        onError: () => toast.error('Delete failed'),
    });

    const altMutation = useMutation({
        mutationFn: ({ id, alt }: { id: number; alt: string }) =>
            adminCmsService.updateMediaAlt(id, alt),
        onSuccess: () => {
            toast.success('Alt text updated');
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ['cms-media'] });
        },
        onError: () => toast.error('Update failed'),
    });

    function handleInsert() {
        if (!onSelect || selected === null) return;
        const item = (media as any[]).find((m: any) => m.id === selected);
        if (item) {
            onSelect(item.url, item.alt_text || '');
            onClose();
        }
    }

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Images className="h-5 w-5" />
                        Media Library
                    </DialogTitle>
                    <DialogDescription>
                        All uploaded CMS images. Click to select, then Insert to use.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>
                    )}

                    {!isLoading && (media as any[]).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Images className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-heading-3">No images uploaded yet.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                        {(media as any[]).map((item: any) => (
                            <div
                                key={item.id}
                                onClick={() => setSelected(item.id === selected ? null : item.id)}
                                className={cn(
                                    'relative group rounded-lg border-2 cursor-pointer overflow-hidden transition-all',
                                    selected === item.id
                                        ? 'border-primary ring-2 ring-primary/30'
                                        : 'border-transparent hover:border-slate-200'
                                )}
                            >
                                <div className="aspect-video bg-slate-100">
                                    <img
                                        src={item.url}
                                        alt={item.alt_text || item.filename}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>

                                {/* Selected check */}
                                {selected === item.id && (
                                    <div className="absolute top-1.5 left-1.5 bg-primary rounded-full p-0.5">
                                        <Check className="h-3 w-3 text-white" />
                                    </div>
                                )}

                                {/* Action bar */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1">
                                    <span className="text-body truncate flex-1">{item.filename}</span>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingId(item.id);
                                                setEditAlt(item.alt_text || '');
                                            }}
                                            className="p-1 rounded hover:bg-white/20"
                                            title="Edit alt text"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this image?')) {
                                                    deleteMutation.mutate(item.id);
                                                    if (selected === item.id) setSelected(null);
                                                }
                                            }}
                                            className="p-1 rounded hover:bg-red-500/60"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Alt text edit inline */}
                                {editingId === item.id && (
                                    <div
                                        className="absolute inset-0 bg-black/80 flex flex-col gap-2 items-center justify-center p-3"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <p className="text-white text-body font-medium">Alt text</p>
                                        <Input
                                            value={editAlt}
                                            onChange={e => setEditAlt(e.target.value)}
                                            placeholder="Describe the image…"
                                            className="text-body h-8"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-7 text-body"
                                                onClick={() => altMutation.mutate({ id: item.id, alt: editAlt })}
                                                disabled={altMutation.isPending}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-body text-white"
                                                onClick={() => setEditingId(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t pt-4 flex items-center justify-between">
                    <p className="text-body text-muted-foreground">
                        {(media as any[]).length} image{(media as any[]).length !== 1 ? 's' : ''} ·
                        {selected ? ' 1 selected' : ' none selected'}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                        {onSelect && (
                            <Button
                                onClick={handleInsert}
                                disabled={selected === null}
                            >
                                Insert Selected
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
