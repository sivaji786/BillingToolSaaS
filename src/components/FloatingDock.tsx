import * as React from 'react';
import { useFloatingDock } from '../contexts/FloatingDockContext';

/**
 * Renders all registered floating launchers in a vertical stack
 * anchored to the bottom-right corner. Panels opened by these
 * launchers render independently via their own portals.
 *
 * Stack order (bottom → top): lower `order` value = closer to corner.
 *   order 1 = Support Ticket  (always visible)
 *   order 2 = AI Assistant    (invoice/letter screens)
 *   order 3 = Edit Mode bar   (SA admin only)
 */
export function FloatingDock() {
    const { slots } = useFloatingDock();
    if (!slots.length) return null;

    return (
        <div
            className="fixed bottom-6 right-6 flex flex-col-reverse items-end gap-3 pointer-events-none"
            style={{ zIndex: 9998 }}
        >
            {slots.map(slot => (
                <div key={slot.id} className="pointer-events-auto">
                    {slot.fn.current()}
                </div>
            ))}
        </div>
    );
}
