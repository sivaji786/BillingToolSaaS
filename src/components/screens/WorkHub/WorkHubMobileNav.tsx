import { ClipboardList, Timer, FileText, Inbox, User, Settings } from 'lucide-react';
import { useWorkhubTimerStore } from '../../../stores/workhubTimerStore';

export type WHTab = 'tasks' | 'timer' | 'reports' | 'inbox' | 'profile' | 'settings';

interface Props {
    active: WHTab;
    onNavigate: (tab: WHTab) => void;
    openTaskCount?: number;
    unreadCount?: number;
    canAccessSettings?: boolean;
}

const ALL_TABS: { id: WHTab; label: string; Icon: React.ElementType; privileged?: boolean }[] = [
    { id: 'tasks',    label: 'Tasks',    Icon: ClipboardList },
    { id: 'timer',    label: 'Timer',    Icon: Timer },
    { id: 'reports',  label: 'Reports',  Icon: FileText },
    { id: 'inbox',    label: 'Inbox',    Icon: Inbox },
    { id: 'profile',  label: 'Profile',  Icon: User },
    { id: 'settings', label: 'Settings', Icon: Settings, privileged: true },
];

export function WorkHubMobileNav({ active, onNavigate, openTaskCount = 0, unreadCount = 0, canAccessSettings = false }: Props) {
    const timerState = useWorkhubTimerStore((s) => s.state);
    const TABS = ALL_TABS.filter((t) => !t.privileged || canAccessSettings);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t flex md:hidden">
            {TABS.map(({ id, label, Icon }) => {
                const isActive = active === id;
                let badge: number | null = null;
                if (id === 'tasks' && openTaskCount > 0) badge = openTaskCount;
                if (id === 'inbox' && unreadCount > 0) badge = unreadCount;

                return (
                    <button
                        key={id}
                        onClick={() => onNavigate(id)}
                        className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
                            isActive ? 'text-purple-600' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <span className="relative">
                            <Icon className="w-5 h-5" />
                            {id === 'timer' && timerState === 'running' && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            )}
                            {id === 'timer' && timerState === 'break' && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                            {badge !== null && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center px-0.5">
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            )}
                        </span>
                        <span className="text-[10px]">{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
