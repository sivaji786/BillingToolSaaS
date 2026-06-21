import { WHWorker } from '../../../services/workhubApi';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import { format } from 'date-fns';

interface CapacityCardProps {
    worker: WHWorker;
    selected?: boolean;
    onClick?: (worker: WHWorker) => void;
}

function utilisationColour(pct: number | undefined): string {
    if (pct === undefined) return 'bg-gray-200';
    if (pct > 90) return 'bg-red-500';
    if (pct > 70) return 'bg-amber-400';
    return 'bg-green-500';
}

function utilisationBadge(pct: number | undefined): 'destructive' | 'secondary' | 'default' {
    if (pct === undefined) return 'secondary';
    if (pct > 90) return 'destructive';
    if (pct > 70) return 'secondary';
    return 'default';
}

export function CapacityCard({ worker, selected, onClick }: CapacityCardProps) {
    const pct = worker.utilisation_pct ?? 0;
    const initials = worker.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    return (
        <div
            onClick={() => onClick?.(worker)}
            className={cn(
                'border rounded-lg p-4 cursor-pointer transition-all',
                selected
                    ? 'border-[#f08a3c] ring-2 ring-[rgba(30,58,95,0.20)] bg-[#f0f6ff]'
                    : 'border-border hover:border-[rgba(30,58,95,0.20)] hover:bg-muted/40',
                onClick ? 'cursor-pointer' : 'cursor-default'
            )}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f6ff] text-[#1e3a5f] flex items-center justify-center font-medium text-body-lg flex-shrink-0">
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-body-lg truncate">{worker.name}</p>
                    {worker.role && (
                        <p className="text-caption text-muted-foreground truncate">{worker.role}</p>
                    )}
                </div>
                <Badge variant={utilisationBadge(worker.utilisation_pct)} className="ml-auto shrink-0 text-caption">
                    {pct.toFixed(0)}%
                </Badge>
            </div>

            {/* Utilisation bar */}
            <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                <div
                    className={cn('h-1.5 rounded-full transition-all', utilisationColour(worker.utilisation_pct))}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>

            <div className="flex justify-between text-caption text-muted-foreground">
                <span>Queue: <strong className="text-foreground">{worker.queue_depth ?? 0}</strong> tasks</span>
                {worker.free_from_date && (
                    <span>
                        Free from: <strong className="text-foreground">
                            {format(new Date(worker.free_from_date), 'MMM d')}
                        </strong>
                    </span>
                )}
            </div>
        </div>
    );
}

interface CapacityGridProps {
    workers: WHWorker[];
    selectedWorkerId?: number;
    onSelect?: (worker: WHWorker) => void;
}

export function CapacityGrid({ workers, selectedWorkerId, onSelect }: CapacityGridProps) {
    if (workers.length === 0) {
        return (
            <p className="text-center text-muted-foreground text-body py-8">
                No workers found.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workers.map((w) => (
                <CapacityCard
                    key={w.id}
                    worker={w}
                    selected={selectedWorkerId === w.id}
                    onClick={onSelect}
                />
            ))}
        </div>
    );
}
