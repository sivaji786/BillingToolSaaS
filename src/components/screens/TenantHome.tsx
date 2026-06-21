import { useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { Invoice, AuditLogEntry } from '../../types/invoice';
import { WelcomeBanner } from './TenantHome/WelcomeBanner';
import { LaunchTiles } from './TenantHome/LaunchTiles';
import { RecentDocsRow } from './TenantHome/RecentDocsRow';
import { ActivityPanel } from './TenantHome/ActivityPanel';
import { TicketSummaryPanel } from './TenantHome/TicketSummaryPanel';
import { SidebarTrigger } from '../ui/sidebar';
import { Plus, Bell, Activity } from 'lucide-react';

interface TenantHomeProps {
  invoices: Invoice[];
  logEntries: AuditLogEntry[];
  onNewInvoice: () => void;
  onNavigate: (screen: string) => void;
  onNewLetter: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onOpenTicket: () => void;
  onTour: () => void;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name?.split(' ')[0] || name || '';
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

export function TenantHome({
  invoices,
  logEntries,
  onNewInvoice,
  onNavigate,
  onNewLetter,
  onOpenInvoice,
  onOpenTicket,
  onTour,
}: TenantHomeProps) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const { t } = useLanguage();

  const greeting = useMemo(
    () => getGreeting(user?.name || ''),
    [user?.name]
  );

  const [greetingPrefix, greetingName] = greeting.split(', ');

  const sortedEntries = useMemo(
    () => [...logEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [logEntries]
  );

  return (
    <div style={{
      background: '#dbe8f7',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      WebkitFontSmoothing: 'antialiased',
      color: '#1e3a5f',
    }}>

      {/* ── Sticky header bar ──────────────────────────────────────── */}
      <header style={{
        background: '#ffffff',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderBottom: '1px solid rgba(30,58,95,0.10)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Mobile sidebar trigger */}
        <SidebarTrigger className="text-[#3d5a80] hover:text-[#1e3a5f] hover:bg-[#f0f6ff] -ml-1 md:hidden" />

        {/* Greeting */}
        <div style={{ fontSize: 13, color: '#3d5a80' }}>
          {greetingPrefix},{' '}
          <span style={{ color: '#1e3a5f', fontWeight: 500 }}>{greetingName}</span>
        </div>

        {/* Tenant name chip */}
        {tenant?.company_name && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, color: '#3d5a80', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 20, height: 20,
                background: '#f08a3c',
                borderRadius: 4,
                display: 'inline-grid', placeItems: 'center',
                fontSize: 10, fontWeight: 500, color: '#fff',
                flexShrink: 0,
              }}>
                {tenant.company_name.charAt(0).toUpperCase()}
              </span>
              {tenant.company_name}
            </div>
            <div style={{ width: 1, height: 20, background: 'rgba(30,58,95,0.12)' }} />
            {/* Activity */}
            <button
              onClick={() => onNavigate('activity')}
              aria-label="Activity feed"
              style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#3d5a80', padding: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1e3a5f')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#3d5a80')}
            >
              <Activity size={18} />
            </button>
            {/* Notifications */}
            <button
              onClick={onOpenTicket}
              aria-label="Support tickets"
              style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#3d5a80', padding: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1e3a5f')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#3d5a80')}
            >
              <Bell size={18} />
            </button>
            {/* + New */}
            <button
              onClick={onNewInvoice}
              aria-label="Create new document"
              style={{
                background: '#f08a3c', color: '#fff', border: 0,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ff9d52')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f08a3c')}
            >
              <Plus size={13} />
              {t('common.new') || 'New'}
            </button>
          </div>
        )}
      </header>

      {/* ── Scrollable body ─────────────────────────────────────────── */}
      <div
        className="ht-body"
        style={{ padding: '28px 24px', maxWidth: 1400, width: '100%', margin: '0 auto' }}
      >
        {/* Welcome banner */}
        <WelcomeBanner onTourClick={onTour} />

        {/* Section heading */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#1e3a5f' }}>
            {t('home.section.today') || 'What would you like to do today?'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#3d5a80' }}>
            {t('home.section.todaySub') || 'Create something new — or jump into what you already have.'}
          </p>
        </div>

        {/* Launch tiles */}
        <LaunchTiles
          onNewInvoice={onNewInvoice}
          onMyInvoices={() => onNavigate('invoices')}
          onNewLetter={onNewLetter}
          onMyLetters={() => onNavigate('letters')}
          onNewTemplate={() => onNavigate('templates')}
          onMyTemplates={() => onNavigate('templates')}
          onWorkspace={() => onNavigate('workspace')}
          onMyDocuments={() => onNavigate('workspace')}
        />

        {/* Recent docs */}
        <RecentDocsRow
          invoices={invoices}
          onOpenInvoice={onOpenInvoice}
          onNavigateLetters={() => onNavigate('invoices')}
        />

        {/* Activity + tickets */}
        <section
          className="ht-bottom-row"
          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}
        >
          <ActivityPanel entries={sortedEntries} onSeeAll={() => onNavigate('activity')} />
          <TicketSummaryPanel onNewTicket={onOpenTicket} />
        </section>
      </div>

      <style>{`
        @media (max-width: 1200px) { .ht-tiles { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 900px) {
          .ht-tiles { grid-template-columns: repeat(2, 1fr) !important; }
          .ht-continue-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ht-bottom-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .ht-tiles { grid-template-columns: 1fr !important; }
          .ht-continue-grid { grid-template-columns: 1fr !important; }
          .ht-body { padding: 16px 14px !important; }
        }
      `}</style>
    </div>
  );
}
