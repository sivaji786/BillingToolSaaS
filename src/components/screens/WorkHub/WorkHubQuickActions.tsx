import * as React from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, Plus, Clock, Inbox, ChevronUp, X } from 'lucide-react';
import { useDockSlot } from '../../../hooks/useDockSlot';
import { useAuthStore } from '../../../stores/authStore';
import { cn } from '../../../lib/utils';

interface Props {
    onNavigate: (screen: string) => void;
    onNewTask?: () => void;
}

/**
 * WH-074 — WorkHub quick-action launcher registered in the FloatingDock.
 *
 * Registers at order=5 (after Ticket widget at 1, AI at 2, EditMode at 3, Help bot at 4).
 * Shows only when WorkHub is enabled on the tenant plan.
 */
export function WorkHubQuickActions({ onNavigate, onNewTask }: Props) {
    const [open, setOpen] = useState(false);

    const tenant = useAuthStore((s) => s.tenant) as any;
    const workhubEnabled = Boolean(tenant?.plan_features?.workhub_enabled);

    const actions = [
        { label: 'Open Inbox', icon: Inbox, onClick: () => { onNavigate('workhub'); setOpen(false); } },
        { label: 'Start Timer', icon: Clock, onClick: () => { onNavigate('workhub'); setOpen(false); } },
        {
            label: 'New Task',
            icon: Plus,
            onClick: () => {
                onNewTask?.();
                onNavigate('workhub');
                setOpen(false);
            },
        },
    ];

    const panel = open ? createPortal(
        <div
            className="fixed bottom-24 right-6 z-[9999] bg-card border rounded-xl shadow-xl p-2 w-44 space-y-1"
            style={{ zIndex: 9999 }}
        >
            <div className="flex items-center justify-between px-2 py-1">
                <span className="text-caption font-medium text-muted-foreground">WorkHub</span>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                </button>
            </div>
            {actions.map((a) => (
                <button
                    key={a.label}
                    onClick={a.onClick}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body hover:bg-muted transition-colors text-left"
                >
                    <a.icon className="w-3.5 h-3.5 text-[#2a8fbd] shrink-0" />
                    {a.label}
                </button>
            ))}
        </div>,
        document.body,
    ) : null;

    const ping = useDockSlot('workhub-quick-actions', 5, () => {
        if (!workhubEnabled) return null;

        return (
            <>
                <button
                    onClick={() => setOpen((p) => !p)}
                    className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors',
                        open
                            ? 'bg-[#e07530] text-white'
                            : 'bg-[#f08a3c] hover:bg-[#e07530] text-white',
                    )}
                    title="WorkHub quick actions"
                >
                    {open ? <ChevronUp className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                </button>
                {panel}
            </>
        );
    });

    React.useEffect(() => {
        ping();
    }, [open, workhubEnabled]);

    return null;
}
