import * as React from "react"
import {
    Home,
    LayoutDashboard,
    FileText,
    LayoutTemplate,
    Activity,
    ShieldAlert,
    Settings as SettingsIcon,
    LogOut,
    CreditCard,
    ChevronsUpDown,
    GalleryVerticalEnd,
    Users,
    Folder,
    Briefcase
} from "lucide-react"
import { useAuthStore } from "../../stores/authStore"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "../ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { useLanguage } from "../../contexts/LanguageContext"

// Define props for the Sidebar
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    currentScreen: string;
    onNavigate: (screen: string) => void;
    onLogout: () => void;
    user: any;
    profile: any;
}

import { hasPermissionSync } from "../../hooks/usePermission"

// ... (keep usage in navMain)

export function AppSidebar({ currentScreen, onNavigate, onLogout, user, profile, ...props }: AppSidebarProps) {
    const { t } = useLanguage();
    const tenant = useAuthStore((s) => s.tenant);
    const workhubEnabled = Boolean((tenant as any)?.plan_features?.workhub_enabled);

    const navPlatform = [
        {
            title: t('nav.home') || 'Home',
            url: 'home',
            icon: Home,
            isActive: currentScreen === 'home',
        },
        {
            title: t('nav.dashboard') || "Dashboard",
            url: "dashboard",
            icon: LayoutDashboard,
            isActive: currentScreen === "dashboard",
        },
        {
            title: t('nav.workspace') || "My Workspace",
            url: "workspace",
            icon: Folder,
            isActive: currentScreen === "workspace",
        },
        {
            title: t('buyers.title') || "Buyers",
            url: "buyers",
            icon: Users,
            isActive: currentScreen === "buyers",
            permission: 'buyers.read'
        },
        {
            title: "Billing",
            url: "billing",
            icon: CreditCard,
            isActive: currentScreen === "billing",
        },
        {
            title: t('invoiceList.title') || "Invoices",
            url: "invoices",
            icon: FileText,
            isActive: currentScreen === "invoices",
            permission: 'invoices.read'
        },
        {
            title: t('nav.letters') || "Business Letters",
            url: "letters",
            icon: FileText,
            isActive: currentScreen === "letters",
        },
        {
            title: t('nav.templates') || "Templates",
            url: "templates",
            icon: LayoutTemplate,
            isActive: currentScreen === "templates",
            permission: 'company_profiles.read'
        },
        {
            title: t('nav.activity') || "Activity",
            url: "activity",
            icon: Activity,
            isActive: currentScreen === "activity",
            permission: 'audit_logs.read'
        },
        {
            title: "WorkHub",
            url: "workhub",
            icon: Briefcase,
            isActive: currentScreen === "workhub",
            workhub: true,
        },
    ].filter(item => !item.permission || hasPermissionSync(item.permission));

    const navManagement = [
        {
            title: "Admin",
            url: "admin",
            icon: ShieldAlert,
            isActive: currentScreen === "admin",
            permission: ['users.manage', 'roles.manage']
        },
        {
            title: t('nav.settings') || "Settings",
            url: "settings",
            icon: SettingsIcon,
            isActive: currentScreen === "settings",
            permission: 'company_profiles.read'
        },
    ].filter(item => {
        if (!item.permission) return true;
        if (Array.isArray(item.permission)) return item.permission.some(p => hasPermissionSync(p));
        return hasPermissionSync(item.permission as string);
    });

    const navMain = [
        {
            title: "Platform",
            items: navPlatform,
        },
        {
            title: "Management",
            items: navManagement,
        },
    ]

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="h-16 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="text-white hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white text-[#2a8fbd]">
                                <GalleryVerticalEnd className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-body leading-tight">
                                <span className="truncate font-medium">{profile?.name || t('appName')}</span>
                                <span className="truncate text-micro text-white">{t('appSubtitle') || "Enterprise"}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {navMain.map((group, gi) => (
                    <React.Fragment key={group.title}>
                        <SidebarMenu>
                            {/* Section label — with accent stripe */}
                            <div className="px-3 pt-3 pb-1 flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${gi === 0 ? 'bg-[#2a8fbd]' : 'bg-[#f08a3c]'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-sidebar-foreground/60 select-none">
                                    {group.title}
                                </span>
                            </div>

                            {group.items.map((item) => {
                                const isWorkhubLocked = (item as any).workhub && !workhubEnabled;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            tooltip={isWorkhubLocked ? "WorkHub — upgrade to unlock" : item.title}
                                            onClick={() => onNavigate(item.url)}
                                            isActive={item.isActive}
                                            className={[
                                                isWorkhubLocked ? 'opacity-60' : '',
                                                item.isActive ? 'font-semibold' : 'font-medium',
                                            ].join(' ')}
                                        >
                                            {item.icon && (
                                                <item.icon className={[
                                                    'shrink-0',
                                                    item.isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70',
                                                    isWorkhubLocked ? 'text-muted-foreground' : '',
                                                ].join(' ')} />
                                            )}
                                            <span className={item.isActive ? 'text-sidebar-primary-foreground' : ''}>
                                                {item.title}
                                            </span>
                                            {isWorkhubLocked && (
                                                <span className="ml-auto text-[9px] font-bold text-[#f08a3c] border border-[#f08a3c]/40 rounded px-1 leading-4 bg-[#f08a3c]/10">
                                                    Pro
                                                </span>
                                            )}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                        {gi < navMain.length - 1 && <SidebarSeparator className="my-1 opacity-30" />}
                    </React.Fragment>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user?.avatar} alt={user?.name} />
                                        <AvatarFallback className="rounded-lg">{user?.name?.substring(0, 2)?.toUpperCase() || 'US'}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-body leading-tight">
                                        <span className="truncate font-medium">{user?.name || 'User'}</span>
                                        <span className="truncate text-micro">{user?.email || 'example@humpl.org'}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-body">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage src={user?.avatar} alt={user?.name} />
                                            <AvatarFallback className="rounded-lg">{user?.name?.substring(0, 2)?.toUpperCase() || 'US'}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-body leading-tight">
                                            <span className="truncate font-medium">{user?.name}</span>
                                            <span className="truncate text-micro">{user?.email}</span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => onNavigate('settings')}>
                                        <SettingsIcon className="mr-2 h-4 w-4" />
                                        Account Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onNavigate('billing')}>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Billing
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={onLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
