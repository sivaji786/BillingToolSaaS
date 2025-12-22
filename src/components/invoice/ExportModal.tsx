import { useState } from 'react';
import { ExportOptions } from '../../types/invoice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { FileText, Code, Package, FileJson, FileSpreadsheet, Download, Loader2 } from 'lucide-react';

interface ExportModalProps {
  invoiceNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

export function ExportModal({ invoiceNumber, open, onOpenChange, onExport }: ExportModalProps) {
  const [format, setFormat] = useState<ExportOptions['format']>('pdf');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [embedPdfInUbl, setEmbedPdfInUbl] = useState(false);
  const [signDocument, setSignDocument] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onExport({
        format,
        includeAttachments,
        embedPdfInUbl: format === 'ubl-xml' ? embedPdfInUbl : undefined,
        signDocument,
      });

      setTimeout(() => {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setIsExporting(false);
          onOpenChange(false);
        }, 500);
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      setIsExporting(false);
      console.error('Export failed:', error);
    }
  };

  const formatOptions = [
    {
      id: 'pdf',
      label: 'PDF',
      description: 'Human-readable PDF document',
      icon: FileText,
    },
    {
      id: 'ubl-xml',
      label: 'UBL 2.1 XML',
      description: 'EN 16931-compliant machine-readable XML',
      icon: Code,
    },
    {
      id: 'peppol-bis',
      label: 'Peppol BIS Package',
      description: 'Peppol Business Interoperability Specification',
      icon: Package,
    },
    {
      id: 'json',
      label: 'JSON',
      description: 'Structured JSON data export',
      icon: FileJson,
    },
    {
      id: 'csv',
      label: 'CSV',
      description: 'Line items as CSV spreadsheet',
      icon: FileSpreadsheet,
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Invoice</DialogTitle>
          <DialogDescription>
            Export {invoiceNumber} in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.id}
                    className="flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setFormat(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <Label htmlFor={option.id} className="cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Export Options</Label>

            {format === 'ubl-xml' && (
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <Checkbox
                  id="embedPdf"
                  checked={embedPdfInUbl}
                  onCheckedChange={(checked) => setEmbedPdfInUbl(!!checked)}
                />
                <div className="flex-1">
                  <Label htmlFor="embedPdf" className="cursor-pointer">
                    Embed PDF/A-3 in UBL
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Include human-readable PDF in XML package
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox
                id="attachments"
                checked={includeAttachments}
                onCheckedChange={(checked) => setIncludeAttachments(!!checked)}
              />
              <div className="flex-1">
                <Label htmlFor="attachments" className="cursor-pointer">
                  Include attachments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Export with any attached supporting documents
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox
                id="sign"
                checked={signDocument}
                onCheckedChange={(checked) => setSignDocument(!!checked)}
              />
              <div className="flex-1">
                <Label htmlFor="sign" className="cursor-pointer">
                  Apply digital signature
                </Label>
                <p className="text-sm text-muted-foreground">
                  Sign document with your digital certificate
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
