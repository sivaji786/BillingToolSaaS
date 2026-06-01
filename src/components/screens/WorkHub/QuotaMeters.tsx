import { useQuery } from '@tanstack/react-query';
import { Zap, HardDrive, ListTodo } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { settingsService } from '../../../services/workhubApi';
import { useAuthStore } from '../../../stores/authStore';

interface QuotaMeter {
    label: string;
    icon: React.ElementType;
    used: number;
    limit: number;
    unit?: string;
}

function MeterBar({ used, limit, unit }: { used: number; limit: number; unit?: string }) {
    const pct = limit <= 0 ? 0 : Math.min((used / limit) * 100, 100);
    const unlimited = limit < 0;
    return (
        <div className="space-y-0.5">
            <div className="flex justify-between text-caption text-muted-foreground">
                <span>{used.toLocaleString()}{unit ? ` ${unit}` : ''}</span>
                <span>{unlimited ? '∞' : limit.toLocaleString()}{unit ? ` ${unit}` : ''}</span>
            </div>
            {!unlimited && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all',
                            pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-purple-500'
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
        </div>
    );
}

export function QuotaMeters() {
    const tenant = useAuthStore((s) => s.tenant) as any;
    const planFeatures = tenant?.plan_features ?? {};

    const { data: usage } = useQuery({
        queryKey: ['wh-quota-usage'],
        queryFn: settingsService.usage,
        staleTime: 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });

    const meters: QuotaMeter[] = [
        {
            label: 'Tasks this month',
            icon: ListTodo,
            used: usage?.tasks_created ?? 0,
            limit: planFeatures.workhub_tasks_per_month ?? 0,
        },
        {
            label: 'Storage',
            icon: HardDrive,
            used: Math.round((usage?.storage_bytes_used ?? 0) / (1024 * 1024)),
            limit: planFeatures.workhub_storage_mb ?? 0,
            unit: 'MB',
        },
        {
            label: 'AI calls',
            icon: Zap,
            used: usage?.ai_calls_used ?? 0,
            limit: planFeatures.workhub_ai_calls_per_month ?? 0,
        },
    ];

    return (
        <div className="space-y-3 p-3 rounded-lg border bg-card">
            <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                Monthly Quotas
            </p>
            {meters.map((m) => (
                <div key={m.label} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-caption font-medium">
                        <m.icon className="w-3.5 h-3.5 text-purple-500" />
                        {m.label}
                    </div>
                    <MeterBar used={m.used} limit={m.limit} unit={m.unit} />
                </div>
            ))}
        </div>
    );
}
