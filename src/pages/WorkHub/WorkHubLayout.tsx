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
import { DEFAULT_SORT, SORT_OPTS, SortValue, computeDateRange } from '../../components/screens/WorkHub/taskFilterOptions';
import { useWorkhubTimerGuardian } from '../../hooks/useWorkhubTimerGuardian';

const TaskList   = lazy(() => import('../../components/screens/WorkHub/TaskList').then(m => ({ default: m.TaskList })));
const TaskDetail = lazy(() => import('../../components/screens/WorkHub/TaskDetail').then(m => ({ default: m.TaskDetail })));
const TimerWidget = lazy(() => import('../../components/screens/WorkHub/TimerWidget').then(m => ({ default: m.TimerWidget })));

type WHRole = 'worker' | 'planner' | 'manager' | 'client' | 'finance';

interface Props {
    onNavigate: (screen: string) => void;
}

const spin = <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-[#2a8fbd]" /></div>;

export function WorkHubLayout({ onNavigate }: Props) {
    const qc = useQueryClient();
    // Runs reminder ladders (target-time overrun, forgotten break) + their auto-stop/auto-resume
    // fallback once here, regardless of which timer UI or tab is currently visible.
    useWorkhubTimerGuardian();
    const [activeTab, setActiveTab] = useState<WHTab>('tasks');
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [datePreset,   setDatePreset]   = useState<string>('');
    const [customFrom,   setCustomFrom]   = useState<string>('');
    const [customTo,     setCustomTo]     = useState<string>('');
    const [workerFilter, setWorkerFilter] = useState<number | ''>('');
    const [sortValue,    setSortValue]    = useState<SortValue>(DEFAULT_SORT);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<WHProject | null>(null);
    const [desktopPanel, setDesktopPanel] = useState<'tasks' | 'profile' | 'timer' | 'reports' | 'inbox'>('tasks');

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
    const { dateFrom, dateTo } = useMemo(
        () => computeDateRange(datePreset, customFrom, customTo),
        [datePreset, customFrom, customTo]
    );

    const activeSort = SORT_OPTS.find((o) => o.value === sortValue) ?? SORT_OPTS[0];

    const { data: tasksData } = useQuery({
        queryKey: ['wh-tasks', selectedProjectId, statusFilter, dateFrom, dateTo, workerFilter, sortValue, myProfile?.id, seesAllTasks],
        queryFn: () => taskService.list({
            project_id: selectedProjectId ?? undefined,
            status: statusFilter || undefined,
            assigned_worker_id: seesAllTasks ? (workerFilter || undefined) : myProfile?.id,
            date_from: dateFrom || undefined,
            date_to:   dateTo   || undefined,
            sort:      activeSort.sort,
            sort_dir:  activeSort.dir,
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
        // Task create/update/delete (incl. reassigning a task's project) can shift per-project counts.
        qc.invalidateQueries({ queryKey: ['wh-projects'] });
    };

    const handleApproveReport = () => {
        // Placeholder — full approval modal wired here later
        toast.success('Approved');
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
                                workers={workers}
                                workerFilter={workerFilter}
                                onWorkerFilter={setWorkerFilter}
                                sortValue={sortValue}
                                onSort={setSortValue}
                                onSelectTask={handleTaskSelect}
                                onUpdated={handleTaskUpdated}
                            />
                        )
                    )}
                    {activeTab === 'timer' && role !== 'client' && (
                        <div className="p-4">
                            <TimerWidget onViewTask={handleTaskSelect} />
                        </div>
                    )}
                    {activeTab === 'inbox'    && <WorkHubInbox />}
                    {activeTab === 'reports'  && <WorkHubTimesheet />}
                    {activeTab === 'profile'  && <WorkHubProfile />}
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
                    onInbox={() => setDesktopPanel('inbox')}
                    onTimer={role !== 'client' && role !== 'finance' ? () => setDesktopPanel('timer') : undefined}
                    onReports={() => setDesktopPanel('reports')}
                    unreadCount={unreadCount}
                    activePanel={desktopPanel}
                    taskList={
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
                                projects={projects}
                                onSelectTask={handleTaskSelect}
                                onUpdated={handleTaskUpdated}
                                readOnly={false}
                                selectedProjectId={selectedProjectId}
                                role={role}
                                isAdmin={!!myProfile?.is_admin}
                                datePreset={datePreset}
                                onDatePreset={setDatePreset}
                                customFrom={customFrom}
                                customTo={customTo}
                                onCustomRange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
                                workerFilter={workerFilter}
                                onWorkerFilter={setWorkerFilter}
                                sortValue={sortValue}
                                onSort={setSortValue}
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
                                workers={workers}
                                workerFilter={workerFilter}
                                onWorkerFilter={setWorkerFilter}
                                sortValue={sortValue}
                                onSort={setSortValue}
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
                                workers={workers}
                                workerFilter={workerFilter}
                                onWorkerFilter={setWorkerFilter}
                                sortValue={sortValue}
                                onSort={setSortValue}
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
