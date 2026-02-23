// Admin Portal Type Definitions

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin';
    createdAt: string;
    lastLogin?: string;
}

export interface Ticket {
    id: string;
    subject: string;
    description: string;
    project_id?: string;
    client_ip?: string;
    screenshot_path?: string;
    status?: string;
    priority?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Package {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    duration: 'monthly' | 'yearly' | 'lifetime';
    features: PackageFeature[];
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

export interface PackageFeature {
    id?: string;
    name: string;
    value: string | number | boolean;
    type: 'storage' | 'users' | 'bandwidth' | 'api_calls' | 'custom';
}

export interface SaasUser {
    id: string;
    name: string;
    email: string;
    packageId: string;
    packageName: string;
    status: 'active' | 'suspended' | 'inactive';
    joinedDate: string;
    lastLogin?: string;
    usageStats?: UsageStats;
    subdomain?: string;
}

export interface UsageStats {
    storageUsed: number;
    storageLimit: number;
    apiCalls: number;
    apiCallsLimit: number;
    bandwidthUsed: number;
    bandwidthLimit: number;
    activeUsers: number;
    activeUsersLimit: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    currency: string;
    status: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
    issueDate: string;
    dueDate: string;
    paidDate?: string;
    items: InvoiceItem[];
    pdfUrl?: string;
}

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface DashboardStats {
    totalUsers: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
    apiCalls: number;
    totalRevenue: number;
    newUsersThisMonth: number;
    churnRate: number;
    averageRevenuePerUser: number;
    revenueHistory: { month: string; revenue: number }[];
    userGrowthHistory: { month: string; users: number }[];
    recentActivity: ActivityItem[];
    userTrend: { value: number; isPositive: boolean };
    revenueTrend: { value: number; isPositive: boolean };
    subscriptionTrend: { value: number; isPositive: boolean };
    apiCallsTrend: { value: number; isPositive: boolean };
}

export interface ActivityItem {
    id: string;
    type: 'user_signup' | 'package_upgrade' | 'payment_received' | 'user_suspended' | 'package_created';
    description: string;
    timestamp: string;
    userId?: string;
    userName?: string;
}

export interface UsageMetrics {
    storageUsed: number;
    storageLimit: number;
    apiCalls: number;
    apiCallsLimit: number;
    bandwidthUsed: number;
    bandwidthLimit: number;
    activeSessions: number;
    activeSessionsLimit: number;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    historicalData: {
        date: string;
        storage: number;
        apiCalls: number;
        bandwidth: number;
        sessions: number;
    }[];
}

export interface MetricDataPoint {
    date: string;
    value: number;
    label?: string;
}

export interface AdminSettings {
    profile: {
        name: string;
        email: string;
    };
    companyDetails: {
        name: string;
        vatId: string;
        address: {
            street: string;
            city: string;
            postalCode: string;
            country: string;
        };
        email: string;
        phone: string;
        bankDetails?: {
            accountName: string;
            iban: string;
            bic: string;
        };
    };
    companyProfile: {
        id?: number;
        name: string;
        vat_id?: string;
        street: string;
        city: string;
        postal_code: string;
        country: string;
        email: string;
        phone?: string;
        bank_account_name?: string;
        bank_iban?: string;
        bank_bic?: string;
        created_at?: string;
        updated_at?: string;
    };
    apiKeys: ApiKey[];
    systemSettings: {
        maintenanceMode: boolean;
        allowSignups: boolean;
        emailNotifications: boolean;
    };
    theme: 'light' | 'dark' | 'system';
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsed?: string;
    status: 'active' | 'revoked';
}

// API Response Types
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

// Filter and Search Types
export interface UserFilters {
    search?: string;
    packageId?: string;
    status?: 'active' | 'suspended' | 'inactive';
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'name' | 'email' | 'joinedDate' | 'lastLogin';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface InvoiceFilters {
    search?: string;
    status?: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    sortBy?: 'invoiceNumber' | 'amount' | 'issueDate' | 'dueDate';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface UsageFilters {
    userId?: string;
    packageId?: string;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate?: string;
    endDate?: string;
}

// Chart Data Types
export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
}
export interface RevenueStats {
    totalRevenue: number;
    paidInvoices: number;
    pendingInvoices: number;
    monthlyData: {
        month: string;
        revenue: number;
    }[];
    growth: string;
}

// Form Types
export interface PackageFormData {
    name: string;
    description?: string;
    price: number;
    currency: string;
    duration: 'monthly' | 'yearly' | 'lifetime';
    features: PackageFeature[];
    status: 'active' | 'inactive';
}

export interface InvoiceFormData {
    userId: string;
    items: InvoiceItem[];
    dueDate: string;
    notes?: string;
}
