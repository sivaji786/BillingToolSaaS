import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, MousePointer2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useLanguage } from '../../contexts/LanguageContext';

export interface Step {
    targetId: string;
    title: string;
    description: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
    showDoubleClick?: boolean;
}

export function QuickAccessTour({ forceShow, onClose }: { forceShow?: boolean; onClose?: () => void }) {
    const { t } = useLanguage();

    const steps: Step[] = [
        {
            targetId: 'tour-seller-name',
            title: t('quickAccessTour.sellerTitle'),
            description: t('quickAccessTour.sellerDesc'),
            placement: 'bottom',
            showDoubleClick: true,
        },
        {
            targetId: 'tour-invoice-number',
            title: t('quickAccessTour.invoiceNumTitle'),
            description: t('quickAccessTour.invoiceNumDesc'),
            placement: 'bottom',
        },
        {
            targetId: 'tour-buyer-name',
            title: t('quickAccessTour.buyerTitle'),
            description: t('quickAccessTour.buyerDesc'),
            placement: 'bottom',
            showDoubleClick: true,
        },
        {
            targetId: 'tour-line-items',
            title: t('quickAccessTour.lineItemsTitle'),
            description: t('quickAccessTour.lineItemsDesc'),
            placement: 'top',
        },
        {
            targetId: 'tour-btn-download',
            title: t('quickAccessTour.downloadTitle'),
            description: t('quickAccessTour.downloadDesc'),
            placement: 'bottom',
        },
        {
            targetId: 'tour-btn-send',
            title: t('quickAccessTour.sendTitle'),
            description: t('quickAccessTour.sendDesc'),
            placement: 'bottom',
        },
        {
            targetId: 'tour-btn-save',
            title: t('quickAccessTour.saveTitle'),
            description: t('quickAccessTour.saveDesc'),
            placement: 'bottom',
        },
        {
            targetId: 'tour-giro',
            title: t('quickAccessTour.giroTitle'),
            description: t('quickAccessTour.giroDesc'),
            placement: 'right',
        }
    ];

    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });

        if (forceShow) {
            setIsVisible(true);
            setCurrentStep(0);
            return;
        }

        const completed = localStorage.getItem('qa_tour_completed');
        if (!completed) {
            const t = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(t);
        }
    }, [forceShow]);

    const updatePosition = useCallback(() => {
        if (!isVisible) return;
        const step = steps[currentStep];
        const el = document.getElementById(step.targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                const rect = el.getBoundingClientRect();
                setTargetRect({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    bottom: rect.bottom,
                    right: rect.right,
                    x: rect.x,
                    y: rect.y,
                    toJSON: () => { }
                });
            }, 300);
        } else {
            setTargetRect(null);
        }
    }, [currentStep, isVisible]);

    useEffect(() => {
        updatePosition();

        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            updatePosition();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', updatePosition, { passive: true });
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [updatePosition]);

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(c => c + 1);
        } else {
            handleComplete();
        }
    }, [currentStep]);

    useEffect(() => {
        if (!isVisible) return;

        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);

        autoAdvanceTimer.current = setTimeout(() => {
            handleNext();
        }, 8000);

        return () => {
            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
        };
    }, [currentStep, isVisible, handleNext]);

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(c => c - 1);
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem('qa_tour_completed', 'true');
        if (onClose) onClose();
    };

    if (!isVisible) return null;

    const step = steps[currentStep];

    const getTooltipStyle = (rect: DOMRect, placement: string) => {
        const tooltipWidth = 320;
        const tooltipHeight = 180;
        const margin = 16;
        let top = 0;
        let left = 0;

        if (placement === 'bottom') {
            top = rect.bottom + margin;
            left = rect.left;
        } else if (placement === 'top') {
            top = rect.top - tooltipHeight - margin;
            left = rect.left;
        } else if (placement === 'left') {
            top = rect.top;
            left = rect.left - tooltipWidth - margin;
        } else if (placement === 'right') {
            top = rect.top;
            left = rect.right + margin;
        }

        // Clamp to screen bounds
        if (left < margin) left = margin;
        if (left + tooltipWidth > windowSize.width - margin) left = windowSize.width - tooltipWidth - margin;
        if (top < margin) top = rect.bottom + margin; // flip to bottom if top is out of bounds
        if (top + tooltipHeight > windowSize.height - margin) top = windowSize.height - tooltipHeight - margin; // clamp bottom

        return { top, left };
    };

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] pointer-events-none"
            >
                {/* Dark Mask */}
                {targetRect && (
                    <svg width="100%" height="100%">
                        <mask id="spotlight-mask">
                            <rect width="100%" height="100%" fill="white" />
                            <motion.rect
                                fill="black"
                                rx="8"
                                initial={false}
                                animate={{
                                    x: targetRect.left - 12,
                                    y: targetRect.top - 12,
                                    width: targetRect.width + 24,
                                    height: targetRect.height + 24,
                                }}
                                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                            />
                        </mask>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" mask="url(#spotlight-mask)" onClick={() => {
                            // Resume timer on main backdrop click (optional)
                        }} />
                    </svg>
                )}

                {/* Focus box border outline + cursor */}
                {targetRect && (
                    <motion.div
                        className="absolute bg-transparent border-2 border-[#f08a3c] rounded-lg pointer-events-none shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                        initial={false}
                        animate={{
                            top: targetRect.top - 12,
                            left: targetRect.left - 12,
                            width: targetRect.width + 24,
                            height: targetRect.height + 24,
                        }}
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    >
                        {step.showDoubleClick && (
                            <motion.div
                                className="absolute -bottom-6 -right-6 text-white pointer-events-none z-10"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    opacity: [0, 1, 1, 0],
                                    scale: [1, 0.8, 1, 1],
                                    x: [30, 0, 0, 30],
                                    y: [30, 0, 0, 30]
                                }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                    repeatDelay: 0.5
                                }}
                            >
                                <MousePointer2 className="h-6 w-6 fill-white text-[#2a8fbd] drop-shadow-md" />
                                <motion.div
                                    className="absolute -top-1 -left-1 w-8 h-8 rounded-full border border-[rgba(30,58,95,0.25)]"
                                    animate={{
                                        scale: [1, 2, 2.5],
                                        opacity: [0, 0.8, 0]
                                    }}
                                    transition={{
                                        duration: 2.5,
                                        repeat: Infinity,
                                        repeatDelay: 0.5,
                                        times: [0, 0.3, 0.6] // double click effect
                                    }}
                                />
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Tooltip Card */}
                {targetRect && (
                    <motion.div
                        className="absolute bg-white rounded-xl shadow-2xl p-5 w-72 pointer-events-auto border border-[rgba(30,58,95,0.10)] z-10"
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            ...getTooltipStyle(targetRect, step.placement)
                        }}
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        onMouseEnter={() => {
                            // Pause auto advance when hovering tooltip
                            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
                        }}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-medium text-gray-800 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f0f6ff] text-[#1e3a5f] text-micro text-center font-medium">
                                    {currentStep + 1}
                                </span>
                                {step.title}
                            </h3>
                            <button onClick={handleComplete} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="text-body text-gray-600 mb-5 leading-relaxed">
                            {step.description}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-5 bg-[#f08a3c]' : 'w-1.5 bg-[#dbe8f7]'}`}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleNext}
                                    className="h-8 px-3 text-micro bg-[#f08a3c] hover:bg-[#e07530] shadow-sm"
                                >
                                    {currentStep === steps.length - 1 ? t('quickAccessTour.finish') : t('quickAccessTour.next')}
                                    {currentStep !== steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
