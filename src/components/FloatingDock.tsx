import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, X } from 'lucide-react';
import { useFloatingDock } from '../contexts/FloatingDockContext';

/**
 * Speed Dial — collapses all registered floating launchers behind a single
 * toggle button at bottom-right. Tap the toggle to fan items upward.
 *
 * Stack order (bottom → top): lower `order` value = closer to toggle.
 *   order 1 = Support Ticket  (always visible)
 *   order 2 = AI Assistant    (invoice/letter screens)
 *   order 3 = Edit Mode bar   (SA admin only)
 */
export function FloatingDock() {
    const { slots, currentScreen } = useFloatingDock();
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
        if (!isOpen) return;
        function onPointerDown(e: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [isOpen]);

    if (!slots.length) return null;

    const bottomClass = currentScreen === 'workhub'
        ? 'bottom-[72px] md:bottom-6'
        : 'bottom-6';

    // If only 1 slot is registered, render it directly — no speed dial needed
    if (slots.length === 1) {
        return (
            <div
                className={`fixed ${bottomClass} right-6 pointer-events-none`}
                style={{ zIndex: 9998 }}
            >
                <div className="pointer-events-auto">
                    {slots[0].fn.current()}
                </div>
            </div>
        );
    }

    const items = slots.map(slot => ({ id: slot.id, content: slot.fn.current() }));
    const hasVisible = items.some(i => i.content !== null);

    return (
        <div
            ref={containerRef}
            className={`fixed ${bottomClass} right-6 flex flex-col items-end pointer-events-none`}
            style={{ zIndex: 9998 }}
        >
            {/* Fan-out items — animate upward from toggle */}
            <div className="flex flex-col-reverse items-end gap-3 mb-3">
                <AnimatePresence>
                    {isOpen && items.map((item, index) => {
                        if (!item.content) return null;
                        return (
                            <motion.div
                                key={item.id}
                                className="pointer-events-auto"
                                initial={{ opacity: 0, y: 20, scale: 0.82 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{
                                    opacity: 0, y: 12, scale: 0.88,
                                    transition: { duration: 0.14, ease: 'easeIn' },
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 380,
                                    damping: 22,
                                    delay: index * 0.055,
                                }}
                                onClick={() => setIsOpen(false)}
                            >
                                {item.content}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Toggle button — hidden when nothing is behind it */}
            {hasVisible && (
                <motion.button
                    className={`
                        pointer-events-auto w-10 h-10 rounded-full shadow-lg
                        flex items-center justify-center
                        bg-zinc-800 dark:bg-zinc-100
                        border border-zinc-600 dark:border-zinc-300
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                    `}
                    onClick={() => setIsOpen(prev => !prev)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.91 }}
                    title={isOpen ? 'Hide actions' : 'Show actions'}
                    aria-label={isOpen ? 'Hide actions' : 'Show actions'}
                    aria-expanded={isOpen}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {isOpen ? (
                            <motion.span
                                key="x"
                                initial={{ rotate: -80, opacity: 0, scale: 0.7 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: 80, opacity: 0, scale: 0.7 }}
                                transition={{ duration: 0.18 }}
                            >
                                <X className="w-[18px] h-[18px] text-zinc-100 dark:text-zinc-800" />
                            </motion.span>
                        ) : (
                            <motion.span
                                key="menu"
                                initial={{ rotate: 80, opacity: 0, scale: 0.7 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: -80, opacity: 0, scale: 0.7 }}
                                transition={{ duration: 0.18 }}
                            >
                                <MoreVertical className="w-[18px] h-[18px] text-zinc-100 dark:text-zinc-800" />
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            )}
        </div>
    );
}
