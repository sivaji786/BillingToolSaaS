import { useEffect } from 'react';
import { LayoutGrid, Heart, Ticket, X, ArrowRight } from 'lucide-react';
import { useTenantStore } from '../../../stores/tenantStore';
import { useLanguage } from '../../../contexts/LanguageContext';

const INK      = '#1e3a5f';
const INK_SOFT = '#3d5a80';
const PAPER    = '#ffffff';
const ACCENT   = '#f08a3c';
const GOLD     = '#2a8fbd';
const RULE_SOFT = 'rgba(30,58,95,0.10)';

interface WelcomeBannerProps {
  onTourClick: () => void;
}

export function WelcomeBanner({ onTourClick }: WelcomeBannerProps) {
  const tourDismissed = useTenantStore((s) => s.tourDismissed);
  const dismissTour   = useTenantStore((s) => s.dismissTour);
  const { t } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !tourDismissed) dismissTour();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tourDismissed, dismissTour]);

  if (tourDismissed) {
    return (
      <div style={{
        fontSize: 11, color: INK_SOFT, marginBottom: 20,
        padding: '7px 14px', background: PAPER,
        borderRadius: 8, border: `1px solid ${RULE_SOFT}`,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <Ticket size={12} style={{ color: GOLD }} />
        {t('home.welcome.hint') || 'Tour available anytime in Help.'}
      </div>
    );
  }

  return (
    <section
      aria-label="Welcome tour"
      style={{
        background: PAPER,
        border: `1px solid ${RULE_SOFT}`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 12,
        padding: '18px 22px',
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 20,
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(30,58,95,0.04)',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ color: ACCENT, fontSize: 15 }}>✦</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>
            {t('home.welcome.title') || 'Welcome — what makes us different'}
          </span>
          <button
            onClick={dismissTour}
            aria-label="Dismiss welcome banner"
            style={{ marginLeft: 'auto', background: 'transparent', border: 0, cursor: 'pointer', color: INK_SOFT, padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}
             className="ht-banner-pillars">
          <Pillar
            icon={<LayoutGrid size={18} style={{ color: GOLD }} />}
            title={t('home.welcome.pillar1.title') || 'A full document platform'}
            text={t('home.welcome.pillar1.text') || 'Letters, billing, worksheets, templates — one workspace, fully customizable.'}
          />
          <Pillar
            icon={<Heart size={18} style={{ color: GOLD }} />}
            title={t('home.welcome.pillar2.title') || 'Real humans behind the product'}
            text={t('home.welcome.pillar2.text') || 'Talk to a real person, not a chatbot. We help you set up and grow.'}
          />
          <Pillar
            icon={<Ticket size={18} style={{ color: GOLD }} />}
            title={t('home.welcome.pillar3.title') || 'Ticketing system included'}
            text={t('home.welcome.pillar3.text') || 'Open a support ticket from any document, track it to resolution.'}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 160 }}>
        <button
          onClick={onTourClick}
          style={{
            background: ACCENT, color: '#fff', border: 0,
            padding: '8px 16px', borderRadius: 8,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#ff9d52')}
          onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
        >
          {t('home.welcome.tour') || 'Take the 2-min tour'}
          <ArrowRight size={12} />
        </button>
        <button
          onClick={dismissTour}
          style={{ background: 'transparent', border: 0, fontSize: 11, color: GOLD, cursor: 'pointer', padding: 0 }}
        >
          {t('home.welcome.skip') || 'Skip and explore'}
        </button>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .ht-banner-pillars { grid-template-columns: 1fr !important; gap: 10px !important; }
        }
      `}</style>
    </section>
  );
}

function Pillar({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <div style={{ marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1e3a5f', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#3d5a80', lineHeight: 1.45 }}>{text}</div>
      </div>
    </div>
  );
}
