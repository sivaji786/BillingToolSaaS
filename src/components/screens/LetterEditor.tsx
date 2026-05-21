import { useState, useEffect, useCallback } from 'react';
import { Invoice, CompanyProfile, Buyer } from '../../types/invoice';
import { buyerService } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { RichTextEditor } from '../ui/RichTextEditor';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { ArrowLeft, Save, Eye, Loader2, Mail, User, Building } from 'lucide-react';
import { PartyCard } from '../invoice/PartyCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';

interface LetterEditorProps {
  letter: Invoice;
  onSave: (letter: Invoice) => void;
  onBack: () => void;
  onPreview: (letter: Invoice) => void;
  profile?: CompanyProfile | null;
}

export function LetterEditor({ letter: initialLetter, onSave, onBack, onPreview, profile }: LetterEditorProps) {
  const { t } = useLanguage();
  const [letter, setLetter] = useState<Invoice>(initialLetter);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(
    () => String(initialLetter.id ?? '').startsWith('new_')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  useEffect(() => {
    buyerService.getAll().then(setBuyers).catch(console.error);
  }, []);

  // Sync incoming prop changes (e.g. AI assistant updates)
  useEffect(() => {
    if (!initialLetter) return;
    const isDifferent = !letter.id || initialLetter.id !== letter.id;
    if (isDifferent) {
      setLetter(initialLetter);
      setHasUnsavedChanges(String(initialLetter.id ?? '').startsWith('new_'));
    } else if (JSON.stringify(initialLetter) !== JSON.stringify(letter)) {
      setLetter(initialLetter);
      setHasUnsavedChanges(true);
    }
  }, [initialLetter]);

  const update = useCallback((updates: Partial<Invoice>) => {
    setLetter(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Auto-add buyer to directory if new
      if (letter.buyer?.name && letter.buyer.name.trim().length >= 3) {
        const exists = buyers.find(b => b.name.toLowerCase() === letter.buyer.name.toLowerCase());
        if (!exists) {
          try {
            await buyerService.create({
              name: letter.buyer.name,
              address: letter.buyer.address,
              contact: { email: letter.buyer.contactEmail, phone: letter.buyer.contactPhone },
            });
            const updated = await buyerService.getAll();
            setBuyers(updated);
          } catch { /* non-critical */ }
        }
      }
      const toSave = { ...letter, templateType: 'business_letter' as const, updatedAt: new Date().toISOString() };
      await onSave(toSave);
      setHasUnsavedChanges(false);
      toast.success(t('editor.letterSaved') || 'Letter saved successfully');
    } catch {
      // handled by onSave
    } finally {
      setIsSaving(false);
    }
  }, [letter, onSave, buyers, t]);

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('editor.back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-heading-2 font-semibold">{t('editor.letterEditor') || 'Letter Editor'}</h1>
            <p className="text-body text-muted-foreground mt-0.5">
              {letter.invoiceNumber || (t('editor.newLetter') || 'New Letter')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={letter.status || 'draft'}
            onValueChange={(value: any) => {
              update({ status: value });
              toast.success(t('editor.statusUpdated') || 'Status updated');
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="sent">{t('status.sent')}</SelectItem>
              <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
          {hasUnsavedChanges && (
            <Badge variant="secondary">{t('editor.unsavedChanges') || 'Unsaved changes'}</Badge>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!hasUnsavedChanges || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t('editor.saveLetter') || 'Save Letter'}
            </Button>
            {!hasUnsavedChanges && !String(letter.id ?? '').includes('_') && (
              <span className="text-micro text-muted-foreground italic self-center px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded border">
                {t('editor.allChangesSaved') || 'All changes saved'}
              </span>
            )}
            <Button variant="outline" onClick={() => onPreview(letter)}>
              <Eye className="h-4 w-4 mr-2" />
              {t('editor.preview')}
            </Button>
          </div>
          <span className="text-micro text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded text-micro">Ctrl+S</kbd> {t('common.save')}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Letter Details */}
          <Card className="p-6 space-y-4">
            <h2 className="text-heading-2 font-semibold">{t('editor.letterDetails') || 'Letter Details'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="letterNumber">{t('editor.letterNumber') || 'Letter Number'}</Label>
                <Input
                  id="letterNumber"
                  value={letter.invoiceNumber || ''}
                  onChange={e => update({ invoiceNumber: e.target.value })}
                  placeholder="LTR-2026-001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="issueDate">{t('editor.letterDate') || 'Date'} *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={letter.issueDate || ''}
                  onChange={e => update({ issueDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="subject">{t('editor.letterSubject') || 'Subject'}</Label>
                <Input
                  id="subject"
                  value={letter.note || ''}
                  onChange={e => update({ note: e.target.value })}
                  placeholder={t('editor.letterSubjectPlaceholder') || 'e.g., Project Update, Meeting Follow-up'}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Letter Body */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-purple-600" />
              <h2 className="text-heading-2 font-semibold m-0">{t('editor.letterBody') || 'Letter Body'}</h2>
            </div>

            <div>
              <Label htmlFor="salutation">{t('editor.letterSalutation') || 'Salutation'}</Label>
              <Input
                id="salutation"
                value={letter.salutation || ''}
                onChange={e => update({ salutation: e.target.value })}
                placeholder={t('editor.letterSalutationPlaceholder') || 'e.g., Dear Sir/Madam,'}
                className="mt-1"
              />
            </div>

            <div>
              <Label>{t('common.content') || 'Content'}</Label>
              <div className="rounded-md border border-input bg-background min-h-[320px] mt-1">
                <RichTextEditor
                  value={letter.body || ''}
                  onChange={val => update({ body: val })}
                  placeholder={t('templates.letterBodyPlaceholder') || 'Type your letter content here...'}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="closing">{t('editor.letterClosing') || 'Closing'}</Label>
              <Input
                id="closing"
                value={letter.closing || ''}
                onChange={e => update({ closing: e.target.value })}
                placeholder={t('editor.letterClosingPlaceholder') || 'e.g., Yours sincerely,'}
                className="mt-1"
              />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sender */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-4 w-4 text-purple-600" />
              <h3 className="font-medium text-body">{t('editor.seller') || 'Sender'}</h3>
            </div>
            <PartyCard
              party={letter.seller}
              title={t('editor.seller') || 'Sender'}
              onUpdate={party => update({ seller: party })}
              ublPath=""
              defaultParty={profile ? {
                name: profile.name,
                vatId: profile.vatId,
                address: profile.address,
                contactEmail: profile.email,
                contactPhone: profile.phone,
              } : undefined}
            />
          </Card>

          {/* Recipient */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-purple-600" />
              <h3 className="font-medium text-body">{t('editor.recipient') || 'Recipient (To)'}</h3>
            </div>
            <PartyCard
              party={letter.buyer}
              title={t('editor.recipient') || 'Recipient'}
              onUpdate={party => update({ buyer: party })}
              ublPath=""
              suggestions={buyers}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
