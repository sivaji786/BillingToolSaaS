import { ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { LayoutDashboard, FileText, Settings, CreditCard, LogOut, Menu, PlusCircle, Users } from 'lucide-react';
import { useState } from 'react';

interface CustomerLayoutProps {
    children: ReactNode;
    currentScreen: string;
    onNavigate: (screen: string) => void;
}

export function CustomerLayout({ children, currentScreen, onNavigate }: CustomerLayoutProps) {
    const { user, tenant, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'create-invoice', label: 'Create Invoice', icon: PlusCircle },
        { id: 'invoices', label: 'My Invoices', icon: FileText },
        { id: 'buyers', label: 'Clients', icon: Users },
        { id: 'subscription', label: 'Subscription', icon: CreditCard },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleLogout = () => {
        logout();
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card sticky top-0 z-50">
                <div className="flex h-16 items-center px-4 gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        <span className="font-bold text-lg">BillingTool</span>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant?.company_name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout}>
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        } fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-card transition-transform md:translate-x-0`}
                >
                    <nav className="space-y-1 p-4">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentScreen === item.id;
                            return (
                                <Button
                                    key={item.id}
                                    variant={isActive ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => {
                                        onNavigate(item.id);
                                        setSidebarOpen(false);
                                    }}
                                >
                                    <Icon className="h-4 w-4 mr-2" />
                                    {item.label}
                                </Button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
