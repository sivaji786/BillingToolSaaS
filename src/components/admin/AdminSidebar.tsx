import {
    LayoutDashboard,
    Package,
    Users,
    Receipt,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Ticket,
    BookOpen,
    Globe,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useLanguage } from '../../contexts/LanguageContext';

interface AdminSidebarProps {
    currentScreen: string;
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export function AdminSidebar({ currentScreen, onNavigate, onLogout }: AdminSidebarProps) {
    const sidebarCollapsed = useAdminStore(s => s.sidebarCollapsed);
    const toggleSidebar = useAdminStore(s => s.toggleSidebar);
    const adminUser = useAdminStore(s => s.adminUser);
    const { t } = useLanguage();

    const menuItems = [
        { id: 'SAdashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { id: 'SApackages', label: t('nav.products'), icon: Package },
        { id: 'SAASusers', label: t('nav.clients'), icon: Users },
        { id: 'SAbilling', label: t('billing.title'), icon: Receipt },
        { id: 'SAusage', label: t('nav.reports'), icon: BarChart3 },
        { id: 'SATickets', label: 'Tickets', icon: Ticket },
        { id: 'SAWiki', label: 'Wiki', icon: BookOpen },
        { id: 'SAPages', label: 'CMS & Navigation', icon: Globe },
        { id: 'SAsettings', label: t('nav.settings'), icon: Settings },
    ];

    return (
        <>
            {/* Mobile overlay */}
            {!sidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-50 h-screen bg-card border-r transition-all duration-300',
                    sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64',
                    'lg:sticky lg:top-0'
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex h-16 items-center justify-between px-4 border-b">
                        {!sidebarCollapsed && (
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-[#f08a3c] flex items-center justify-center">
                                    <span className="text-white font-medium text-body">{t('admin.sa')}</span>
                                </div>
                                <span className="font-medium text-body">{t('admin.adminPortal')}</span>
                            </div>
                        )}
                        {/* Mobile close */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="lg:hidden"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        {/* Desktop collapse/expand */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="hidden lg:flex h-7 w-7 text-muted-foreground hover:text-foreground"
                            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {sidebarCollapsed
                                ? <ChevronRight className="h-4 w-4" />
                                : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <ScrollArea className="flex-1 px-3 py-4">
                        <nav className="space-y-1">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentScreen === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onNavigate(item.id);
                                            if (window.innerWidth < 1024) {
                                                toggleSidebar();
                                            }
                                        }}
                                        className={cn(
                                            'w-full flex items-start gap-3 px-3 py-2 rounded-lg text-body font-medium transition-colors',
                                            isActive
                                                ? 'bg-[#f08a3c] text-white'
                                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                            sidebarCollapsed && 'justify-center items-center'
                                        )}
                                    >
                                        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                                        {!sidebarCollapsed && (
                                            <span className="leading-snug text-left">{item.label}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </ScrollArea>

                    {/* User section */}
                    <div className="border-t p-4">
                        {!sidebarCollapsed && adminUser ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src="" alt={adminUser.name} />
                                        <AvatarFallback className="bg-[#f08a3c] text-white">
                                            {adminUser.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-medium truncate">{adminUser.name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{adminUser.email}</p>
                                    </div>
                                </div>
                                <Separator />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        sessionStorage.setItem('cms_edit_mode', '1');
                                        onNavigate('landing');
                                    }}
                                    className="w-full justify-start text-[#2a8fbd] border-[rgba(30,58,95,0.15)] hover:bg-[#f0f6ff]"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Edit Live Site
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onLogout}
                                    className="w-full justify-start"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {t('admin.logout')}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onLogout}
                                className="w-full"
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile menu button */}
            <Button
                variant="outline"
                size="icon"
                onClick={toggleSidebar}
                className="fixed bottom-4 right-4 z-40 lg:hidden shadow-lg"
            >
                <Menu className="h-5 w-5" />
            </Button>
        </>
    );
}
