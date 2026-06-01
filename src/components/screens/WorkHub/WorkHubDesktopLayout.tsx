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

const ROLE_COLORS: Record<WHRole, string> = {
    worker:  'bg-blue-100 text-blue-700',
    planner: 'bg-purple-100 text-purple-700',
    manager: 'bg-amber-100 text-amber-700',
    client:  'bg-green-100 text-green-700',
    finance: 'bg-rose-100 text-rose-700',
};

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
        <div className="hidden md:flex h-[calc(100vh-4rem)] overflow-hidden">
            {/* Left: project tree */}
            <aside
                className={cn(
                    'flex flex-col border-r bg-sidebar transition-all duration-200 overflow-hidden shrink-0',
                    sidebarCollapsed ? 'w-12' : 'w-60'
                )}
            >
                <div className="flex items-center justify-between h-10 px-3 border-b shrink-0">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">Projects</span>
                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', ROLE_COLORS[role])}>
                                {ROLE_LABELS[role]}
                            </span>
                        </div>
                    )}
                    {!sidebarCollapsed && onAdd && (
                        <button
                            onClick={onAdd}
                            className="text-muted-foreground hover:text-purple-600 transition-colors ml-auto mr-1"
                            title="New project"
                        >
                            <FolderPlus className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed((v) => !v)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-1">
                    {/* All tasks entry */}
                    <button
                        onClick={() => onSelectProject(null)}
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-body transition-colors hover:bg-accent',
                            selectedProjectId === null ? 'bg-purple-50 text-purple-700 font-medium' : 'text-foreground'
                        )}
                    >
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">All Tasks</span>}
                    </button>

                    {projects.map((p) => {
                        const isConfirming = confirmDeleteId === p.id;
                        return (
                            <div key={p.id} className="group relative">
                                <button
                                    onClick={() => onSelectProject(p.id)}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2 text-body transition-colors hover:bg-accent',
                                        selectedProjectId === p.id ? 'bg-purple-50 text-purple-700 font-medium' : 'text-foreground'
                                    )}
                                >
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: p.colour_accent ?? '#a78bfa' }}
                                    />
                                    {!sidebarCollapsed && (
                                        <span className="truncate flex-1 text-left">{p.name}</span>
                                    )}
                                    {!sidebarCollapsed && (
                                        <span className="text-caption text-muted-foreground group-hover:invisible">
                                            {(['planner', 'manager', 'finance'].includes(role)
                                                ? p.task_count
                                                : p.my_task_count
                                            ) ?? p.task_count ?? ''}
                                        </span>
                                    )}
                                </button>

                                {!sidebarCollapsed && (onEdit || onDelete) && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-sidebar/90 rounded px-0.5">
                                        {onEdit && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                                                className="p-1 rounded text-muted-foreground hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                title="Edit project"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); requestDelete(p.id); }}
                                                className={cn(
                                                    'p-1 rounded transition-colors',
                                                    isConfirming
                                                        ? 'text-red-600 bg-red-50'
                                                        : 'text-muted-foreground hover:text-red-600 hover:bg-red-50'
                                                )}
                                                title={isConfirming ? 'Click again to confirm delete' : 'Delete project'}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar footer — Navigation + Profile + Settings */}
                <div className="border-t shrink-0 py-1">
                    {onTimer && (
                        <button
                            onClick={onTimer}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-body transition-colors hover:bg-accent',
                                activePanel === 'timer' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-muted-foreground'
                            )}
                            title="Timer"
                        >
                            <Timer className="w-4 h-4 shrink-0" />
                            {!sidebarCollapsed && <span className="truncate">Timer</span>}
                        </button>
                    )}
                    {onReports && (
                        <button
                            onClick={onReports}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-body transition-colors hover:bg-accent',
                                activePanel === 'reports' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-muted-foreground'
                            )}
                            title="Reports / Timesheet"
                        >
                            <FileText className="w-4 h-4 shrink-0" />
                            {!sidebarCollapsed && <span className="truncate">Reports</span>}
                        </button>
                    )}
                    {onInbox && (
                        <button
                            onClick={onInbox}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-body transition-colors hover:bg-accent',
                                activePanel === 'inbox' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-muted-foreground'
                            )}
                            title="Inbox"
                        >
                            <div className="relative shrink-0">
                                <Inbox className="w-4 h-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            {!sidebarCollapsed && (
                                <span className="truncate flex-1 text-left">Inbox</span>
                            )}
                            {!sidebarCollapsed && unreadCount > 0 && (
                                <span className="text-caption px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium shrink-0">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    )}
                    {(onProfile || onSettings) && (onTimer || onReports || onInbox) && (
                        <div className="my-1 mx-3 border-t" />
                    )}
                    {onProfile && (
                        <button
                            onClick={onProfile}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-body transition-colors hover:bg-accent',
                                activePanel === 'profile' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-muted-foreground'
                            )}
                            title="My Worker Profile"
                        >
                            <User className="w-4 h-4 shrink-0" />
                            {!sidebarCollapsed && <span className="truncate">Profile</span>}
                        </button>
                    )}
                    {onSettings && (
                        <button
                            onClick={onSettings}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-body transition-colors hover:bg-accent',
                                activePanel === 'settings' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-muted-foreground'
                            )}
                            title="WorkHub Settings"
                        >
                            <Settings className="w-4 h-4 shrink-0" />
                            {!sidebarCollapsed && <span className="truncate">Settings</span>}
                        </button>
                    )}
                </div>
            </aside>

            {/* Col 3: content area — shows task list OR task detail, never both simultaneously */}
            <main className="flex-1 overflow-y-auto">
                {hasDetailOpen ? taskDetail : taskList}
            </main>
        </div>
    );
}
