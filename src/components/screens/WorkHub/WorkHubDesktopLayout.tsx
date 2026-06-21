import { useState, useRef, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, FolderPlus, Pencil, Trash2, User, Settings, Inbox, Timer, FileText } from 'lucide-react';
import { WHProject } from '../../../services/workhubApi';
import { cn } from '../../../lib/utils';

type WHRole = 'worker' | 'planner' | 'manager' | 'client' | 'finance';

const ROLE_LABELS: Record<WHRole, string> = {
    worker:  'Worker',
    planner: 'Planner',
    manager: 'Manager',
    client:  'Client',
    finance: 'Finance',
};

// Badge colors for the light sidebar background
const ROLE_BADGE: Record<WHRole, string> = {
    worker:  'bg-blue-100 text-blue-700',
    planner: 'bg-slate-100 text-slate-600',
    manager: 'bg-amber-100 text-amber-700',
    client:  'bg-emerald-100 text-emerald-700',
    finance: 'bg-rose-100 text-rose-700',
};

// Section label — small colored square + faint uppercase text (matches main AppSidebar pattern)
function SectionLabel({ children, accent = '#2a8fbd' }: { children: string; accent?: string }) {
    return (
        <div className="px-3 pt-3 pb-0.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: accent }} />
            <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#1e3a5f]/40 select-none">
                {children}
            </span>
        </div>
    );
}

// Nav button — light sidebar variant
function NavBtn({
    active, onClick, icon: Icon, label, badge, collapsed, title,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    badge?: React.ReactNode;
    collapsed?: boolean;
    title?: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title ?? label}
            className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-body transition-colors relative border-l-[3px]',
                active
                    ? 'bg-[#fff5ec] text-[#f08a3c] font-semibold border-[#f08a3c]'
                    : 'text-[#2d4a6b] hover:bg-[#e4ecf5] hover:text-[#1e3a5f] border-transparent'
            )}
        >
            <Icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? 'text-[#f08a3c]' : 'text-[#5b7fa6]')} />
            {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
            {!collapsed && badge}
        </button>
    );
}

interface Props {
    projects: WHProject[];
    selectedProjectId: number | null;
    onSelectProject: (id: number | null) => void;
    taskList: ReactNode;
    taskDetail: ReactNode;
    hasDetailOpen: boolean;
    role?: WHRole;
    onAdd?: () => void;
    onEdit?: (project: WHProject) => void;
    onDelete?: (projectId: number) => void;
    onProfile?: () => void;
    onSettings?: () => void;
    onInbox?: () => void;
    onTimer?: () => void;
    onReports?: () => void;
    unreadCount?: number;
    activePanel?: 'tasks' | 'settings' | 'profile' | 'timer' | 'reports' | 'inbox';
}

export function WorkHubDesktopLayout({
    projects,
    selectedProjectId,
    onSelectProject,
    taskList,
    taskDetail,
    hasDetailOpen,
    role = 'worker',
    onAdd,
    onEdit,
    onDelete,
    onProfile,
    onSettings,
    onInbox,
    onTimer,
    onReports,
    unreadCount = 0,
    activePanel = 'tasks',
}: Props) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function requestDelete(id: number) {
        if (confirmDeleteId === id) {
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmDeleteId(null);
            onDelete?.(id);
        } else {
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            setConfirmDeleteId(id);
            confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    }

    return (
        <div className="hidden md:flex overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>

            {/* ── Left sidebar — soft blue-gray, distinct from dark main nav ── */}
            <aside className={cn(
                'flex flex-col bg-[#f0f4f9] transition-all duration-200 overflow-hidden shrink-0',
                // Right shadow creates depth without a hard border line
                'shadow-[2px_0_8px_rgba(30,58,95,0.08)]',
                sidebarCollapsed ? 'w-12' : 'w-60'
            )}>

                {/* ── Header — uniform bg, no dark cap ───────────────────── */}
                <div className={cn(
                    'flex items-center justify-between h-12 px-3 border-b border-[rgba(30,58,95,0.09)] shrink-0',
                )}>
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold text-[#1e3a5f] uppercase tracking-[0.14em]">
                                Projects
                            </span>
                            <span className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                                ROLE_BADGE[role]
                            )}>
                                {ROLE_LABELS[role]}
                            </span>
                        </div>
                    )}
                    <div className={cn('flex items-center gap-1', sidebarCollapsed && 'w-full justify-center')}>
                        {!sidebarCollapsed && onAdd && (
                            <button
                                onClick={onAdd}
                                className="text-[#5b7fa6] hover:text-[#f08a3c] transition-colors"
                                title="New project"
                            >
                                <FolderPlus className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setSidebarCollapsed(v => !v)}
                            className="text-[#5b7fa6] hover:text-[#1e3a5f] transition-colors"
                            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {sidebarCollapsed
                                ? <ChevronRight className="w-4 h-4" />
                                : <ChevronLeft className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* ── Project list ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto py-1">

                    {/* All Tasks */}
                    <button
                        onClick={() => onSelectProject(null)}
                        title="All Tasks"
                        className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 text-body transition-colors border-l-[3px]',
                            selectedProjectId === null
                                ? 'bg-[#fff5ec] text-[#f08a3c] font-semibold border-[#f08a3c]'
                                : 'text-[#2d4a6b] hover:bg-[#e4ecf5] hover:text-[#1e3a5f] border-transparent'
                        )}
                    >
                        <FolderOpen className={cn('w-4 h-4 shrink-0', selectedProjectId === null ? 'text-[#f08a3c]' : 'text-[#5b7fa6]')} />
                        {!sidebarCollapsed && <span className="truncate font-medium">All Tasks</span>}
                    </button>

                    {/* "YOUR PROJECTS" section label */}
                    {projects.length > 0 && !sidebarCollapsed && (
                        <SectionLabel accent="#2a8fbd">Your Projects</SectionLabel>
                    )}

                    {projects.map(p => {
                        const isConfirming = confirmDeleteId === p.id;
                        const isActive = selectedProjectId === p.id;
                        return (
                            <div key={p.id} className="group relative">
                                <button
                                    onClick={() => onSelectProject(p.id)}
                                    title={p.name}
                                    className={cn(
                                        'w-full flex items-center gap-2.5 px-3 py-2 text-body transition-colors border-l-[3px]',
                                        isActive
                                            ? 'bg-[#fff5ec] text-[#f08a3c] font-semibold border-[#f08a3c]'
                                            : 'text-[#2d4a6b] hover:bg-[#e4ecf5] hover:text-[#1e3a5f] border-transparent'
                                    )}
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: p.colour_accent ?? '#2a8fbd' }}
                                    />
                                    {!sidebarCollapsed && (
                                        <>
                                            <span className="truncate flex-1 text-left">{p.name}</span>
                                            <span className={cn(
                                                'text-caption ml-auto group-hover:invisible font-medium',
                                                isActive ? 'text-[#f08a3c]' : 'text-[#8fa8c4]'
                                            )}>
                                                {(['planner', 'manager', 'finance'].includes(role)
                                                    ? p.task_count
                                                    : p.my_task_count
                                                ) ?? p.task_count ?? ''}
                                            </span>
                                        </>
                                    )}
                                </button>

                                {!sidebarCollapsed && (onEdit || onDelete) && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white/95 rounded px-0.5 shadow-sm border border-[rgba(30,58,95,0.10)]">
                                        {onEdit && (
                                            <button
                                                onClick={e => { e.stopPropagation(); onEdit(p); }}
                                                className="p-1 rounded text-[#5b7fa6] hover:text-[#f08a3c] hover:bg-[#fff5ec] transition-colors"
                                                title="Edit project"
                                                aria-label="Edit project"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                        {onDelete && (
                                            <>
                                                <div aria-live="polite" className="sr-only">
                                                    {isConfirming ? 'Click again to confirm deletion' : ''}
                                                </div>
                                                <button
                                                    onClick={e => { e.stopPropagation(); requestDelete(p.id); }}
                                                    className={cn(
                                                        'p-1 rounded transition-colors',
                                                        isConfirming
                                                            ? 'text-red-600 bg-red-50'
                                                            : 'text-[#5b7fa6] hover:text-red-600 hover:bg-red-50'
                                                    )}
                                                    title={isConfirming ? 'Click again to confirm delete' : 'Delete project'}
                                                    aria-label={isConfirming ? 'Click again to confirm delete' : 'Delete project'}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* New project button */}
                    {!sidebarCollapsed && onAdd && (
                        <div className="px-3 pt-2 pb-1">
                            <button
                                onClick={onAdd}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-[#b0c4de] text-[#8fa8c4] hover:border-[#f08a3c] hover:text-[#f08a3c] hover:bg-[#fff9f5] transition-colors text-body"
                            >
                                <span>New Project</span>
                                <Pencil className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            <p className="text-[9px] text-[#8fa8c4] mt-1 text-center tracking-wide">
                                to be filled by customer
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer — same soft bg, nav section ─────────────────── */}
                <div className="border-t border-[rgba(30,58,95,0.09)] shrink-0 pt-1 pb-2">

                    {/* Workspace section */}
                    {!sidebarCollapsed && (onTimer || onReports || onInbox) && (
                        <SectionLabel accent="#2a8fbd">Workspace</SectionLabel>
                    )}
                    {(onTimer || onReports || onInbox) && sidebarCollapsed && (
                        <div className="my-1 mx-3 border-t border-[rgba(30,58,95,0.09)]" />
                    )}

                    {onTimer && (
                        <NavBtn
                            active={activePanel === 'timer'}
                            onClick={onTimer!}
                            icon={Timer}
                            label="Timer"
                            collapsed={sidebarCollapsed}
                        />
                    )}
                    {onReports && (
                        <NavBtn
                            active={activePanel === 'reports'}
                            onClick={onReports!}
                            icon={FileText}
                            label="Reports"
                            collapsed={sidebarCollapsed}
                        />
                    )}
                    {onInbox && (
                        <NavBtn
                            active={activePanel === 'inbox'}
                            onClick={onInbox!}
                            icon={Inbox}
                            label="Inbox"
                            collapsed={sidebarCollapsed}
                            badge={unreadCount > 0 ? (
                                <span className="text-caption px-1.5 py-0.5 rounded-full bg-[#f08a3c] text-white font-semibold shrink-0 min-w-[18px] text-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            ) : undefined}
                        />
                    )}

                    {/* Account section */}
                    {!sidebarCollapsed && (onProfile || onSettings) && (
                        <SectionLabel accent="#f08a3c">Account</SectionLabel>
                    )}
                    {(onProfile || onSettings) && (onTimer || onReports || onInbox) && sidebarCollapsed && (
                        <div className="my-1 mx-3 border-t border-[rgba(30,58,95,0.09)]" />
                    )}

                    {onProfile && (
                        <NavBtn
                            active={activePanel === 'profile'}
                            onClick={onProfile!}
                            icon={User}
                            label="Profile"
                            collapsed={sidebarCollapsed}
                            title="My Worker Profile"
                        />
                    )}
                    {onSettings && (
                        <NavBtn
                            active={activePanel === 'settings'}
                            onClick={onSettings!}
                            icon={Settings}
                            label="Settings"
                            collapsed={sidebarCollapsed}
                            title="WorkHub Settings"
                        />
                    )}
                </div>
            </aside>

            {/* ── Main content area ─────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
                {hasDetailOpen ? taskDetail : taskList}
            </main>
        </div>
    );
}
