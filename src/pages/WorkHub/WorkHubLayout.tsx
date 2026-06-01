import { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WorkHubGate } from '../../components/screens/WorkHub/WorkHubGate';
import { WorkHubMobileNav, WHTab } from '../../components/screens/WorkHub/WorkHubMobileNav';
import { WorkHubDesktopLayout } from '../../components/screens/WorkHub/WorkHubDesktopLayout';
import { TimerPip } from '../../components/screens/WorkHub/TimerPip';
import { OfflineBanner } from '../../components/screens/WorkHub/OfflineBanner';
import { KanbanBoard } from '../../components/screens/WorkHub/KanbanBoard';
import { FinanceTable } from '../../components/screens/WorkHub/FinanceTable';
import { projectService, taskService, inboxService, profileService, workerService, WHTask, WHProject, WHWorker } from '../../services/workhubApi';
import { ProjectModal } from '../../components/screens/WorkHub/ProjectModal';
import { WorkHubInbox } from './WorkHubInbox';
import { WorkHubProfile } from './WorkHubProfile';
import { WorkHubTimesheet } from './WorkHubTimesheet';
import { WorkHubSettings } from './WorkHubSettings';

const TaskList   = lazy(() => import('../../components/screens/WorkHub/TaskList').then(m => ({ default: m.TaskList })));
const TaskDetail = lazy(() => import('../../components/screens/WorkHub/TaskDetail').then(m => ({ default: m.TaskDetail })));
const TimerWidget = lazy(() => import('../../components/screens/WorkHub/TimerWidget').then(m => ({ default: m.TimerWidget })));

type WHRole = 'worker' | 'planner' | 'manager' | 'client' | 'finance';

interface Props {
    onNavigate: (screen: string) => void;
}

const spin = <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-purple-600" /></div>;

export function WorkHubLayout({ onNavigate }: Props) {
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<WHTab>('tasks');
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [datePreset,   setDatePreset]   = useState<string>('');
    const [customFrom,   setCustomFrom]   = useState<string>('');
    const [customTo,     setCustomTo]     = useState<string>('');
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<WHProject | null>(null);
    const [desktopPanel, setDesktopPanel] = useState<'tasks' | 'settings' | 'profile' | 'timer' | 'reports' | 'inbox'>('tasks');

    const { data: myProfile } = useQuery({
        queryKey: ['wh-profile'],
        queryFn: profileService.get,
        staleTime: 10 * 60 * 1000,
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['wh-projects'],
        queryFn: projectService.list,
        staleTime: 5 * 60 * 1000,
    });

    const role: WHRole = (myProfile?.role as WHRole) ?? 'worker';
    // Planners, managers, finance, and admins see all tasks; workers and clients see their own
    const seesAllTasks = myProfile?.is_admin || ['planner', 'manager', 'finance'].includes(role);

    // Compute effective date range from the active preset
    const { dateFrom, dateTo } = useMemo(() => {
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        const now  = new Date();
        const dow  = now.getDay(); // 0 = Sun
        const mondayOffset = dow === 0 ? -6 : 1 - dow;

        switch (datePreset) {
            case 'today':
                return { dateFrom: fmt(now), dateTo: fmt(now) };
            case 'yesterday': {
                const d = new Date(now); d.setDate(d.getDate() - 1);
                return { dateFrom: fmt(d), dateTo: fmt(d) };
            }
            case 'this_week': {
                const mon = new Date(now); mon.setDate(now.getDate() + mondayOffset);
                const sun = new Date(mon);  sun.setDate(mon.getDate() + 6);
                return { dateFrom: fmt(mon), dateTo: fmt(sun) };
            }
            case 'last_week': {
                const mon = new Date(now); mon.setDate(now.getDate() + mondayOffset - 7);
                const sun = new Date(mon);  sun.setDate(mon.getDate() + 6);
                return { dateFrom: fmt(mon), dateTo: fmt(sun) };
            }
            case 'this_month': {
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return { dateFrom: fmt(first), dateTo: fmt(last) };
            }
            case 'last_month': {
                const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const last  = new Date(now.getFullYear(), now.getMonth(), 0);
                return { dateFrom: fmt(first), dateTo: fmt(last) };
            }
            case 'custom':
                return { dateFrom: customFrom, dateTo: customTo };
            default:
                return { dateFrom: '', dateTo: '' };
        }
    }, [datePreset, customFrom, customTo]);

    const { data: tasksData } = useQuery({
        queryKey: ['wh-tasks', selectedProjectId, statusFilter, dateFrom, dateTo, myProfile?.id, seesAllTasks],
        queryFn: () => taskService.list({
            project_id: selectedProjectId ?? undefined,
            status: statusFilter || undefined,
            assigned_worker_id: seesAllTasks ? undefined : myProfile?.id,
            date_from: dateFrom || undefined,
            date_to:   dateTo   || undefined,
        }),
        enabled: !!myProfile,
        staleTime: 60 * 1000,
    });

    const { data: workers = [] } = useQuery({
        queryKey: ['wh-workers'],
        queryFn: workerService.list,
        staleTime: 5 * 60 * 1000,
        enabled: seesAllTasks,
    });

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['wh-inbox-unread'],
        queryFn: inboxService.unreadCount,
        refetchInterval: 60 * 1000,
    });

    const tasks: WHTask[] = tasksData?.data ?? [];
    const openCount = tasks.filter((t) => t.status === 'open').length;

    const deleteProjectMut = useMutation({
        mutationFn: (id: number) => projectService.delete(id),
        onSuccess: (_, id) => {
            toast.success('Project deleted');
            qc.invalidateQueries({ queryKey: ['wh-projects'] });
            if (selectedProjectId === id) setSelectedProjectId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to delete project'),
    });

    function openCreateProject() {
        setEditingProject(null);
        setProjectModalOpen(true);
    }

    function openEditProject(project: WHProject) {
        setEditingProject(project);
        setProjectModalOpen(true);
    }

    function handleProjectSaved() {
        setProjectModalOpen(false);
        qc.invalidateQueries({ queryKey: ['wh-projects'] });
    }

    const handleTaskSelect = (id: number) => {
        setSelectedTaskId(id);
        setActiveTab('tasks');
    };

    const handleTaskUpdated = () => {
        qc.invalidateQueries({ queryKey: ['wh-tasks'] });
        qc.invalidateQueries({ queryKey: ['wh-task', selectedTaskId] });
    };

    return (
        <WorkHubGate onUpgrade={() => onNavigate('billing')}>
            <OfflineBanner />

            {/* Mobile layout */}
            <div className="flex flex-col md:hidden min-h-[calc(100vh-4rem)] pb-16">
                <Suspense fallback={spin}>
                    {activeTab === 'tasks' && (
                        selectedTaskId ? (
                            <TaskDetail
                                taskId={selectedTaskId}
                                onBack={() => setSelectedTaskId(null)}
                                onUpdated={handleTaskUpdated}
                                workers={workers}
                                canEdit={seesAllTasks}
                            />
                        ) : (
                            <TaskList
                                tasks={tasks}
                                statusFilter={statusFilter}
                                onStatusFilter={setStatusFilter}
                                datePreset={datePreset}
                                onDatePreset={setDatePreset}
                                customFrom={customFrom}
                                customTo={customTo}
                                onCustomRange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
                                onSelectTask={handleTaskSelect}
                                onUpdated={handleTaskUpdated}
                            />
                        )
                    )}
                    {activeTab === 'timer' && (
                        <div className="p-4">
                            <TimerWidget onViewTask={handleTaskSelect} />
                        </div>
                    )}
                    {activeTab === 'inbox'    && <WorkHubInbox />}
                    {activeTab === 'reports'  && <WorkHubTimesheet />}
                    {activeTab === 'profile'  && <WorkHubProfile />}
                    {activeTab === 'settings' && seesAllTasks && <WorkHubSettings />}
                </Suspense>
            </div>

            {/* Desktop layout */}
            <Suspense fallback={spin}>
                <WorkHubDesktopLayout
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    role={role}
                    onSelectProject={(id) => {
                        setSelectedProjectId(id);
                        setSelectedTaskId(null);
                        setDesktopPanel('tasks');
                    }}
                    hasDetailOpen={desktopPanel === 'tasks' && selectedTaskId !== null}
                    onAdd={role !== 'client' && role !== 'finance' ? openCreateProject : undefined}
                    onEdit={role !== 'client' && role !== 'finance' ? openEditProject : undefined}
                    onDelete={role !== 'client' && role !== 'finance' ? (id) => deleteProjectMut.mutate(id) : undefined}
                    onProfile={() => setDesktopPanel('profile')}
                    onSettings={seesAllTasks ? () => setDesktopPanel('settings') : undefined}
                    onInbox={() => setDesktopPanel('inbox')}
                    onTimer={role !== 'client' && role !== 'finance' ? () => setDesktopPanel('timer') : undefined}
                    onReports={() => setDesktopPanel('reports')}
                    unreadCount={unreadCount}
                    activePanel={desktopPanel}
                    taskList={
                        desktopPanel === 'settings' ? <WorkHubSettings /> :
                        desktopPanel === 'profile'  ? <WorkHubProfile /> :
                        desktopPanel === 'inbox'    ? <WorkHubInbox /> :
                        desktopPanel === 'reports'  ? <WorkHubTimesheet /> :
                        desktopPanel === 'timer'    ? <div className="p-4"><TimerWidget onViewTask={handleTaskSelect} /></div> :
                        // Role-based default task view
                        role === 'finance' ? (
                            <FinanceTable onSelectTask={handleTaskSelect} />
                        ) : (role === 'planner' || role === 'manager' || myProfile?.is_admin) ? (
                            <KanbanBoard
                                tasks={tasks}
                                workers={workers}
                                onSelectTask={handleTaskSelect}
                                onUpdated={handleTaskUpdated}
                                readOnly={false}
                            />
                        ) : role === 'client' ? (
                            <TaskList
                                tasks={tasks}
                                statusFilter={statusFilter}
                                onStatusFilter={setStatusFilter}
                                datePreset={datePreset}
                                onDatePreset={setDatePreset}
                                customFrom={customFrom}
                                customTo={customTo}
                                onCustomRange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
                                onSelectTask={handleTaskSelect}
                                onUpdated={handleTaskUpdated}
                                readOnly
                            />
                        ) : (
                            // Worker (default)
                            <TaskList
                                tasks={tasks}
                                statusFilter={statusFilter}
                                onStatusFilter={setStatusFilter}
                                datePreset={datePreset}
                                onDatePreset={setDatePreset}
                                customFrom={customFrom}
                                customTo={customTo}
                                onCustomRange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
                                onSelectTask={handleTaskSelect}
                                onUpdated={handleTaskUpdated}
                            />
                        )
                    }
                    taskDetail={
                        selectedTaskId ? (
                            <TaskDetail
                                taskId={selectedTaskId}
                                onBack={() => setSelectedTaskId(null)}
                                onUpdated={handleTaskUpdated}
                                workers={workers}
                                canEdit={seesAllTasks}
                            />
                        ) : null
                    }
                />
            </Suspense>

            <WorkHubMobileNav
                active={activeTab}
                onNavigate={setActiveTab}
                openTaskCount={openCount}
                unreadCount={unreadCount}
                canAccessSettings={seesAllTasks}
            />

            <TimerPip onViewTask={handleTaskSelect} />

            {projectModalOpen && (
                <ProjectModal
                    project={editingProject}
                    onClose={() => setProjectModalOpen(false)}
                    onSaved={handleProjectSaved}
                />
            )}
        </WorkHubGate>
    );
}
