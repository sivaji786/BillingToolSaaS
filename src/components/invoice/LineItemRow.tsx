import { useState, useEffect, memo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { InvoiceLine, unitCodes, taxCategories } from '../../types/invoice';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../utils/invoice-calculations';
import { parseLocalizedNumber } from '../../utils/number-parsing';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Label } from '../ui/label';

interface LineItemRowProps {
  line: InvoiceLine;
  currency: string;
  index: number;
  onUpdate: (id: string, updates: Partial<InvoiceLine>) => void;
  onDelete: () => void;
}

export const LineItemRow = memo(function LineItemRow({ line, currency, index, onUpdate, onDelete }: LineItemRowProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Local state for inputs to allow flexible typing
  const [qtyInput, setQtyInput] = useState((line.quantity || 0).toString());
  const [priceInput, setPriceInput] = useState((line.unitPrice || 0).toString());
  const [taxInput, setTaxInput] = useState((line.taxPercent || 0).toString());

  // Sync local state when props change
  useEffect(() => {
    setQtyInput((line.quantity || 0).toString());
    setPriceInput((line.unitPrice || 0).toString());
    setTaxInput((line.taxPercent || 0).toString());
  }, [line.quantity, line.unitPrice, line.taxPercent]);

  const handleChange = (field: keyof InvoiceLine, value: any) => {
    onUpdate(line.id, { [field]: value });
  };

  const handleBlur = (field: 'quantity' | 'unitPrice' | 'taxPercent', value: string) => {
    const numValue = parseLocalizedNumber(value);
    handleChange(field, numValue);
  };

  const lineTotal = line.lineExtensionAmount || line.quantity * line.unitPrice;
  const taxAmount = line.taxAmount || lineTotal * (line.taxPercent / 100);

  return (
    <div className="border rounded-lg bg-card">
      {/* Compact view */}
      <div className="flex items-center gap-3 p-4">
        <button
          className="cursor-grab hover:bg-muted rounded p-1"
          aria-label={t('editor.lineItem.dragToReorder')}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex-1 grid grid-cols-12 gap-3 items-center">
          <div className="col-span-4">
            <Input
              value={line.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('editor.lineItem.descriptionPlaceholder')}
              className="h-9"
              aria-label={t('editor.lineItem.descriptionAria', { index: (index + 1).toString() })}
            />
          </div>

          <div className="col-span-2">
            <Input
              type="text"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={(e) => handleBlur('quantity', e.target.value)}
              placeholder={t('editor.lineItem.qty')}
              className="h-9"
              aria-label={t('editor.lineItem.qtyAria', { index: (index + 1).toString() })}
            />
          </div>

          <div className="col-span-2">
            <Input
              type="text"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={(e) => handleBlur('unitPrice', e.target.value)}
              placeholder={t('editor.lineItem.price')}
              className="h-9"
              aria-label={t('editor.lineItem.unitPriceAria', { index: (index + 1).toString() })}
            />
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <div className="w-16">
              <Input
                type="text"
                value={taxInput}
                onChange={(e) => setTaxInput(e.target.value)}
                onBlur={(e) => handleBlur('taxPercent', e.target.value)}
                placeholder="%"
                className="h-9 px-2 text-center"
                aria-label={t('editor.lineItem.taxPercentAria', { index: (index + 1).toString() })}
              />
            </div>
            <Badge variant="outline" className="h-9 px-2 justify-center">
              {line.taxCategory}
            </Badge>
          </div>

          <div className="col-span-2 text-right">
            <p className="font-medium">{formatCurrency(lineTotal + taxAmount, currency)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(lineTotal, currency)} + {t('editor.lineItem.tax')}</p>
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? t('editor.lineItem.collapseDetails') : t('editor.lineItem.expandDetails')}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isExpanded ? t('editor.lineItem.collapseDetails') : t('editor.lineItem.expandDetails')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={t('editor.lineItem.deleteAria', { index: (index + 1).toString() })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="border-t p-4 space-y-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('editor.lineItem.lineId')}</Label>
                <Input
                  value={line.id}
                  readOnly
                  className="bg-muted font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">{t('editor.lineItem.ublId')}</p>
              </div>
            </div>

            <div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('editor.lineItem.unitCode')}</Label>
                <Select value={line.unitCode} onValueChange={(value: string) => onUpdate(line.id, { unitCode: value })}>
                  <SelectTrigger className="mt-1" aria-label={t('editor.lineItem.unitCodeAria')}>
                    <SelectValue placeholder={t('editor.lineItem.selectUnit')} />
                  </SelectTrigger>
                  <SelectContent>
                    {unitCodes.map((unit: { code: string; description: string }) => (
                      <SelectItem key={unit.code} value={unit.code}>
                        {unit.code} - {unit.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">{t('editor.lineItem.ublUnit')}</p>
              </div>
            </div>

            <div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('editor.lineItem.taxCategory')}</Label>
                <Select value={line.taxCategory} onValueChange={(value: string) => onUpdate(line.id, { taxCategory: value as any })}>
                  <SelectTrigger className="mt-1" aria-label={t('editor.lineItem.taxCategoryAria')}>
                    <SelectValue placeholder={t('editor.lineItem.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {taxCategories.map((category: { code: string; description: string }) => (
                      <SelectItem key={category.code} value={category.code}>
                        {category.code} - {category.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">{t('editor.lineItem.ublCategory')}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">{t('editor.lineItem.taxPercent')}</Label>
              <Input
                type="text"
                value={taxInput}
                onChange={(e) => setTaxInput(e.target.value)}
                onBlur={(e) => handleBlur('taxPercent', e.target.value)}
                placeholder={t('editor.lineItem.taxPercentPlaceholder')}
                className="mt-1"
                aria-label={t('editor.lineItem.taxPercentAria')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('editor.lineItem.ublTaxPercent')}
              </p>
            </div>
          </div>

          <div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('editor.lineItem.notes')}</Label>
              <Input
                value={line.note || ''}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder={t('editor.lineItem.notesPlaceholder')}
                className="mt-1"
                aria-label={t('editor.lineItem.notesAria')}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('editor.lineItem.netAmount')}:</span>
              <span>{formatCurrency(lineTotal, currency)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('editor.lineItem.taxAmount')} ({line.taxPercent}%):</span>
              <span>{formatCurrency(taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t">
              <span>{t('editor.lineItem.grossAmount')}:</span>
              <span>{formatCurrency(lineTotal + taxAmount, currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
