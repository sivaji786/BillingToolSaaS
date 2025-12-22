import { Badge } from '../ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ValidationChipProps {
  severity: 'error' | 'warning' | 'info';
  count?: number;
}

export function ValidationChip({ severity, count }: ValidationChipProps) {
  const config = {
    error: {
      icon: AlertCircle,
      variant: 'destructive' as const,
      label: 'Error',
    },
    warning: {
      icon: AlertTriangle,
      variant: 'default' as const,
      label: 'Warning',
    },
    info: {
      icon: Info,
      variant: 'secondary' as const,
      label: 'Info',
    },
  };

  const { icon: Icon, variant, label } = config[severity];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
      {count !== undefined && count > 0 && `: ${count}`}
    </Badge>
  );
}
