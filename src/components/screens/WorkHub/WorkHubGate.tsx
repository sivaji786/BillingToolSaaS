import { ReactNode } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Briefcase, Zap } from 'lucide-react';

interface Props {
    children: ReactNode;
    onUpgrade: () => void;
}

export function WorkHubGate({ children, onUpgrade }: Props) {
    const tenant = useAuthStore((s) => s.tenant);

    const plan: Record<string, unknown> = (tenant as any)?.plan_features ?? {};
    const enabled = Boolean(plan['workhub_enabled']);

    if (!enabled) {
        const tasksPerMonth = Number(plan['workhub_tasks_per_month'] ?? 0);
        const aiCalls = Number(plan['workhub_ai_calls_per_month'] ?? 0);
        const workers = Number(plan['workhub_workers'] ?? 0);

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 gap-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#f0f6ff]">
                    <Briefcase className="w-8 h-8 text-[#2a8fbd]" />
                </div>
                <div className="text-center max-w-md">
                    <h2 className="text-heading-1 font-medium mb-2">WorkHub is not included in your plan</h2>
                    <p className="text-body text-muted-foreground mb-6">
                        WorkHub gives your team real-time task management, time tracking, digital completion reports,
                        and auto-invoicing for field-service work.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full max-w-sm text-center">
                    {[
                        { label: 'Workers', value: workers || '—' },
                        { label: 'Tasks/mo', value: tasksPerMonth || '—' },
                        { label: 'AI calls', value: aiCalls || '—' },
                    ].map(({ label, value }) => (
                        <Card key={label} className="py-3">
                            <CardContent className="p-2">
                                <div className="text-heading-2 font-medium text-[#2a8fbd]">{value}</div>
                                <div className="text-caption text-muted-foreground">{label}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Button onClick={onUpgrade} className="bg-[#f08a3c] hover:bg-[#e07530] gap-2">
                    <Zap className="w-4 h-4" />
                    Upgrade to unlock WorkHub
                </Button>
            </div>
        );
    }

    const quotas: { label: string; used?: number; limit?: number; unit?: string }[] = [];
    const tasksUsed = Number((tenant as any)?.workhub_tasks_used ?? 0);
    const tasksLimit = Number(plan['workhub_tasks_per_month'] ?? 0);
    if (tasksLimit > 0) {
        quotas.push({ label: 'Tasks this month', used: tasksUsed, limit: tasksLimit });
    }

    return (
        <>
            {quotas.length > 0 && (
                <div className="flex gap-3 px-4 py-1 border-b bg-[#f0f6ff]/50 text-caption text-muted-foreground flex-wrap">
                    {quotas.map(({ label, used, limit }) => (
                        <span key={label}>
                            {label}:{' '}
                            <Badge variant="outline" className="text-caption py-0">
                                {used}/{limit === -1 ? '∞' : limit}
                            </Badge>
                        </span>
                    ))}
                </div>
            )}
            {children}
        </>
    );
}
