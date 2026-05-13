import * as React from "react"
import {
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
    Folder
} from "lucide-react"

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

    const navPlatform = [
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
            <SidebarHeader className="h-16 border-b border-sidebar-border bg-purple-600 text-white">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="text-white hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white text-purple-600">
                                <GalleryVerticalEnd className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{profile?.name || t('appName')}</span>
                                <span className="truncate text-xs text-purple-100">{t('appSubtitle') || "Enterprise"}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {navMain.map((group) => (
                    <React.Fragment key={group.title}>
                        <SidebarMenu>
                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                                {group.title}
                            </div>
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        onClick={() => onNavigate(item.url)}
                                        isActive={item.isActive}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                        <SidebarSeparator className="my-2" />
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
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{user?.name || 'User'}</span>
                                        <span className="truncate text-xs">{user?.email || 'example@humpl.org'}</span>
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
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage src={user?.avatar} alt={user?.name} />
                                            <AvatarFallback className="rounded-lg">{user?.name?.substring(0, 2)?.toUpperCase() || 'US'}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">{user?.name}</span>
                                            <span className="truncate text-xs">{user?.email}</span>
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
