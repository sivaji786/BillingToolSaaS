import { useLanguage } from '../../../contexts/LanguageContext';

const INK       = '#1e3a5f';
const INK_SOFT  = '#3d5a80';
const PAPER     = '#ffffff';
const ACCENT    = '#f08a3c';
const GOLD      = '#2a8fbd';
const RULE_SOFT = 'rgba(30,58,95,0.10)';

interface TicketSummaryPanelProps {
  onNewTicket: () => void;
}

export function TicketSummaryPanel({ onNewTicket }: TicketSummaryPanelProps) {
  const { t } = useLanguage();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK }}>
          {t('home.tickets.title') || 'Your tickets'}
        </h3>
        <button onClick={onNewTicket} style={{ background: 'transparent', border: 0, fontSize: 12, color: GOLD, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}>
          {t('home.tickets.new') || '+ New ticket'}
        </button>
      </div>

      <div style={{ background: PAPER, border: `1px solid ${RULE_SOFT}`, borderRadius: 8, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '4px 10px', background: 'rgba(74,222,128,0.12)', borderRadius: 4, width: 'fit-content' }}>
          <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 11, color: INK_SOFT }}>
            {t('home.tickets.allGood') || 'All systems operational'}
          </span>
        </div>

        <p style={{ fontSize: 11, color: INK_SOFT, lineHeight: 1.5, margin: 0 }}>
          {t('home.tickets.cta') || 'Need help? Open a support ticket and our team will respond within one business day.'}
        </p>

        <button onClick={onNewTicket}
          style={{ marginTop: 12, fontSize: 12, color: ACCENT, fontWeight: 500, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, display: 'block' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}>
          {t('home.tickets.open') || 'Open a ticket →'}
        </button>
      </div>
    </div>
  );
}
