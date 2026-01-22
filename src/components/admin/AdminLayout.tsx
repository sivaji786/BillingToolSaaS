import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { ThemeToggle } from './ThemeToggle';

interface AdminLayoutProps {
    children: ReactNode;
    currentScreen: string;
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export function AdminLayout({ children, currentScreen, onNavigate, onLogout }: AdminLayoutProps) {

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
                        <h1 className="text-2xl font-bold capitalize">
                            {currentScreen.replace('SA', '').replace('SAAS', '')}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
