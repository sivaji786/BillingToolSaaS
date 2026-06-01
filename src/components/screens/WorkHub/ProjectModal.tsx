import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { projectService, customerService, WHProject } from '../../../services/workhubApi';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

const COLOUR_PRESETS = [
    '#6d28d9', '#2563eb', '#059669', '#d97706', '#dc2626',
    '#0891b2', '#7c3aed', '#db2777', '#65a30d', '#6b7280',
];

const STATUS_OPTIONS = [
    { value: 'active',    label: 'Active' },
    { value: 'on_hold',   label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived',  label: 'Archived' },
];

interface Props {
    project?: WHProject | null;
    onClose: () => void;
    onSaved: () => void;
}

export function ProjectModal({ project, onClose, onSaved }: Props) {
    const isEdit = !!project;

    const [name,        setName]        = useState(project?.name ?? '');
    const [description, setDescription] = useState(project?.description ?? '');
    const [status,      setStatus]      = useState<string>(project?.status ?? 'active');
    const [colour,      setColour]      = useState(project?.colour_accent ?? '#6d28d9');
    const [customerId,  setCustomerId]  = useState(
        project?.customer_id ? String(project.customer_id) : '__none__'
    );
    const [startedAt,   setStartedAt]   = useState((project?.started_at ?? '').slice(0, 10));
    const [dueAt,       setDueAt]       = useState((project?.due_at ?? '').slice(0, 10));

    const { data: customers = [] } = useQuery({
        queryKey: ['wh-customers'],
        queryFn: customerService.list,
        staleTime: 5 * 60 * 1000,
    });

    const saveMut = useMutation({
        mutationFn: () => {
            const payload = {
                name,
                description: description || undefined,
                status,
                colour_accent: colour,
                customer_id: customerId !== '__none__' ? Number(customerId) : null,
                started_at: startedAt || undefined,
                due_at: dueAt || undefined,
            };
            return isEdit
                ? projectService.update(project!.id, payload)
                : projectService.create(payload);
        },
        onSuccess: () => {
            toast.success(isEdit ? 'Project updated' : 'Project created');
            onSaved();
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to save project'),
    });

    const canSave = name.trim().length >= 2;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {isEdit ? 'Edit project details.' : 'Create a new WorkHub project.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="proj-name">Name *</Label>
                        <Input
                            id="proj-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Project name…"
                            autoFocus
                        />
                    </div>

                    <div>
                        <Label htmlFor="proj-desc">Description</Label>
                        <textarea
                            id="proj-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description…"
                            className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-body resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Customer</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.company ? `${c.company} — ${c.name}` : c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="proj-start">Start date</Label>
                            <Input id="proj-start" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="proj-due">Due date</Label>
                            <Input id="proj-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <Label>Colour</Label>
                        <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                            {COLOUR_PRESETS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColour(c)}
                                    className={cn(
                                        'w-6 h-6 rounded-full transition-transform hover:scale-110',
                                        colour === c ? 'ring-2 ring-offset-1 ring-ring scale-110' : ''
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <div
                                className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground hover:border-purple-400 cursor-pointer transition-colors"
                                title="Custom colour"
                            >
                                <div className="w-full h-full" style={{ backgroundColor: colour }} />
                                <input
                                    type="color"
                                    value={colour}
                                    onChange={(e) => setColour(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={!canSave || saveMut.isPending}
                            onClick={() => saveMut.mutate()}
                        >
                            {saveMut.isPending && <Loader2 className="animate-spin w-4 h-4 mr-1" />}
                            {isEdit ? 'Save' : 'Create'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
