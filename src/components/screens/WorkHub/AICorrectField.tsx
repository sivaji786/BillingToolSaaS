import { useState } from 'react';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { aiService } from '../../../services/workhubApi';
import { toast } from 'sonner';

interface Change {
    type: string;
    text: string;
    replacement: string;
}

interface Props {
    value: string;
    onChange: (v: string) => void;
    minLength?: number;
    placeholder?: string;
}

export function AICorrectField({ value, onChange, minLength = 20, placeholder }: Props) {
    const [loading, setLoading] = useState(false);
    const [corrected, setCorrected] = useState<string | null>(null);
    const [changes, setChanges] = useState<Change[]>([]);
    const [originalForDiff, setOriginalForDiff] = useState('');

    const handleCorrect = async () => {
        if (value.trim().length < 5) {
            toast.error('Text too short to correct.');
            return;
        }
        setLoading(true);
        try {
            const result = await aiService.correct(value);
            if (result.identical) {
                toast.success('No corrections needed.');
                return;
            }
            setCorrected(result.corrected);
            setChanges(result.changes);
            setOriginalForDiff(value);
        } catch (e: any) {
            const status = e.response?.status;
            if (status === 503 || status === 429) {
                toast.error('AI service is busy. Please try again in a moment.');
            } else {
                toast.error(e.response?.data?.message ?? 'AI correction failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    const acceptAll = () => {
        if (corrected !== null) onChange(corrected);
        setCorrected(null);
        setChanges([]);
    };

    const rejectAll = () => {
        setCorrected(null);
        setChanges([]);
    };

    return (
        <div className="space-y-2">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder ?? 'Describe the completed work…'}
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-body resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                minLength={minLength}
            />

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={loading || value.trim().length < 5}
                    onClick={handleCorrect}
                >
                    {loading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                    Correct with AI
                </Button>
                {value.trim().length < minLength && (
                    <span className="text-caption text-muted-foreground">{minLength - value.trim().length} more chars needed</span>
                )}
            </div>

            {/* Diff view */}
            {corrected !== null && changes.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-caption font-semibold">AI Suggestions ({changes.length})</span>
                        <div className="flex gap-1.5">
                            <Button type="button" size="sm" variant="outline" className="gap-1 text-caption h-7" onClick={rejectAll}>
                                <X className="w-3 h-3" /> Reject all
                            </Button>
                            <Button type="button" size="sm" className="gap-1 text-caption h-7 bg-purple-600 hover:bg-purple-700" onClick={acceptAll}>
                                <Check className="w-3 h-3" /> Accept all
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        {changes.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 text-caption">
                                <div className="flex-1 rounded bg-red-50 px-2 py-1 line-through text-red-700">{c.text}</div>
                                <span className="text-muted-foreground mt-1">→</span>
                                <div className="flex-1 rounded bg-green-50 px-2 py-1 text-green-700">{c.replacement}</div>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        type="button"
                                        title="Accept this change"
                                        className="w-5 h-5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center"
                                        onClick={() => {
                                            // Apply just this change
                                            const next = (value ?? corrected ?? originalForDiff).replace(c.text, c.replacement);
                                            onChange(next);
                                            const remaining = changes.filter((_, j) => j !== i);
                                            setChanges(remaining);
                                            if (remaining.length === 0) { setCorrected(null); }
                                        }}
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                        type="button"
                                        title="Reject this change"
                                        className="w-5 h-5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center"
                                        onClick={() => {
                                            const remaining = changes.filter((_, j) => j !== i);
                                            setChanges(remaining);
                                            if (remaining.length === 0) setCorrected(null);
                                        }}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <p className="text-caption font-semibold text-muted-foreground mb-1">Corrected preview:</p>
                        <p className="text-body bg-white rounded p-2 border">{corrected}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
