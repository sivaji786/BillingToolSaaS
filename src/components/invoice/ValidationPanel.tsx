import { ValidationError } from '../../types/invoice';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { ValidationChip } from './ValidationChip';
import { getValidationSummary } from '../../utils/invoice-validation';
import { useLanguage } from '../../contexts/LanguageContext';

interface ValidationPanelProps {
  errors: ValidationError[];
}

export function ValidationPanel({ errors }: ValidationPanelProps) {
  const { t } = useLanguage();
  const summary = getValidationSummary(errors);
  const hasErrors = errors.length > 0;

  const errorsByField = errors.reduce((acc, error) => {
    if (!acc[error.field]) {
      acc[error.field] = [];
    }
    acc[error.field].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  if (!hasErrors) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3>{t('editor.validation')}</h3>
          <ValidationChip severity="info" />
        </div>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>{t('editor.validInvoice')}</AlertTitle>
          <AlertDescription>
            {t('editor.validInvoiceDesc')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3>{t('editor.validation')}</h3>
        {summary.errorCount > 0 && (
          <ValidationChip severity="error" count={summary.errorCount} />
        )}
        {summary.warningCount > 0 && (
          <ValidationChip severity="warning" count={summary.warningCount} />
        )}
        {summary.infoCount > 0 && (
          <ValidationChip severity="info" count={summary.infoCount} />
        )}
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {Object.entries(errorsByField).map(([field, fieldErrors], fieldIndex) => (
            <div key={field} className="space-y-2">
              <div>
                <p className="text-muted-foreground text-body">{field}</p>
              </div>
              {fieldErrors.map((error, index) => (
                <Alert
                  key={`${field}-${error.message}-${index}`}
                  variant={error.severity === 'error' ? 'destructive' : 'default'}
                >
                  {error.severity === 'error' && <AlertCircle className="h-4 w-4" />}
                  {error.severity === 'warning' && <AlertTriangle className="h-4 w-4" />}
                  {error.severity === 'info' && <Info className="h-4 w-4" />}
                  <AlertTitle className="flex items-center justify-between">
                    {error.message}
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="text-micro text-muted-foreground">
                      UBL Path: <code className="text-micro">{error.ublPath}</code>
                    </p>
                    {error.suggestion && (
                      <p className="text-body">{error.suggestion}</p>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
              {fieldIndex < Object.keys(errorsByField).length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
