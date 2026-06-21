import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminTicketService } from '../../../services/adminApi';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ArrowLeft, Loader2, ExternalLink, Save, Calendar, MessageSquare, User, Clock, UserCheck, Paperclip, FileText } from 'lucide-react';
import { format, formatDistanceStrict } from 'date-fns';
import { getApiBaseUrl } from '../../../utils/config';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../../contexts/LanguageContext';

interface SATicketDetailsProps {
    ticketId: string;
    onNavigate: (screen: string) => void;
}

function slaHours(from: string, to: string): string {
    const ms = new Date(to).getTime() - new Date(from).getTime();
    if (ms < 0) return '—';
    return formatDistanceStrict(new Date(from), new Date(to));
}

export function SATicketDetails({ ticketId, onNavigate }: SATicketDetailsProps) {
    const queryClient = useQueryClient();
    const { t } = useLanguage();
    const [status, setStatus] = useState<string>('');
    const [priority, setPriority] = useState<string>('');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ['admin-tickets'],
        queryFn: adminTicketService.getTickets,
    });

    const { data: tracking = [], isLoading: isLoadingTracking } = useQuery({
        queryKey: ['admin-ticket-tracking', ticketId],
        queryFn: () => adminTicketService.getTicketTracking(ticketId),
    });

    const { data: adminStaff = [] } = useQuery({
        queryKey: ['admin-staff'],
        queryFn: adminTicketService.getAdminStaff,
    });

    const ticket = tickets.find((t) => t.id === ticketId);

    useEffect(() => {
        if (ticket) {
            setStatus(ticket.status || 'open');
            setPriority(ticket.priority || 'medium');
            setAssignedTo(ticket.assigned_to ? String(ticket.assigned_to) : '__none__');
        }
    }, [ticket]);

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = getApiBaseUrl().replace(/\/index\.php\/?$/, '');
        return `${baseUrl}/${path.replace(/^\//, '')}`;
    };

    const handleUpdate = async () => {
        if (!ticket) return;
        try {
            setIsUpdating(true);
            const payload: Record<string, unknown> = { status, priority, comment };
            // Only send assigned_to if changed
            const newAssigned = assignedTo === '__none__' ? null : Number(assignedTo);
            const currentAssigned = ticket.assigned_to ?? null;
            if (newAssigned !== currentAssigned) {
                payload.assigned_to = newAssigned;
            }
            await adminTicketService.updateTicket(ticket.id, payload as any);
            await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
            await queryClient.invalidateQueries({ queryKey: ['admin-ticket-tracking', ticketId] });
            setComment('');
            toast.success(t('tickets.updateSuccess'));
        } catch {
            toast.error(t('tickets.updateError'));
        } finally {
            setIsUpdating(false);
        }
    };

    const newAssignedNum = assignedTo === '__none__' ? null : Number(assignedTo);
    const hasChanges = ticket && (
        status !== (ticket.status || 'open') ||
        priority !== (ticket.priority || 'medium') ||
        newAssignedNum !== (ticket.assigned_to ?? null) ||
        comment.trim() !== ''
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" className="mb-4" onClick={() => onNavigate('SATickets')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> {t('tickets.backToTickets')}
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
                        <p className="text-heading-2 text-muted-foreground">{t('tickets.ticketNotFound')}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => onNavigate('SATickets')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> {t('tickets.backToTickets')}
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b bg-slate-50/50 p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        {/* Title */}
                        <div className="space-y-4 flex-1">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-heading-1 font-medium tracking-tight text-slate-900">
                                        {t('tickets.ticketId', { id: ticket.id.toString() })}
                                    </h2>
                                    <Badge variant="secondary" className="font-mono text-body uppercase tracking-widest bg-slate-200/50 text-slate-600 border-none px-2 py-0">
                                        ID: {ticket.id}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-body text-slate-500 font-medium">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span>
                                        {t('tickets.createdOn', { date: ticket.created_at ? format(new Date(ticket.created_at), "PPP 'at' p") : t('tickets.notAvailable') })}
                                    </span>
                                </div>
                            </div>
                            <div className="relative pl-5 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1.5 before:bg-primary before:rounded-full">
                                <h3 className="text-heading-2 font-medium text-slate-800 leading-tight">
                                    {ticket.subject}
                                </h3>
                                {ticket.type && (
                                    <span className="inline-block mt-1.5 text-micro font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                        {ticket.type}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Quick actions panel */}
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-4 min-w-fit">
                            <div className="flex flex-col gap-3 bg-white p-3 rounded-2xl border shadow-sm border-slate-200">
                                {/* Status + Priority row */}
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col flex-1 px-2">
                                        <span className="text-body font-medium text-slate-400 uppercase tracking-widest mb-1">{t('tickets.status.label')}</span>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger className="w-full h-9 border-none bg-transparent hover:bg-slate-50 transition-colors font-medium p-0 shadow-none focus:ring-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">{t('tickets.status.open')}</SelectItem>
                                                <SelectItem value="in_progress">{t('tickets.status.in_progress')}</SelectItem>
                                                <SelectItem value="resolved">{t('tickets.status.resolved')}</SelectItem>
                                                <SelectItem value="closed">{t('tickets.status.closed')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-px h-10 bg-slate-100" />
                                    <div className="flex flex-col flex-1 px-2">
                                        <span className="text-body font-medium text-slate-400 uppercase tracking-widest mb-1">{t('tickets.priority.label')}</span>
                                        <Select value={priority} onValueChange={setPriority}>
                                            <SelectTrigger className="w-full h-9 border-none bg-transparent hover:bg-slate-50 transition-colors font-medium p-0 shadow-none focus:ring-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">{t('tickets.priority.low')}</SelectItem>
                                                <SelectItem value="medium">{t('tickets.priority.medium')}</SelectItem>
                                                <SelectItem value="high">{t('tickets.priority.high')}</SelectItem>
                                                <SelectItem value="critical">{t('tickets.priority.critical')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Assignee row — S4-08 */}
                                <div className="border-t border-slate-100 pt-3 px-2">
                                    <span className="text-body font-medium text-slate-400 uppercase tracking-widest mb-1 block">{t('tickets.assignee')}</span>
                                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                                        <SelectTrigger className="w-full h-9 border border-slate-200 rounded-xl bg-white text-body font-medium focus:ring-2 focus:ring-primary/20">
                                            <UserCheck className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                            <SelectValue placeholder={t('tickets.assignTo')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">{t('tickets.unassigned')}</SelectItem>
                                            {adminStaff.map(admin => (
                                                <SelectItem key={admin.id} value={String(admin.id)}>
                                                    {admin.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {hasChanges && (
                                <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="relative group">
                                        <textarea
                                            className="w-full lg:w-[320px] min-h-[80px] p-3 text-body border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all bg-white hover:border-slate-300 resize-none shadow-sm"
                                            placeholder={t('tickets.addCommentPlaceholder')}
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                        />
                                        <div className="absolute bottom-2 right-3 flex items-center gap-1 text-caption text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded border">
                                            <kbd className="opacity-70">Ctrl + Enter</kbd> to save
                                        </div>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all rounded-2xl h-12"
                                        onClick={handleUpdate}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                        {t('tickets.saveChanges')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 pb-12 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Description */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-micro font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    {t('tickets.columns.description')}
                                </h3>
                                <div className="bg-slate-50 p-7 rounded-[2rem] border border-slate-100 whitespace-pre-wrap text-heading-3 leading-relaxed text-slate-700 shadow-inner min-h-[200px]">
                                    {ticket.description}
                                </div>
                            </div>

                            {/* S4-09: SLA / Response time card */}
                            <div className="space-y-4">
                                <h3 className="text-micro font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    {t('tickets.sla.title')}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-[#f0f6ff]/60 border border-[rgba(30,58,95,0.12)]">
                                        <span className="block text-body uppercase tracking-wider text-[#3d5a80] font-medium mb-1">
                                            {t('tickets.sla.firstResponse')}
                                        </span>
                                        <span className="text-body font-medium text-slate-800">
                                            {ticket.first_response_at && ticket.created_at
                                                ? slaHours(ticket.created_at, ticket.first_response_at)
                                                : <span className="italic text-slate-400">{t('tickets.sla.pending')}</span>}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                                        <span className="block text-body uppercase tracking-wider text-emerald-400 font-medium mb-1">
                                            {t('tickets.sla.resolution')}
                                        </span>
                                        <span className="text-body font-medium text-slate-800">
                                            {ticket.resolved_at && ticket.created_at
                                                ? slaHours(ticket.created_at, ticket.resolved_at)
                                                : <span className="italic text-slate-400">{t('tickets.sla.notResolved')}</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-8 md:border-l md:pl-12 border-slate-100">
                            <div className="space-y-4">
                                <h3 className="text-micro font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2 opacity-70">
                                    <User className="h-3.5 w-3.5" />
                                    {t('tickets.reporterInfo')}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-xl bg-muted/10 border border-slate-100 transition-all hover:bg-muted/20">
                                        <span className="block text-body uppercase tracking-wider text-muted-foreground font-medium mb-1">{t('tickets.columns.ip')}</span>
                                        <span className="text-body font-medium font-mono">{ticket.client_ip || t('tickets.notAvailable')}</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-muted/10 border border-slate-100 transition-all hover:bg-muted/20">
                                        <span className="block text-body uppercase tracking-wider text-muted-foreground font-medium mb-1">{t('tickets.projectId')}</span>
                                        <span className="text-body font-medium font-mono">{ticket.project_id || t('tickets.notAvailable')}</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-muted/10 border border-slate-100 col-span-2 transition-all hover:bg-muted/20">
                                        <span className="block text-body uppercase tracking-wider text-muted-foreground font-medium mb-1">{t('tickets.assignee')}</span>
                                        <span className="text-body font-medium">
                                            {ticket.assigned_to
                                                ? (adminStaff.find(a => a.id === ticket.assigned_to)?.name ?? t('tickets.notAvailable'))
                                                : <span className="italic text-slate-400">{t('tickets.unassigned')}</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {ticket.screenshot_path && (
                                <div className="space-y-4">
                                    <h3 className="text-micro font-medium text-muted-foreground uppercase tracking-widest opacity-70">{t('tickets.attachedScreenshot')}</h3>
                                    <div className="border-2 border-slate-100 rounded-2xl overflow-hidden bg-muted/10 group relative shadow-sm transition-all hover:shadow-md">
                                        <img
                                            src={getImageUrl(ticket.screenshot_path)}
                                            alt="Ticket Screenshot"
                                            className="w-full h-auto object-contain transition-all duration-500 group-hover:scale-[1.05]"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                            <a
                                                href={getImageUrl(ticket.screenshot_path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-medium flex items-center shadow-xl hover:bg-white/90 active:scale-95 transition-all"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                {t('tickets.viewFullSize')}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* File attachments */}
                            {(() => {
                                const paths: string[] = (() => {
                                    try { return ticket.attachments ? JSON.parse(ticket.attachments) : []; }
                                    catch { return []; }
                                })();
                                if (!paths.length) return null;
                                return (
                                    <div className="space-y-4">
                                        <h3 className="text-micro font-medium text-muted-foreground uppercase tracking-widest opacity-70 flex items-center gap-2">
                                            <Paperclip className="h-3.5 w-3.5" />
                                            Attachments ({paths.length})
                                        </h3>
                                        <ul className="space-y-2">
                                            {paths.map((p, i) => {
                                                const url = getImageUrl(p);
                                                const isPdf = p.toLowerCase().endsWith('.pdf');
                                                const name = p.split('/').pop() || p;
                                                return (
                                                    <li key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group">
                                                        {isPdf
                                                            ? <FileText className="h-8 w-8 text-red-400 shrink-0" />
                                                            : <img src={url} alt={name} className="h-10 w-10 object-cover rounded-lg shrink-0 border border-slate-200" />
                                                        }
                                                        <span className="text-body text-slate-700 truncate flex-1 min-w-0">{name}</span>
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <ExternalLink className="h-4 w-4 text-slate-400 hover:text-primary" />
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Ticket Tracking */}
                    <div className="border-t border-slate-100 pt-12">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-heading-2 font-medium text-slate-900 tracking-tight flex items-center gap-2">
                                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </span>
                                {t('tickets.tracking.title')}
                            </h3>
                            <div className="h-px flex-1 bg-slate-100 mx-6 hidden sm:block" />
                        </div>

                        {isLoadingTracking ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-body text-muted-foreground font-medium animate-pulse">{t('common.loading')}</p>
                            </div>
                        ) : tracking.length === 0 ? (
                            <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 text-center">
                                <p className="text-body text-slate-500 font-medium italic">{t('tickets.tracking.noActivity')}</p>
                            </div>
                        ) : (
                            <div className="relative pl-12 space-y-8 before:absolute before:inset-0 before:left-[19px] before:w-0.5 before:bg-gradient-to-b before:from-primary/30 before:via-primary/30 before:to-transparent">
                                {tracking.map((item, index) => {
                                    const dotColor =
                                        item.action === 'created'          ? 'bg-emerald-500' :
                                        item.action === 'comment'          ? 'bg-[#2a8fbd]'  :
                                        item.action === 'assignment_change'? 'bg-[#f0f6ff]0'  :
                                        'bg-amber-500';
                                    const labelColor =
                                        item.action === 'created'          ? 'bg-emerald-50 text-emerald-600' :
                                        item.action === 'comment'          ? 'bg-[#f0f6ff] text-[#2a8fbd]'   :
                                        item.action === 'assignment_change'? 'bg-[#f0f6ff] text-[#2a8fbd]'   :
                                        'bg-amber-50 text-amber-600';
                                    return (
                                        <div key={item.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                            <div className="absolute -left-[37px] top-1.5 w-10 h-10 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                                                <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-wrap items-center gap-x-3 text-micro">
                                                    <span className={`font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${labelColor}`}>
                                                        {t(`tickets.tracking.${item.action}`) || item.action.replace('_', ' ')}
                                                    </span>
                                                    <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                    <time className="font-medium text-slate-500">
                                                        {format(new Date(item.created_at), 'PP p')}
                                                    </time>
                                                </div>
                                                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
                                                    <div className="text-heading-3 prose-sm">
                                                        {item.old_value && (
                                                            <div className="flex items-center gap-3 text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                                <span className="text-micro font-medium uppercase tracking-widest opacity-60">{t('tickets.tracking.changedFrom')}:</span>
                                                                <span className="line-through text-slate-400">{item.old_value}</span>
                                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                                                <span className="font-medium text-slate-900">{item.new_value}</span>
                                                            </div>
                                                        )}
                                                        {!item.old_value && item.new_value && (
                                                            <p className="text-slate-700 font-medium">{item.new_value}</p>
                                                        )}
                                                        {item.comment && (
                                                            <div className="mt-3 bg-[#f0f6ff]/30 p-4 rounded-xl italic text-slate-700 border-l-4 border-[#3d5a80]/50 flex gap-3">
                                                                <svg className="w-5 h-5 text-[#3d5a80] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                                <p className="leading-relaxed">{item.comment}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
