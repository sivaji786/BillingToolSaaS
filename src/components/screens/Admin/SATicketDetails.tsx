import { useQuery } from '@tanstack/react-query';
import { adminTicketService } from '../../../services/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ArrowLeft, Loader2, ExternalLink, Save } from 'lucide-react';
import { format } from 'date-fns';
import { getApiBaseUrl } from '../../../utils/config';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface SATicketDetailsProps {
    ticketId: string;
    onNavigate: (screen: string) => void;
}

export function SATicketDetails({ ticketId, onNavigate }: SATicketDetailsProps) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<string>('');
    const [priority, setPriority] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ['admin-tickets'],
        queryFn: adminTicketService.getTickets,
    });

    const ticket = tickets.find((t) => t.id === ticketId);

    useEffect(() => {
        if (ticket) {
            setStatus(ticket.status || 'open');
            setPriority(ticket.priority || 'medium');
        }
    }, [ticket]);

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${getApiBaseUrl()}/${path.replace(/^\//, '')}`;
    };

    const handleUpdate = async () => {
        if (!ticket) return;

        try {
            setIsUpdating(true);
            await adminTicketService.updateTicket(ticket.id, {
                status,
                priority
            });
            await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
            toast.success('Ticket updated successfully');
        } catch (error) {
            console.error('Error updating ticket:', error);
            toast.error('Failed to update ticket');
        } finally {
            setIsUpdating(false);
        }
    };

    const hasChanges = ticket && (status !== (ticket.status || 'open') || priority !== (ticket.priority || 'medium'));

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
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tickets
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
                        <p className="text-xl text-muted-foreground">Ticket not found.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => onNavigate('SATickets')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tickets
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                    <div>
                        <CardTitle className="text-2xl font-bold">Ticket #{ticket.id}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Created on {ticket.created_at ? format(new Date(ticket.created_at), 'PPP at p') : 'N/A'}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-3 min-w-[200px]">
                        <div className="flex items-center gap-2 w-full justify-end">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</span>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-[130px] h-8">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 w-full justify-end">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Priority:</span>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="w-[130px] h-8">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasChanges && (
                            <Button
                                size="sm"
                                className="mt-2 w-full flex items-center justify-center transition-all bg-emerald-600 hover:bg-emerald-700"
                                onClick={handleUpdate}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Save Changes
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Primary Info */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Subject</h3>
                                <p className="text-lg font-medium">{ticket.subject}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                                <div className="bg-muted/30 p-4 rounded-lg border whitespace-pre-wrap text-sm leading-relaxed">
                                    {ticket.description}
                                </div>
                            </div>
                        </div>

                        {/* Metadata & Attachments */}
                        <div className="space-y-6 border-l pl-8">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Reporter Information</h3>
                                <div className="space-y-2">
                                    <p className="text-sm">
                                        <span className="font-medium mr-2">IP Address:</span>
                                        {ticket.client_ip || 'N/A'}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-medium mr-2">Project ID:</span>
                                        {ticket.project_id || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {ticket.screenshot_path && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Attached Screenshot</h3>
                                    <div className="border rounded-lg overflow-hidden bg-muted/10 group relative">
                                        <img
                                            src={getImageUrl(ticket.screenshot_path)}
                                            alt="Ticket Screenshot"
                                            className="w-full h-auto object-contain transition-transform group-hover:scale-[1.02]"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a
                                                href={getImageUrl(ticket.screenshot_path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white text-black px-4 py-2 rounded-md font-medium flex items-center shadow-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Full Size
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
