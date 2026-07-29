import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogService } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  FileText,
  FileEdit,
  CheckCircle,
  Send,
  Download,
  Shield,
  Trash2,
  Clock,
  Search,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 50;

const ACTION_ICONS: Record<string, any> = {
  created: FileText,
  updated: FileEdit,
  validated: CheckCircle,
  exported: Download,
  sent: Send,
  signed: Shield,
  deleted: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-blue-600',
  updated: 'text-yellow-600',
  validated: 'text-green-600',
  exported: 'text-[#2a8fbd]',
  sent: 'text-[#2a8fbd]',
  signed: 'text-green-700',
  deleted: 'text-red-600',
};

const LOCALE_TAGS: Record<string, string> = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', pl: 'pl-PL', ar: 'ar-SA',
};

export function ActivityLog() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', 'full', search, actionFilter, visibleCount],
    queryFn: () => auditLogService.getAll({
      limit: visibleCount,
      offset: 0,
      search: search.trim() || undefined,
      action: actionFilter !== 'all' ? actionFilter : undefined,
    }),
    staleTime: 30 * 1000,
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts ?? { signed: 0, exported: 0, validated: 0 };

  const localeTag = LOCALE_TAGS[language] ?? 'en-US';
  // The audit log doesn't store a per-actor timezone, so rather than fabricate one,
  // every timestamp is labeled with the VIEWER's own timezone abbreviation — honest
  // about which timezone the displayed time is in, per person+time-pairing rule.
  const viewerTzAbbrev = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(localeTag, { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
    } catch {
      return '';
    }
  }, [localeTag]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const actionOptions: { value: string; label: string }[] = [
    { value: 'all', label: t('activity.allTypes') },
    { value: 'created', label: t('activity.created') },
    { value: 'updated', label: t('activity.updated') },
    { value: 'validated', label: t('activity.validated') },
    { value: 'exported', label: t('activity.exported') },
    { value: 'sent', label: t('activity.sent') },
    { value: 'signed', label: t('activity.signed') },
    { value: 'deleted', label: t('activity.deleted') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>{t('activity.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('activity.subtitle')}</p>
      </div>

      {/* Stats — signed/exports/validations reflect the SAME filters as the total,
          not just the currently-loaded page, so they can never quietly mean something
          different from the headline count. */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-body text-muted-foreground">{t('activity.totalEvents')}</p>
          <p className="text-heading-1 mt-1">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-body text-muted-foreground">{t('activity.signedInvoices')}</p>
          <p className="text-heading-1 mt-1">{counts.signed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-body text-muted-foreground">{t('activity.exportsStat')}</p>
          <p className="text-heading-1 mt-1">{counts.exported}</p>
        </Card>
        <Card className="p-4">
          <p className="text-body text-muted-foreground">{t('activity.validationsStat')}</p>
          <p className="text-heading-1 mt-1">{counts.validated}</p>
        </Card>
      </div>

      {/* Filter bar — sits above the list and governs everything shown below it */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder={t('activity.searchPlaceholder')}
              className="pl-9"
              aria-label={t('activity.searchPlaceholder')}
            />
          </div>
          <Select
            value={actionFilter}
            onValueChange={(v) => { setActionFilter(v); setVisibleCount(PAGE_SIZE); }}
          >
            <SelectTrigger className="sm:w-56" aria-label={t('activity.filterType')}>
              <SelectValue placeholder={t('activity.filterType')} />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Activity Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2>{t('activity.title')}</h2>
          <span className="text-body text-muted-foreground">
            {t('activity.showingCount', { shown: String(entries.length), total: String(total) })}
          </span>
        </div>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-body font-medium">{t('activity.noActivity')}</p>
              <p className="text-body text-muted-foreground mt-1">{t('activity.noActivityDesc')}</p>
            </div>
          ) : (
            entries.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] || FileText;
              const iconColor = ACTION_COLORS[entry.action] || 'text-gray-600';
              const { date, time } = formatTimestamp(entry.timestamp);

              return (
                <div
                  key={entry.id}
                  className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`${iconColor} mt-1`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p>
                        {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}{' '}
                        <span className="text-primary">{entry.invoiceNumber}</span>
                      </p>
                      {entry.signed && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {t('activity.signed')}
                        </Badge>
                      )}
                    </div>

                    {entry.details && (
                      <p className="text-body text-muted-foreground mb-2">
                        {entry.details}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-body text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {date} {time} {viewerTzAbbrev}
                      </span>
                      <span>{t('activity.by', { user: entry.user })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!isLoading && entries.length < total && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              disabled={isFetching}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('activity.loadMore')}
            </Button>
          </div>
        )}
      </Card>

      {/* Info */}
      <Card className="p-6 bg-muted/50">
        <h3 className="mb-2">{t('activity.complianceTitle')}</h3>
        <p className="text-body text-muted-foreground">{t('activity.complianceText')}</p>
      </Card>
    </div>
  );
}
