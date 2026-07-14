export const DATE_OPTS = [
    { label: 'All time',    value: '__all__' },
    { label: 'Today',       value: 'today' },
    { label: 'Yesterday',   value: 'yesterday' },
    { label: 'This Week',   value: 'this_week' },
    { label: 'Last Week',   value: 'last_week' },
    { label: 'This Month',  value: 'this_month' },
    { label: 'Last Month',  value: 'last_month' },
    { label: 'Custom range…', value: 'custom' },
];

export type SortValue =
    | 'due_date_asc' | 'due_date_desc'
    | 'created_at_desc' | 'created_at_asc'
    | 'title_asc' | 'title_desc'
    | 'priority_desc' | 'priority_asc';

export const SORT_OPTS: { value: SortValue; label: string; sort: 'due_date' | 'created_at' | 'title' | 'priority'; dir: 'asc' | 'desc' }[] = [
    { value: 'due_date_asc',    label: 'Due date (earliest)', sort: 'due_date',   dir: 'asc' },
    { value: 'due_date_desc',   label: 'Due date (latest)',   sort: 'due_date',   dir: 'desc' },
    { value: 'created_at_desc', label: 'Newest created',      sort: 'created_at', dir: 'desc' },
    { value: 'created_at_asc',  label: 'Oldest created',      sort: 'created_at', dir: 'asc' },
    { value: 'title_asc',       label: 'Title (A–Z)',         sort: 'title',      dir: 'asc' },
    { value: 'title_desc',      label: 'Title (Z–A)',         sort: 'title',      dir: 'desc' },
    { value: 'priority_desc',   label: 'Priority (high first)', sort: 'priority', dir: 'desc' },
    { value: 'priority_asc',    label: 'Priority (low first)',  sort: 'priority', dir: 'asc' },
];

export const DEFAULT_SORT: SortValue = 'due_date_asc';

export function computeDateRange(datePreset: string, customFrom: string, customTo: string): { dateFrom: string; dateTo: string } {
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const now  = new Date();
    const dow  = now.getDay(); // 0 = Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;

    switch (datePreset) {
        case 'today':
            return { dateFrom: fmt(now), dateTo: fmt(now) };
        case 'yesterday': {
            const d = new Date(now); d.setDate(d.getDate() - 1);
            return { dateFrom: fmt(d), dateTo: fmt(d) };
        }
        case 'this_week': {
            const mon = new Date(now); mon.setDate(now.getDate() + mondayOffset);
            const sun = new Date(mon);  sun.setDate(mon.getDate() + 6);
            return { dateFrom: fmt(mon), dateTo: fmt(sun) };
        }
        case 'last_week': {
            const mon = new Date(now); mon.setDate(now.getDate() + mondayOffset - 7);
            const sun = new Date(mon);  sun.setDate(mon.getDate() + 6);
            return { dateFrom: fmt(mon), dateTo: fmt(sun) };
        }
        case 'this_month': {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { dateFrom: fmt(first), dateTo: fmt(last) };
        }
        case 'last_month': {
            const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const last  = new Date(now.getFullYear(), now.getMonth(), 0);
            return { dateFrom: fmt(first), dateTo: fmt(last) };
        }
        case 'custom':
            return { dateFrom: customFrom, dateTo: customTo };
        default:
            return { dateFrom: '', dateTo: '' };
    }
}
