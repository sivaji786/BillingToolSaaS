import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { taskService, WHTask, TaskStatus } from '../../../services/workhubApi';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

const STATUS_COLORS: Record<TaskStatus, string> = {
    open:        'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    done:        'bg-green-100 text-green-700',
    problem:     'bg-red-100 text-red-700',
};

interface Props {
    locationTag: string;
    currentTaskId: number;
    onTaskSelect: (id: number) => void;
}

export function BatchLocationPanel({ locationTag, currentTaskId, onTaskSelect }: Props) {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();

    const { data: tasks = [], isLoading } = useQuery<WHTask[]>({
        queryKey: ['wh-batch-location', locationTag],
        queryFn: () => taskService.batchLocation(locationTag),
        enabled: open,
    });

    const others = tasks.filter((t) => t.id !== currentTaskId && t.status !== 'done');

    if (others.length === 0 && !isLoading && open) {
        return (
            <div className="rounded-lg border p-3 text-body text-muted-foreground text-center">
                No other open tasks at this location.
            </div>
        );
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/50 hover:bg-muted text-body font-medium transition-colors"
            >
                <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="flex-1 text-left">Also at {locationTag}</span>
                {!open && others.length > 0 && (
                    <Badge variant="outline" className="text-caption">{others.length}</Badge>
                )}
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {open && (
                <div className="divide-y">
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
                        </div>
                    ) : (
                        others.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                                <div className="flex-1 min-w-0">
                                    <div className="text-body truncate">{t.title}</div>
                                    <Badge className={cn('text-[10px] px-1.5 py-0 mt-0.5', STATUS_COLORS[t.status])}>
                                        {t.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0"
                                    onClick={() => onTaskSelect(t.id)}
                                >
                                    View
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
