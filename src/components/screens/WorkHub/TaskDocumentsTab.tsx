import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { printService } from '../../../services/workhubApi';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Skeleton } from '../../ui/skeleton';
import { FileText, Download, RefreshCw, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type DocType = 'work-order' | 'completion-certificate' | 'timesheet' | 'project-status' | 'invoice' | 'consent-form';

const DOCUMENT_TYPES: { type: DocType; label: string; requiresCompletion: boolean }[] = [
    { type: 'work-order',              label: 'Work Order',              requiresCompletion: false },
    { type: 'completion-certificate',  label: 'Completion Certificate',  requiresCompletion: true },
    { type: 'timesheet',               label: 'Timesheet',               requiresCompletion: false },
    { type: 'project-status',          label: 'Project Status',          requiresCompletion: false },
    { type: 'invoice',                 label: 'Invoice',                 requiresCompletion: true },
    { type: 'consent-form',            label: 'Consent Form (GDPR)',     requiresCompletion: true },
];

interface GeneratedDoc {
    type: DocType;
    generated_at: string;
    file_size_kb: number;
    pdf_url?: string;
}

interface TaskDocumentsTabProps {
    taskId: number;
    isDualSigned?: boolean;
    hasCompletionRecord?: boolean;
}

export function TaskDocumentsTab({ taskId, isDualSigned = false, hasCompletionRecord = false }: TaskDocumentsTabProps) {
    const [generating, setGenerating] = useState<DocType | null>(null);

    const { data: generatedDocs = [], refetch } = useQuery<GeneratedDoc[]>({
        queryKey: ['wh-task-docs', taskId],
        queryFn: async () => {
            const r = await printService.listForTask(taskId);
            return r as GeneratedDoc[];
        },
        staleTime: 60 * 1000,
    });

    const getExistingDoc = (type: DocType) => generatedDocs.find((d) => d.type === type);

    const handleGenerate = async (type: DocType) => {
        setGenerating(type);
        try {
            const blob = await printService.generate(type, String(taskId));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-${taskId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`${type.replace(/-/g, ' ')} generated and downloaded`);
            refetch();
        } catch {
            toast.error(`Failed to generate ${type.replace(/-/g, ' ')}`);
        } finally {
            setGenerating(null);
        }
    };

    const handleDownload = async (doc: GeneratedDoc) => {
        try {
            const blob = await printService.generate(doc.type, String(taskId));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.type}-${taskId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Download failed');
        }
    };

    return (
        <div className="space-y-2 p-1">
            <p className="text-caption text-muted-foreground mb-3">
                <Lock className="inline h-3 w-3 mr-1" />
                Availability depends on your role and task completion. Completion docs unlock after dual-signature.
            </p>

            {DOCUMENT_TYPES.map((docDef) => {
                const existing = getExistingDoc(docDef.type);
                const isLocked = docDef.requiresCompletion && !hasCompletionRecord;
                const isGenerating = generating === docDef.type;

                return (
                    <div
                        key={docDef.type}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                            isLocked ? 'opacity-50 bg-muted/30' : 'hover:bg-muted/30'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-[#2a8fbd] flex-shrink-0" />
                            <div>
                                <p className="text-body font-medium">{docDef.label}</p>
                                {existing ? (
                                    <p className="text-caption text-muted-foreground">
                                        Generated {format(new Date(existing.generated_at), 'MMM d, yyyy HH:mm')} · {existing.file_size_kb} KB
                                    </p>
                                ) : isLocked ? (
                                    <p className="text-caption text-muted-foreground">Requires completion record</p>
                                ) : (
                                    <p className="text-caption text-muted-foreground">Not yet generated</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {docDef.requiresCompletion && isDualSigned && (
                                <Badge className="bg-green-100 text-green-700 text-caption">Dual signed</Badge>
                            )}
                            {existing ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(existing)}
                                        title="Download"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleGenerate(docDef.type)}
                                        disabled={isLocked || isGenerating}
                                        title="Re-generate"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerate(docDef.type)}
                                    disabled={isLocked || isGenerating}
                                    className="text-caption"
                                >
                                    {isGenerating ? (
                                        <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Generating…</>
                                    ) : (
                                        <>Generate PDF</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
