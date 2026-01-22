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
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface AdminSidebarProps {
    currentScreen: string;
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

const menuItems = [
    { id: 'SAdashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'SApackages', label: 'Packages', icon: Package },
    { id: 'SAASusers', label: 'Users', icon: Users },
    { id: 'SAbilling', label: 'Billing', icon: Receipt },
    { id: 'SAusage', label: 'Analytics', icon: BarChart3 },
    { id: 'SAsettings', label: 'Settings', icon: Settings },
];

export function AdminSidebar({ currentScreen, onNavigate, onLogout }: AdminSidebarProps) {
    const { sidebarCollapsed, toggleSidebar, adminUser } = useAdminStore();

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
                                <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">SA</span>
                                </div>
                                <span className="font-semibold text-lg">Admin Portal</span>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="lg:hidden"
                        >
                            <X className="h-5 w-5" />
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
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-purple-600 text-white'
                                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                            sidebarCollapsed && 'justify-center'
                                        )}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        {!sidebarCollapsed && <span>{item.label}</span>}
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
                                        <AvatarFallback className="bg-purple-600 text-white">
                                            {adminUser.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{adminUser.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{adminUser.email}</p>
                                    </div>
                                </div>
                                <Separator />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onLogout}
                                    className="w-full justify-start"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
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
