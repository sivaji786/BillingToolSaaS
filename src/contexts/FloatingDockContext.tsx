import * as React from 'react';

type RenderFn = () => React.ReactNode;

interface SlotEntry {
    id: string;
    order: number;
    fn: React.MutableRefObject<RenderFn>;
}

interface FloatingDockContextValue {
    slots: SlotEntry[];
    add: (entry: SlotEntry) => void;
    remove: (id: string) => void;
    ping: () => void;
    currentScreen: string;
    setScreen: (screen: string) => void;
}

const FloatingDockContext = React.createContext<FloatingDockContextValue | null>(null);

export function FloatingDockProvider({ children }: { children: React.ReactNode }) {
    const [slots, setSlots] = React.useState<SlotEntry[]>([]);
    const [currentScreen, setCurrentScreen] = React.useState('');

    const add = React.useCallback((entry: SlotEntry) => {
        setSlots(prev =>
            prev.some(s => s.id === entry.id)
                ? prev
                : [...prev, entry].sort((a, b) => a.order - b.order)
        );
    }, []);

    const remove = React.useCallback((id: string) => {
        setSlots(prev => prev.filter(s => s.id !== id));
    }, []);

    // Trigger a dock re-render so stale renderFn refs get refreshed
    const ping = React.useCallback(() => {
        setSlots(prev => [...prev]);
    }, []);

    const setScreen = React.useCallback((screen: string) => {
        setCurrentScreen(screen);
    }, []);

    return (
        <FloatingDockContext.Provider value={{ slots, add, remove, ping, currentScreen, setScreen }}>
            {children}
        </FloatingDockContext.Provider>
    );
}

export function useFloatingDock() {
    const ctx = React.useContext(FloatingDockContext);
    if (!ctx) throw new Error('useFloatingDock requires FloatingDockProvider');
    return ctx;
}
