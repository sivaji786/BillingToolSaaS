import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    loading?: boolean;
    className?: string;
    onClick?: () => void;
}

export function StatsCard({ title, value, icon: Icon, trend, loading, className, onClick }: StatsCardProps) {
    const { t } = useLanguage();
    if (loading) {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            className={cn(className, "transition-all hover:shadow-md", onClick && "cursor-pointer hover:border-primary/50")}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <div className="flex items-center text-xs mt-1">
                        {trend.isPositive ? (
                            <ArrowUp className="h-3 w-3 text-green-600 dark:text-green-400 mr-1" />
                        ) : (
                            <ArrowDown className="h-3 w-3 text-red-600 dark:text-red-400 mr-1" />
                        )}
                        <span
                            className={cn(
                                'font-medium',
                                trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            )}
                        >
                            {Math.abs(trend.value)}%
                        </span>
                        <span className="text-muted-foreground ml-1">{t('stats.fromLastMonth')}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
