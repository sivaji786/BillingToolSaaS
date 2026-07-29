import { FileText, Receipt, LayoutTemplate, Folder } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Invoice } from '../../../types/invoice';

const INK      = '#1e3a5f';
const INK_SOFT = '#3d5a80';
const PAPER    = '#ffffff';
const ACCENT   = '#f08a3c';
const GOLD     = '#1e6f96'; // >=4.5:1 on white (was #2a8fbd, ~3.64:1 — fails WCAG normal-text threshold)
const RULE_SOFT = 'rgba(30,58,95,0.10)';
const RULE      = 'rgba(30,58,95,0.20)';

interface RecentDocsRowProps {
  invoices: Invoice[];
  onOpenInvoice: (invoice: Invoice) => void;
  onNavigateLetters: () => void;
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TYPE_META = {
  invoice:  { icon: Receipt,       color: ACCENT, label: 'Invoice' },
  letter:   { icon: FileText,      color: INK,    label: 'Letter' },
  template: { icon: LayoutTemplate,color: GOLD,   label: 'Template' },
  file:     { icon: Folder,        color: GOLD,   label: 'File' },
} as const;

type DocType = keyof typeof TYPE_META;

export function RecentDocsRow({ invoices, onOpenInvoice, onNavigateLetters }: RecentDocsRowProps) {
  const { t } = useLanguage();

  const recent = invoices
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)
    .map((inv) => ({
      id:        String(inv.id),
      type:      (inv.templateType === 'business_letter' ? 'letter' : 'invoice') as DocType,
      name:      inv.templateType === 'business_letter'
                   ? (inv.buyer?.name || inv.invoiceNumber || 'Letter')
                   : (inv.buyer?.name ? `${inv.buyer.name} ${inv.invoiceNumber}` : inv.invoiceNumber),
      updatedAt: inv.updatedAt,
      invoice:   inv,
    }));

  return (
    <section style={{ marginBottom: 22 }} aria-label="Recent documents">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK }}>
          {t('home.continue.title') || 'Continue where you left off'}
        </h3>
        <button onClick={onNavigateLetters} style={{ background: 'transparent', border: 0, fontSize: 12, color: GOLD, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}>
          {t('home.continue.seeAll') || 'See all →'}
        </button>
      </div>

      {recent.length === 0 ? (
        <div style={{ background: PAPER, border: `1px solid ${RULE_SOFT}`, borderRadius: 8, padding: '22px 16px', textAlign: 'center', color: INK_SOFT, fontSize: 12 }}>
          {t('home.continue.empty') || 'Nothing yet — create your first document above.'}
        </div>
      ) : (
        <div className="ht-continue-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {recent.map((doc) => {
            const meta = TYPE_META[doc.type];
            const Icon = meta.icon;
            return (
              <button key={doc.id} onClick={() => onOpenInvoice(doc.invoice)}
                style={{
                  background: PAPER, border: `1px solid ${RULE_SOFT}`, borderRadius: 8,
                  padding: 11, cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, transform 0.1s', width: '100%',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = RULE; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = RULE_SOFT; e.currentTarget.style.transform = ''; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Icon size={12} style={{ color: meta.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: INK_SOFT }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: INK, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 10, color: INK_SOFT }}>{relativeTime(doc.updatedAt)}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
