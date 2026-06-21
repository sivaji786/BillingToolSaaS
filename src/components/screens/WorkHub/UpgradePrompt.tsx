import { TrendingUp, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface PlanTier {
    name: string;
    price: string;
    workers: string;
    tasksPerMonth: string;
    storageMb: string;
    aiCalls: string;
    pdfExports: string;
}

const TIERS: PlanTier[] = [
    {
        name: 'Starter',
        price: '€29/mo',
        workers: '5',
        tasksPerMonth: '100',
        storageMb: '500 MB',
        aiCalls: '—',
        pdfExports: '50',
    },
    {
        name: 'Pro',
        price: '€79/mo',
        workers: '25',
        tasksPerMonth: '1,000',
        storageMb: '5 GB',
        aiCalls: '500',
        pdfExports: 'Unlimited',
    },
    {
        name: 'Enterprise',
        price: '€199/mo',
        workers: 'Unlimited',
        tasksPerMonth: 'Unlimited',
        storageMb: '50 GB',
        aiCalls: '5,000',
        pdfExports: 'Unlimited',
    },
];

interface Props {
    limitType?: string;
    onClose: () => void;
    onUpgrade: () => void;
}

function limitLabel(limitType?: string): string {
    const map: Record<string, string> = {
        workhub_workers:           'Worker limit',
        workhub_tasks_per_month:   'Monthly task limit',
        workhub_storage_mb:        'Storage limit',
        workhub_ai_calls_per_month:'AI call limit',
        workhub_pdf_exports:       'PDF export limit',
    };
    return map[limitType ?? ''] ?? 'Plan limit';
}

export function UpgradePrompt({ limitType, onClose, onUpgrade }: Props) {
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#2a8fbd]" />
                        Upgrade Your WorkHub Plan
                    </DialogTitle>
                </DialogHeader>

                {limitType && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-body text-amber-800">
                        <strong>{limitLabel(limitType)}</strong> reached on your current plan.
                        Upgrade to continue.
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3 mt-2">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.name}
                            className={`rounded-lg border p-4 space-y-3 ${tier.name === 'Pro' ? 'border-[rgba(30,58,95,0.25)] ring-1 ring-[rgba(30,58,95,0.25)]' : ''}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-body">{tier.name}</span>
                                {tier.name === 'Pro' && (
                                    <Badge className="bg-[#f08a3c] text-white text-caption">Popular</Badge>
                                )}
                            </div>
                            <p className="text-heading-2 font-medium text-[#1e3a5f]">{tier.price}</p>
                            <ul className="space-y-1.5 text-caption text-muted-foreground">
                                <li className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                    {tier.workers} workers
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                    {tier.tasksPerMonth} tasks/mo
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                    {tier.storageMb} storage
                                </li>
                                <li className="flex items-center gap-1.5">
                                    {tier.aiCalls === '—'
                                        ? <X className="w-3 h-3 text-muted-foreground shrink-0" />
                                        : <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
                                    {tier.aiCalls} AI calls/mo
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                    {tier.pdfExports} PDF exports
                                </li>
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Not now</Button>
                    <Button
                        type="button"
                        className="bg-[#f08a3c] hover:bg-[#e07530] gap-1.5"
                        onClick={onUpgrade}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Upgrade Plan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
