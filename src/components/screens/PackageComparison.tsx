import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, Variants } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Check, X, ArrowLeft, FileText, Globe, Shield, LayoutTemplate } from 'lucide-react';
import { billingService, publicCmsService } from '../../services/api';
import { adminPackageService, adminPackageServicesService } from '../../services/adminApi';
import { InlineEditableText } from '../cms/InlineEditableText';
import { useInlineCms } from '../../contexts/InlineCmsContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';

interface PackageComparisonProps {
    onBack: () => void;
    onSignup: (planId?: string) => void;
}

interface Plan {
    id: string;
    name: string;
    price: string;
    description: string;
    features: any[];
    duration: string;
}

interface ServiceColumn {
    id: string;
    name: string;
    type: string;
    description: string;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// ---------------------------------------------------------------------------
// InlineField — lightweight inline editor for database-backed values
// ---------------------------------------------------------------------------
function InlineField({
    value,
    onSave,
    className,
    as: Tag = 'span',
    multiline = false,
    placeholder = '',
}: {
    value: string;
    onSave: (v: string) => Promise<void>;
    className?: string;
    as?: keyof React.JSX.IntrinsicElements;
    multiline?: boolean;
    placeholder?: string;
}) {
    const { editMode } = useInlineCms();
    const [display, setDisplay] = useState(value);
    const [editing, setEditing] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [saving, setSaving] = useState(false);
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => { if (!editing) setDisplay(value); }, [value, editing]);

    useEffect(() => {
        if (editing && ref.current) {
            const el = ref.current as HTMLElement;
            el.focus();
            const r = document.createRange();
            r.selectNodeContents(el);
            r.collapse(false);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(r);
        }
    }, [editing]);

    const commit = useCallback(async (next: string) => {
        const trimmed = next.trim();
        if (trimmed === display) { setEditing(false); return; }
        setDisplay(trimmed);
        setEditing(false);
        setSaving(true);
        try {
            await onSave(trimmed);
        } catch {
            toast.error('Failed to save — please try again');
            setDisplay(value);
        } finally {
            setSaving(false);
        }
    }, [display, onSave, value]);

    if (!editMode) {
        const V = Tag as React.ElementType;
        return <V className={className}>{display || placeholder}</V>;
    }

    if (editing) {
        return (
            <span
                ref={ref as React.Ref<HTMLSpanElement>}
                contentEditable
                suppressContentEditableWarning
                className={className}
                style={{ outline: '2px dashed #a855f7', borderRadius: 4, minWidth: '2em', display: 'inline-block', cursor: 'text', whiteSpace: multiline ? 'pre-wrap' : 'nowrap' }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') { setEditing(false); setDisplay(display); }
                    if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit((e.currentTarget as HTMLElement).innerText); }
                }}
                onBlur={(e) => commit((e.currentTarget as HTMLElement).innerText)}
            >
                {display}
            </span>
        );
    }

    const H = Tag as React.ElementType;
    return (
        <span style={{ position: 'relative', display: 'inline' }}>
            <H
                className={[className, hovered ? 'outline-dashed outline-2 outline-purple-400/50' : ''].filter(Boolean).join(' ')}
                style={{ borderRadius: hovered ? 4 : undefined, cursor: hovered ? 'text' : undefined, display: 'inline' }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onDoubleClick={() => setEditing(true)}
                title={hovered ? 'Double-click to edit' : undefined}
            >
                {display || placeholder}
            </H>
            {hovered && (
                <span aria-hidden style={{ position: 'absolute', top: '-1.2em', right: 0, fontSize: 10, background: '#7c3aed', color: '#fff', borderRadius: 3, padding: '1px 4px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10 }}>✎</span>
            )}
            {saving && <span style={{ marginLeft: 4, fontSize: 10, color: '#f59e0b', verticalAlign: 'middle' }}>●</span>}
        </span>
    );
}

// ---------------------------------------------------------------------------
// InlineFeatureCell — editable feature value cell in edit mode
// ---------------------------------------------------------------------------
function InlineFeatureCell({
    plan,
    col,
    onSavePlan,
}: {
    plan: Plan;
    col: ServiceColumn;
    onSavePlan: (planId: string, features: any[]) => Promise<void>;
}) {
    const { editMode } = useInlineCms();

    const findFeature = (features: any[]) =>
        features?.find(f =>
            (f.type === col.type && f.name === col.name) ||
            (f.type === col.type && !f.name) ||
            (!f.type && f.name === col.name)
        );

    const feature = findFeature(plan.features || []);
    const rawValue = feature?.value ?? '';

    const handleSave = async (next: string) => {
        const updated = [...(plan.features || [])];
        const idx = updated.findIndex(f =>
            (f.type === col.type && f.name === col.name) ||
            (f.type === col.type && !f.name) ||
            (!f.type && f.name === col.name)
        );
        if (idx >= 0) {
            updated[idx] = { ...updated[idx], value: next };
        } else {
            updated.push({ type: col.type, name: col.name, value: next });
        }
        await onSavePlan(plan.id, updated);
    };

    if (editMode) {
        return (
            <InlineField
                value={rawValue}
                onSave={handleSave}
                placeholder="—"
                className="font-medium text-slate-700 dark:text-slate-300 text-body"
            />
        );
    }

    const val = String(rawValue).toLowerCase();
    if (val === 'yes' || val === 'true' || val === 'unlimited' || val === 'included') {
        return <Check className="h-5 w-5 text-green-500 mx-auto" />;
    }
    if (!rawValue || val === 'no' || val === 'false' || val === 'none') {
        return <X className="h-4 w-4 text-red-400 mx-auto" />;
    }
    return <span className="font-medium text-slate-700 dark:text-slate-300">{rawValue}</span>;
}

// ---------------------------------------------------------------------------
// PackageComparison
// ---------------------------------------------------------------------------
export function PackageComparison({ onBack, onSignup }: PackageComparisonProps) {
    const { t, language } = useLanguage();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [columns, setColumns] = useState<ServiceColumn[]>([]);
    const [loading, setLoading] = useState(true);
    const [cmsContent, setCmsContent] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansData, columnsData] = await Promise.all([
                    billingService.getPlans(),
                    billingService.getPackageServices()
                ]);
                const parsedPlans = plansData.map((plan: any) => {
                    let features = plan.features;
                    if (typeof features === 'string') {
                        try { features = JSON.parse(features); } catch { features = []; }
                    }
                    return { ...plan, features };
                });
                setPlans(parsedPlans);
                setColumns(columnsData);
            } catch (error) {
                console.error('Failed to fetch comparison data:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchCms = async () => {
            try {
                const response = await publicCmsService.getPage('package-comparison', language);
                if (response.success && response.data.content_structured) {
                    setCmsContent(response.data.content_structured);
                }
            } catch {
                // falls back to static defaults
            }
        };

        fetchData();
        fetchCms();
    }, [language]);

    // Optimistic plan update — save then sync local state
    const savePlan = useCallback(async (planId: string, patch: Partial<Plan & { features: any[] }>) => {
        await adminPackageService.update(planId, patch as any);
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...patch } : p));
    }, []);

    // Optimistic column update
    const saveColumn = useCallback(async (colId: string, patch: Partial<ServiceColumn>) => {
        await adminPackageServicesService.update(colId, patch as any);
        setColumns(prev => prev.map(c => c.id === colId ? { ...c, ...patch } : c));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur py-4">
                <div className="container flex items-center justify-between px-4 md:px-6">
                    <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        {t('common.back') || 'Back'}
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-heading-2 font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
                            {t('appName') || 'BillingTool'}
                        </span>
                    </div>
                    <div className="w-24" />
                </div>
            </header>

            <main className="container px-4 md:px-6 pt-12">
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-12">

                    {/* Page title / subtitle — CMS editable */}
                    <div className="text-center space-y-4">
                        <motion.h1 variants={itemVariants} className="text-display font-extrabold tracking-tight lg:text-5xl">
                            <InlineEditableText slug="package-comparison" field="compare_title" lang={language} value={cmsContent?.compare_title || t('landing.pricing.compareTitle') || 'Compare our plans'} />
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-heading-2 text-slate-500 max-w-2xl mx-auto">
                            <InlineEditableText slug="package-comparison" field="compare_subtitle" lang={language} value={cmsContent?.compare_subtitle || t('landing.pricing.compareSubtitle') || 'Find the perfect fit for your business needs'} multiline />
                        </motion.p>
                    </div>

                    {/* Comparison table */}
                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2">
                                    <TableRow>
                                        <TableHead className="w-[300px] py-8 px-6 text-heading-3 font-bold">
                                            {t('landing.pricing.features') || 'Features'}
                                        </TableHead>
                                        {plans.map(plan => (
                                            <TableHead key={plan.id} className="text-center py-8 min-w-[200px]">
                                                <div className="space-y-2">
                                                    {/* Plan name — DB inline editable */}
                                                    <div className="text-heading-1 font-bold text-slate-900 dark:text-white">
                                                        <InlineField
                                                            value={plan.name}
                                                            onSave={(v) => savePlan(plan.id, { name: v })}
                                                            className="text-heading-1 font-bold text-slate-900 dark:text-white"
                                                        />
                                                    </div>
                                                    {/* Plan price — DB inline editable (raw number, € prefix shown outside) */}
                                                    <div className="text-purple-600 font-extrabold text-heading-2">
                                                        {parseFloat(plan.price) === 0 ? (
                                                            <InlineField
                                                                value={plan.price}
                                                                onSave={(v) => savePlan(plan.id, { price: v })}
                                                                className="text-purple-600 font-extrabold text-heading-2"
                                                            />
                                                        ) : (
                                                            <>
                                                                €<InlineField
                                                                    value={plan.price}
                                                                    onSave={(v) => savePlan(plan.id, { price: v })}
                                                                    className="text-purple-600 font-extrabold text-heading-2"
                                                                />
                                                            </>
                                                        )}
                                                        <span className="text-body font-normal text-slate-400 ml-1">/mo</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="mt-4 bg-purple-600 hover:bg-purple-700 w-full"
                                                        onClick={() => onSignup(plan.id)}
                                                    >
                                                        {t('landing.hero.getStarted') || 'Get Started'}
                                                    </Button>
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {columns.map(col => (
                                        <TableRow key={col.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors">
                                            <TableCell className="py-6 px-6 font-semibold text-slate-800 dark:text-slate-200">
                                                <div>
                                                    {/* Column name — DB inline editable */}
                                                    <InlineField
                                                        value={col.name}
                                                        onSave={(v) => saveColumn(col.id, { name: v })}
                                                        className="font-semibold text-slate-800 dark:text-slate-200"
                                                    />
                                                    {/* Column description — DB inline editable */}
                                                    {col.description && (
                                                        <p className="text-micro font-normal text-slate-400 mt-1">
                                                            <InlineField
                                                                value={col.description}
                                                                onSave={(v) => saveColumn(col.id, { description: v })}
                                                                className="text-micro font-normal text-slate-400"
                                                                multiline
                                                            />
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {plans.map(plan => (
                                                <TableCell key={`${plan.id}-${col.id}`} className="text-center">
                                                    <InlineFeatureCell
                                                        plan={plan}
                                                        col={col}
                                                        onSavePlan={async (planId, features) => {
                                                            await savePlan(planId, { features });
                                                        }}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </motion.div>

                    {/* Trust section — CMS editable */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                        {[
                            { icon: <Shield className="text-green-500" />, titleField: 'trust_1_title', descField: 'trust_1_desc', defaultTitle: 'Highly Secure', defaultDesc: 'Enterprise-grade encryption for all your data.' },
                            { icon: <Globe className="text-blue-500" />, titleField: 'trust_2_title', descField: 'trust_2_desc', defaultTitle: 'Go Global', defaultDesc: 'Multi-currency and multi-language support included.' },
                            { icon: <LayoutTemplate className="text-purple-500" />, titleField: 'trust_3_title', descField: 'trust_3_desc', defaultTitle: 'Customizable', defaultDesc: 'Design templates that match your brand identity.' }
                        ].map((item, i) => (
                            <Card key={i} className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                                        {item.icon}
                                    </div>
                                    <CardTitle className="text-heading-3">
                                        <InlineEditableText slug="package-comparison" field={item.titleField} lang={language} value={cmsContent?.[item.titleField] || item.defaultTitle} />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-500 text-body">
                                        <InlineEditableText slug="package-comparison" field={item.descField} lang={language} value={cmsContent?.[item.descField] || item.defaultDesc} multiline />
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            </main>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}
