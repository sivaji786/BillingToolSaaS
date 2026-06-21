import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inboxService } from '../../services/workhubApi';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';
import { Bell, BellOff, CheckCheck, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

type InboxFilter = 'all' | 'unread' | 'planner' | 'client' | 'system';

interface InboxMessage {
    id: number;
    subject: string;
    body: string;
    sender_name: string;
    sender_type: 'planner' | 'client' | 'system';
    task_id?: number;
    task_title?: string;
    is_read: boolean;
    created_at: string;
}

const FILTER_LABELS: Record<InboxFilter, string> = {
    all: 'All',
    unread: 'Unread',
    planner: 'From Planner',
    client: 'From Client',
    system: 'System',
};

export function WorkHubInbox() {
    const qc = useQueryClient();
    const [activeFilter, setActiveFilter] = useState<InboxFilter>('all');
    const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);

    const { data: messages = [], isLoading } = useQuery({
        queryKey: ['wh-inbox'],
        queryFn: async () => {
            const r = await inboxService.list();
            return (r as any).data as InboxMessage[];
        },
        refetchInterval: 30 * 1000,
    });

    const markReadMutation = useMutation({
        mutationFn: (id: number) => inboxService.markRead(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wh-inbox'] });
            qc.invalidateQueries({ queryKey: ['wh-inbox-unread'] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const unread = messages.filter((m) => !m.is_read);
            await Promise.all(unread.map((m) => inboxService.markRead(m.id)));
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wh-inbox'] });
            qc.invalidateQueries({ queryKey: ['wh-inbox-unread'] });
            toast.success('All messages marked as read');
        },
    });

    const handleSelect = (msg: InboxMessage) => {
        setSelectedMsg(msg);
        if (!msg.is_read) {
            markReadMutation.mutate(msg.id);
        }
    };

    const filtered = messages.filter((m) => {
        if (activeFilter === 'unread') return !m.is_read;
        if (activeFilter === 'planner') return m.sender_type === 'planner';
        if (activeFilter === 'client') return m.sender_type === 'client';
        if (activeFilter === 'system') return m.sender_type === 'system';
        return true;
    });

    const unreadCount = messages.filter((m) => !m.is_read).length;

    return (
        <div className="flex flex-1 min-h-0 min-h-[400px]">
            {/* Left panel — message list */}
            <div className={cn('flex flex-col border-r', selectedMsg ? 'hidden md:flex md:w-2/5' : 'w-full md:w-2/5')}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-[#2a8fbd]" />
                        <span className="font-medium text-body-lg">Inbox</span>
                        {unreadCount > 0 && (
                            <Badge className="bg-[#f08a3c] text-white text-caption px-1.5">{unreadCount}</Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={unreadCount === 0 || markAllReadMutation.isPending}
                        title="Mark all read"
                    >
                        <CheckCheck className="h-4 w-4" />
                    </Button>
                </div>

                {/* Filter — compact select on mobile, chips on md+ */}
                <div className="px-3 py-2 border-b">
                    <Select value={activeFilter} onValueChange={v => setActiveFilter(v as InboxFilter)}>
                        <SelectTrigger className={cn(
                            'h-8 text-caption font-medium',
                            activeFilter !== 'all'
                                ? 'border-[#f08a3c] text-[#f08a3c] bg-[#fff8f3]'
                                : 'border-[rgba(30,58,95,0.15)] text-muted-foreground'
                        )}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(FILTER_LABELS) as InboxFilter[]).map(f => (
                                <SelectItem key={f} value={f}>{FILTER_LABELS[f]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Message list */}
                <div className="flex-1 overflow-y-auto bg-[#f4f8fd]">
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <BellOff className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-body">No messages</p>
                        </div>
                    ) : (
                        <div className="px-3 py-2 space-y-2">
                            {filtered.map((msg) => {
                                const senderInitial = msg.sender_name?.charAt(0).toUpperCase() ?? '?';
                                const senderColors: Record<string, string> = {
                                    planner: 'bg-[#f0f6ff] text-[#1e3a5f]',
                                    client:  'bg-green-50 text-green-700',
                                    system:  'bg-muted text-muted-foreground',
                                };
                                return (
                                    <button
                                        key={msg.id}
                                        onClick={() => handleSelect(msg)}
                                        className={cn(
                                            'w-full text-left bg-background rounded-xl border shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-150 px-3 py-3 flex gap-3',
                                            selectedMsg?.id === msg.id
                                                ? 'border-[#2a8fbd] bg-[#f0f6ff]'
                                                : !msg.is_read
                                                    ? 'border-[rgba(240,138,60,0.4)] bg-[#fff8f3]'
                                                    : 'border-[rgba(30,58,95,0.10)]'
                                        )}
                                    >
                                        {/* Avatar */}
                                        <div className={cn(
                                            'w-9 h-9 rounded-full flex items-center justify-center text-body font-semibold shrink-0',
                                            senderColors[msg.sender_type] ?? 'bg-muted text-muted-foreground'
                                        )}>
                                            {senderInitial}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className={cn('text-body truncate', !msg.is_read ? 'font-semibold text-[#1e3a5f]' : 'font-medium')}>
                                                    {msg.sender_name}
                                                </span>
                                                <span className="text-caption text-muted-foreground shrink-0">
                                                    {format(new Date(msg.created_at), 'MMM d')}
                                                </span>
                                            </div>
                                            <p className={cn('text-body truncate', !msg.is_read ? 'font-medium' : 'text-muted-foreground')}>
                                                {msg.subject}
                                            </p>
                                            <p className="text-caption text-muted-foreground truncate">{msg.body}</p>
                                        </div>

                                        {!msg.is_read && (
                                            <span className="mt-1 w-2 h-2 rounded-full bg-[#f08a3c] shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right panel — message detail */}
            {selectedMsg ? (
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 px-4 py-3 border-b">
                        <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedMsg(null)}>
                            ← Back
                        </Button>
                        <span className="font-medium text-body-lg truncate">{selectedMsg.subject}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex justify-between text-body text-muted-foreground">
                            <span>From: <strong className="text-foreground">{selectedMsg.sender_name}</strong></span>
                            <span>{format(new Date(selectedMsg.created_at), 'PPP HH:mm')}</span>
                        </div>
                        {selectedMsg.task_title && (
                            <div className="bg-[#f0f6ff] border border-[rgba(30,58,95,0.15)] rounded-md px-3 py-2 text-body">
                                Task: <strong>{selectedMsg.task_title}</strong>
                            </div>
                        )}
                        <div className="whitespace-pre-wrap text-body leading-relaxed">{selectedMsg.body}</div>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-body">Select a message to read</p>
                    </div>
                </div>
            )}
        </div>
    );
}
