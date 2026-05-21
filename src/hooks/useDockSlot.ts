import * as React from 'react';
import { useFloatingDock } from '../contexts/FloatingDockContext';

/**
 * Registers a launcher render function into the FloatingDock.
 * Returns `ping` — call it inside a useEffect when launcher-visible
 * state changes so the dock picks up the latest snapshot.
 */
export function useDockSlot(
    id: string,
    order: number,
    renderFn: () => React.ReactNode,
) {
    const { add, remove, ping } = useFloatingDock();
    const fnRef = React.useRef<() => React.ReactNode>(renderFn);
    // Always keep the ref up-to-date so dock reads fresh JSX
    fnRef.current = renderFn;

    React.useEffect(() => {
        add({ id, order, fn: fnRef });
        return () => remove(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, order]);

    return ping;
}
