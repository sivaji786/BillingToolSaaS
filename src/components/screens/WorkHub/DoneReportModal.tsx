import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle, Mail, MessageSquare, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { AICorrectField } from './AICorrectField';
import { MaterialsTable } from './MaterialsTable';
import { PhotoUploadGrid } from './PhotoUploadGrid';
import { SignaturePad } from './SignaturePad';
import { completionService, WHMaterial, WHPhoto } from '../../../services/workhubApi';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { useWorkhubOfflineStore } from '../../../stores/workhubOfflineStore';

const CONSENT_VERSION = import.meta.env.VITE_CONSENT_VERSION ?? 'v1';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type CopyChannel = 'none' | 'email' | 'sms' | 'whatsapp' | 'telegram';

const STEP_LABELS: Record<Step, string> = {
    1: 'Completion Note',
    2: 'Materials',
    3: 'Photos',
    4: 'Worker Signature',
    5: 'Customer Signature',
    6: 'Review & Submit',
    7: 'Send Copy',
};

const CONSENT_TEXT = 'By signing this document you confirm that the described work has been completed to your satisfaction. ' +
    'Your name and signature will be stored as part of the completion record per GDPR Art. 6(1)(b) for up to 10 years ' +
    '(§257 HGB / §147 AO). This constitutes a Simple Electronic Signature per eIDAS 910/2014.';

interface Props {
    taskId: number;
    onClose: () => void;
    onSubmitted: () => void;
}

export function DoneReportModal({ taskId, onClose, onSubmitted }: Props) {
    const qc = useQueryClient();
    const [step, setStep] = useState<Step>(1);

    // Step 1 — initialise note from persisted draft if one exists
    const [note, setNote] = useState<string>(() => {
        return useWorkhubOfflineStore.getState().draftNotes[taskId] ?? '';
    });
    const [noteOriginal, setNoteOriginal] = useState('');

    // Step 2
    const [materials, setMaterials] = useState<WHMaterial[]>([]);

    // Step 3
    const [photos, setPhotos] = useState<WHPhoto[]>([]);

    // Step 4
    const [workerSig, setWorkerSig] = useState('');
    const [workerGdpr, setWorkerGdpr] = useState(false);

    // Step 5
    const [customerSig, setCustomerSig] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerGdpr, setCustomerGdpr] = useState(false);

    // Step 3 — photo upload progress
    const [uploadingCount, setUploadingCount] = useState(0);

    // Step 7 — copy delivery
    const [copyChannel, setCopyChannel] = useState<CopyChannel>('none');
    const [copyRecipient, setCopyRecipient] = useState('');

    // Auto-save draft note whenever it changes
    useEffect(() => {
        useWorkhubOfflineStore.getState().setDraftNote(taskId, note);
    }, [note, taskId]);

    const submitMut = useMutation({
        mutationFn: async () => {
            const completion = await completionService.submit(taskId, {
                completion_note: note,
                completion_note_original: noteOriginal || note,
                worker_signature_data: workerSig,
                gdpr_consent_given: true,
                materials: materials.filter((m) => m.material_name.trim()),
                consent_text_version: CONSENT_VERSION,
                copy_channel: copyChannel !== 'none' ? copyChannel : undefined,
                copy_recipient: copyChannel !== 'none' ? copyRecipient.trim() : undefined,
            });

            if (customerSig && customerName && customerGdpr) {
                await completionService.customerSignature(completion.completion_id, {
                    customer_signature_data: customerSig,
                    customer_name: customerName,
                    gdpr_consent_given: true,
                    consent_text_version: CONSENT_VERSION,
                });
            }
            return completion;
        },
        onSuccess: () => {
            useWorkhubOfflineStore.getState().clearDraftNote(taskId);
            const channelLabel = copyChannel !== 'none' ? ` Copy queued via ${copyChannel}.` : '';
            toast.success(`Done report submitted!${channelLabel}`);
            onSubmitted();
        },
        onError: (e: any) => {
            const msg = e.response?.data?.message ?? e.response?.data?.error ?? 'Submission failed';
            toast.error(Array.isArray(msg) ? msg.join('. ') : msg);
        },
    });

    const canProceed = () => {
        if (step === 1) return note.trim().length >= 20;
        if (step === 3) return photos.some((p) => p.photo_type === 'jobsite');
        if (step === 4) return workerSig.length > 0 && workerGdpr;
        if (step === 7 && copyChannel !== 'none') return copyRecipient.trim().length > 0;
        return true;
    };

    const next = () => setStep((s) => Math.min(s + 1, 7) as Step);
    const prev = () => setStep((s) => Math.max(s - 1, 1) as Step);

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Done Report
                        <span className="ml-auto text-caption font-normal text-muted-foreground">
                            Step {step} / 7 — {STEP_LABELS[step]}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {/* Progress bar */}
                <div
                    className="flex gap-0.5 mb-4"
                    role="progressbar"
                    aria-valuenow={step}
                    aria-valuemin={1}
                    aria-valuemax={7}
                    aria-label={`Step ${step} of 7`}
                >
                    {([1, 2, 3, 4, 5, 6, 7] as Step[]).map((s) => (
                        <div
                            key={s}
                            className={cn('h-1 flex-1 rounded-full transition-colors', step >= s ? 'bg-[#f08a3c]' : 'bg-muted')}
                        />
                    ))}
                </div>

                {/* Step content */}
                <div className="min-h-[200px]">
                    {step === 1 && (
                        <div className="space-y-2">
                            <Label>Completion note <span className="text-destructive">*</span> (min 20 chars)</Label>
                            <AICorrectField
                                value={note}
                                onChange={(v) => {
                                    if (!noteOriginal) setNoteOriginal(note);
                                    setNote(v);
                                }}
                                minLength={20}
                                placeholder="Describe the completed work in detail…"
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-2">
                            <Label>Materials used (optional)</Label>
                            <MaterialsTable materials={materials} onChange={setMaterials} />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-2">
                            <p className="text-body text-muted-foreground">At least one jobsite photo is required.</p>
                            <PhotoUploadGrid
                                taskId={taskId}
                                existingPhotos={photos}
                                onUploaded={(p) => {
                                    setUploadingCount((c) => Math.max(0, c - 1));
                                    setPhotos((prev) => [...prev, p]);
                                }}
                                onUploadStart={() => setUploadingCount((c) => c + 1)}
                                onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
                            />
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <SignaturePad
                                label="Worker Signature *"
                                legalNotice={CONSENT_TEXT}
                                onSign={(data) => { setWorkerSig(data); setWorkerGdpr(true); }}
                                onClear={() => { setWorkerSig(''); setWorkerGdpr(false); }}
                            />
                            {workerSig && (
                                <p className="text-caption text-green-600">
                                    ✓ Consent recorded — your signature confirms the above statement.
                                </p>
                            )}
                            {!workerSig && (
                                <p className="text-caption text-muted-foreground">
                                    Please sign above to continue.
                                </p>
                            )}
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4">
                            <p className="text-body text-muted-foreground">
                                Customer signature is required for billable tasks.
                                Skip if the customer is not present — they can sign later.
                            </p>
                            <SignaturePad
                                label="Customer Signature"
                                legalNotice={CONSENT_TEXT}
                                onSign={(data, name) => { setCustomerSig(data); setCustomerName(name); }}
                                onClear={() => { setCustomerSig(''); setCustomerName(''); }}
                            />
                            {customerSig && (
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="cust-gdpr"
                                        checked={customerGdpr}
                                        onCheckedChange={(v) => setCustomerGdpr(Boolean(v))}
                                    />
                                    <Label htmlFor="cust-gdpr" className="text-caption leading-snug cursor-pointer">
                                        {CONSENT_TEXT}
                                    </Label>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-4">
                            <h3 className="text-body font-medium">Summary</h3>
                            <div className="space-y-2 text-body">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Completion note</span>
                                    <span className="text-green-600">✓ {note.length} chars</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Materials</span>
                                    <span>{materials.filter(m => m.material_name).length} row(s)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Jobsite photos</span>
                                    <span className={photos.filter(p => p.photo_type === 'jobsite').length === 0 ? 'text-destructive' : 'text-green-600'}>
                                        {photos.filter(p => p.photo_type === 'jobsite').length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Worker signature</span>
                                    <span className={workerSig ? 'text-green-600' : 'text-destructive'}>{workerSig ? '✓ Signed' : '✗ Missing'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer signature</span>
                                    <span className={customerSig ? 'text-green-600' : 'text-muted-foreground'}>
                                        {customerSig ? `✓ ${customerName}` : 'Not collected (can sign later)'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer copy</span>
                                    <span className="text-muted-foreground">Set in next step</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 7 && (
                        <div className="space-y-5">
                            <p className="text-body text-muted-foreground">
                                Send the customer a copy of the signed completion certificate.
                                Skip if not required.
                            </p>

                            {/* Channel selector */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {([
                                    { value: 'none',     label: 'No copy',           Icon: null,          comingSoon: false },
                                    { value: 'email',    label: 'Email',              Icon: Mail,          comingSoon: false },
                                    { value: 'sms',      label: 'SMS',               Icon: MessageSquare, comingSoon: true  },
                                    { value: 'whatsapp', label: 'WhatsApp',           Icon: MessageSquare, comingSoon: true  },
                                    { value: 'telegram', label: 'Telegram',           Icon: Send,          comingSoon: false },
                                ] as { value: CopyChannel; label: string; Icon: any; comingSoon: boolean }[]).map(({ value, label, Icon, comingSoon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        disabled={comingSoon}
                                        onClick={() => { if (!comingSoon) { setCopyChannel(value); setCopyRecipient(''); } }}
                                        className={cn(
                                            'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-caption font-medium transition-colors',
                                            comingSoon
                                                ? 'opacity-50 cursor-not-allowed border-muted text-muted-foreground'
                                                : copyChannel === value
                                                    ? 'border-[#f08a3c] bg-[#f0f6ff] text-[#1e3a5f]'
                                                    : 'border-muted hover:border-[rgba(30,58,95,0.20)] hover:bg-[#f0f6ff]/50 text-muted-foreground'
                                        )}
                                    >
                                        {Icon && <Icon className="w-4 h-4" />}
                                        {label}
                                        {comingSoon && (
                                            <span className="text-[10px] font-normal leading-none">(coming soon)</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Recipient input */}
                            {copyChannel !== 'none' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="copy-recipient">
                                        {copyChannel === 'email' ? 'Email address' : 'Phone number (+ country code)'}{' '}
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="copy-recipient"
                                        type={copyChannel === 'email' ? 'email' : 'tel'}
                                        placeholder={copyChannel === 'email' ? 'customer@example.com' : '+49 151 12345678'}
                                        value={copyRecipient}
                                        onChange={(e) => setCopyRecipient(e.target.value)}
                                        className="max-w-sm"
                                    />
                                    <p className="text-caption text-muted-foreground">
                                        The certificate PDF will be sent after submission. Delivery may take a few minutes.
                                    </p>
                                </div>
                            )}

                            {copyChannel === 'none' && (
                                <p className="text-caption text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
                                    No copy will be sent. The customer can request a copy later via the completion reference.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between gap-2 pt-4 border-t">
                    <div>
                        {step > 1 && (
                            <Button type="button" variant="outline" className="gap-1" onClick={prev}>
                                <ChevronLeft className="w-4 h-4" /> Back
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {uploadingCount > 0 && (
                            <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                                <Loader2 className="animate-spin w-3 h-3" />
                                Uploading {uploadingCount} photo{uploadingCount !== 1 ? 's' : ''}…
                            </span>
                        )}
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        {step < 7 ? (
                            <Button
                                type="button"
                                className="bg-[#f08a3c] hover:bg-[#e07530] gap-1"
                                disabled={!canProceed()}
                                onClick={next}
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                className="bg-green-600 hover:bg-green-700 gap-1"
                                disabled={
                                    submitMut.isPending ||
                                    uploadingCount > 0 ||
                                    !workerSig ||
                                    photos.filter(p => p.photo_type === 'jobsite').length === 0 ||
                                    (copyChannel !== 'none' && copyRecipient.trim().length === 0)
                                }
                                onClick={() => submitMut.mutate()}
                            >
                                {submitMut.isPending
                                    ? <Loader2 className="animate-spin w-4 h-4" />
                                    : <CheckCircle className="w-4 h-4" />}
                                Submit Done Report
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
