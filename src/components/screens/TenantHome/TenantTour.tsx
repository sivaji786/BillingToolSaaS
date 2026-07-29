import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { useLanguage } from '../../../contexts/LanguageContext';

const STEPS = [
    {
        targetId: 'ht-tour-new',
        title: 'Create anything instantly',
        description: 'Click + New to start a new invoice, business letter, template, or blank document from anywhere in the portal.',
        placement: 'bottom' as const,
    },
    {
        targetId: 'ht-tour-tiles',
        title: 'Your workspace at a glance',
        description: 'Jump into Billing, Business Letters, Templates, Files, or build a custom document — all from these tiles.',
        placement: 'bottom' as const,
    },
    {
        targetId: 'ht-tour-recent',
        title: 'Pick up where you left off',
        description: 'Your most recently opened documents appear here so you can continue work without searching.',
        placement: 'top' as const,
    },
    {
        targetId: 'ht-tour-activity',
        title: 'Team activity feed',
        description: 'Every edit, send, and comment your team makes is logged here in real time.',
        placement: 'top' as const,
    },
    {
        targetId: 'ht-tour-tickets',
        title: 'Built-in support tickets',
        description: 'Need help? Open a ticket directly from any document. Our team responds within one business day.',
        placement: 'left' as const,
    },
];

const LS_KEY = 'ht_tour_completed';

export function TenantTour({ forceShow, onClose }: { forceShow?: boolean; onClose?: () => void }) {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [win, setWin] = useState({ w: 0, h: 0 });
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setWin({ w: window.innerWidth, h: window.innerHeight });
        if (forceShow) { setVisible(true); setStep(0); return; }
        if (!localStorage.getItem(LS_KEY)) {
            const t = setTimeout(() => setVisible(true), 600);
            return () => clearTimeout(t);
        }
    }, [forceShow]);

    const updateRect = useCallback(() => {
        if (!visible) return;
        const el = document.getElementById(STEPS[step].targetId);
        if (!el) { setRect(null); return; }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            const r = el.getBoundingClientRect();
            setRect({ ...r, toJSON: () => ({}) } as DOMRect);
        }, 300);
    }, [step, visible]);

    useEffect(() => {
        updateRect();
        const onResize = () => { setWin({ w: window.innerWidth, h: window.innerHeight }); updateRect(); };
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', updateRect, { passive: true });
        return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', updateRect); };
    }, [updateRect]);

    const finish = useCallback(() => {
        setVisible(false);
        localStorage.setItem(LS_KEY, 'true');
        onClose?.();
    }, [onClose]);

    const next = useCallback(() => {
        step < STEPS.length - 1 ? setStep(s => s + 1) : finish();
    }, [step, finish]);

    const prev = () => step > 0 && setStep(s => s - 1);

    // Auto-advance every 9 s; pause on tooltip hover
    useEffect(() => {
        if (!visible) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(next, 9000);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [step, visible, next]);

    if (!visible) return null;

    const current = STEPS[step];
    const TW = 300;
    const TH = 190;
    const M = 14;

    const tooltipPos = () => {
        if (!rect) return { top: win.h / 2 - TH / 2, left: win.w / 2 - TW / 2 };
        let top = 0, left = 0;
        if (current.placement === 'bottom') { top = rect.bottom + M; left = rect.left; }
        else if (current.placement === 'top') { top = rect.top - TH - M; left = rect.left; }
        else if (current.placement === 'left') { top = rect.top; left = rect.left - TW - M; }
        else { top = rect.top; left = rect.right + M; }
        if (left < M) left = M;
        if (left + TW > win.w - M) left = win.w - TW - M;
        if (top < M) top = rect.bottom + M;
        if (top + TH > win.h - M) top = win.h - TH - M;
        return { top, left };
    };

    return (
        <AnimatePresence>
            <motion.div
                key="ht-tour-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] pointer-events-none"
            >
                {/* Spotlight mask */}
                {rect && (
                    <svg width="100%" height="100%" className="absolute inset-0">
                        <mask id="ht-spotlight">
                            <rect width="100%" height="100%" fill="white" />
                            <motion.rect
                                fill="black" rx="8"
                                initial={false}
                                animate={{ x: rect.left - 10, y: rect.top - 10, width: rect.width + 20, height: rect.height + 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                            />
                        </mask>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.42)" mask="url(#ht-spotlight)" />
                    </svg>
                )}

                {/* Focus ring */}
                {rect && (
                    <motion.div
                        className="absolute border-2 border-[#f08a3c] rounded-lg pointer-events-none"
                        style={{ boxShadow: '0 0 0 3px rgba(240,138,60,0.20)' }}
                        initial={false}
                        animate={{ top: rect.top - 10, left: rect.left - 10, width: rect.width + 20, height: rect.height + 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    />
                )}

                {/* Tooltip */}
                <motion.div
                    className="absolute bg-white rounded-xl shadow-2xl p-5 pointer-events-auto border border-[rgba(30,58,95,0.10)]"
                    style={{ width: TW }}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1, ...tooltipPos() }}
                    transition={{ type: 'spring', damping: 22, stiffness: 110 }}
                    onMouseEnter={() => { if (timer.current) clearTimeout(timer.current); }}
                    onMouseLeave={() => { timer.current = setTimeout(next, 9000); }}
                >
                    <div className="flex justify-between items-start mb-2.5">
                        <h3 className="font-medium text-[#1e3a5f] flex items-center gap-2 text-sm leading-snug pr-4">
                            <span className="flex-shrink-0 inline-grid place-items-center w-5 h-5 rounded-full bg-[#f0f6ff] text-[#1e3a5f] text-[10px] font-semibold">
                                {step + 1}
                            </span>
                            {current.title}
                        </h3>
                        <button
                            onClick={finish}
                            className="text-gray-500 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <p className="text-[12px] text-[#3d5a80] mb-4 leading-relaxed">
                        {current.description}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-5 bg-[#f08a3c]' : 'w-1.5 bg-[#dbe8f7]'}`}
                                />
                            ))}
                        </div>
                        <div className="flex gap-1.5">
                            <Button
                                variant="ghost" size="sm"
                                onClick={prev}
                                disabled={step === 0}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={next}
                                className="h-7 px-3 text-[11px] bg-[#f08a3c] hover:bg-[#e07530]"
                            >
                                {step === STEPS.length - 1 ? 'Done' : 'Next'}
                                {step < STEPS.length - 1 && <ChevronRight className="w-3 h-3 ml-1" />}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
