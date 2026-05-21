import { AuditLogEntry } from '../../types/invoice';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  FileText,
  FileEdit,
  CheckCircle,
  Send,
  Download,
  Shield,
  Trash2,
  Clock,
} from 'lucide-react';

interface ActivityLogProps {
  entries: AuditLogEntry[];
}

export function ActivityLog({ entries }: ActivityLogProps) {
  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      created: FileText,
      updated: FileEdit,
      validated: CheckCircle,
      exported: Download,
      sent: Send,
      signed: Shield,
      deleted: Trash2,
    };
    return icons[action] || FileText;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: 'text-blue-600',
      updated: 'text-yellow-600',
      validated: 'text-green-600',
      exported: 'text-purple-600',
      sent: 'text-indigo-600',
      signed: 'text-green-700',
      deleted: 'text-red-600',
    };
    return colors[action] || 'text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Activity Log</h1>
        <p className="text-muted-foreground mt-2">
          Audit trail of all invoice operations and digital signatures
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-body text-muted-foreground">Total Events</p>
          <p className="text-heading-1 mt-1">{entries.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-body text-muted-foreground">Signed Invoices</p>
          <p className="text-heading-1 mt-1">
            {entries.filter((e) => e.signed).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-body text-muted-foreground">Exports</p>
          <p className="text-heading-1 mt-1">
            {entries.filter((e) => e.action === 'exported').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-body text-muted-foreground">Validations</p>
          <p className="text-heading-1 mt-1">
            {entries.filter((e) => e.action === 'validated').length}
          </p>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="p-6">
        <h2 className="mb-4">Recent Activity</h2>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {entries.map((entry) => {
              const Icon = getActionIcon(entry.action);
              const iconColor = getActionColor(entry.action);
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
                          Signed
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
                        {date} at {time}
                      </span>
                      <span>by {entry.user}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Info */}
      <Card className="p-6 bg-muted/50">
        <h3 className="mb-2">EN 16931 Compliance & Audit Trail</h3>
        <p className="text-body text-muted-foreground">
          All invoice operations are logged with timestamps and user information to maintain
          a complete audit trail. Digital signatures are tracked separately with signature
          dates for non-repudiation. This log helps ensure compliance with EN 16931
          requirements and provides transparency for accounting and legal purposes.
        </p>
      </Card>
    </div>
  );
}
