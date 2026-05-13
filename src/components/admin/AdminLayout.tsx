import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { TicketingWidget } from '../TicketingWidget';
import { useAdminStore } from '../../stores/adminStore';
import { getApiBaseUrl, getTicketingApiKey } from '../../utils/config';

interface AdminLayoutProps {
    children: ReactNode;
    currentScreen: string;
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export function AdminLayout({ children, currentScreen, onNavigate, onLogout }: AdminLayoutProps) {
    const adminUser = useAdminStore(s => s.adminUser);

    return (
        <div className="flex min-h-screen bg-background">
            <AdminSidebar
                currentScreen={currentScreen}
                onNavigate={onNavigate}
                onLogout={onLogout}
            />

            {/* Main content */}
            <div
                className="flex-1 flex flex-col transition-all duration-300"
            >
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {(() => {
                                switch (currentScreen) {
                                    case 'SAdashboard': return 'Dashboard';
                                    case 'SApackages': return 'Subscription Packages';
                                    case 'SAPackageForm': return 'Package Editor';
                                    case 'SAASusers': return 'SaaS Users';
                                    case 'SAUserDetails': return 'User Details';
                                    case 'SAbilling': return 'Revenue Overview';
                                    case 'SAInvoiceForm': return 'Generate Invoice';
                                    case 'SAusage': return 'Platform Usage';
                                    case 'SATickets': return 'Support Tickets';
                                    case 'SAWiki': return 'Platform Wiki';
                                    case 'SAsettings': return 'System Settings';
                                    default: return currentScreen.replace(/^SA+/, '').replace(/([A-Z])/g, ' $1').trim();
                                }
                            })()}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6">{children}</main>
            </div>

            {/* Bug reporting widget for SA portal */}
            <TicketingWidget
                apiKey={getTicketingApiKey()}
                apiBaseUrl={getApiBaseUrl()}
                userId={adminUser?.id?.toString()}
            />
        </div>
    );
}
