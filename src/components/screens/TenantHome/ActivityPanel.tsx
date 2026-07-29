import { useLanguage } from '../../../contexts/LanguageContext';
import { AuditLogEntry } from '../../../types/invoice';

const INK       = '#1e3a5f';
const INK_SOFT  = '#3d5a80';
const PAPER     = '#ffffff';
const ACCENT    = '#f08a3c';
const GOLD      = '#1e6f96'; // >=4.5:1 on white (was #2a8fbd, ~3.64:1 — fails WCAG normal-text threshold)
const RULE_SOFT = 'rgba(30,58,95,0.10)';
const RULE_FAINT = 'rgba(30,58,95,0.065)';

const AVATAR_PALETTE = [ACCENT, GOLD, INK, '#7c3aed', '#059669'];

const ACTION_LABELS: Record<AuditLogEntry['action'], string> = {
  created: 'created', updated: 'updated', validated: 'validated',
  exported: 'exported', sent: 'sent', signed: 'signed', deleted: 'deleted',
};

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return 'Now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'Yesterday';
  return `${Math.floor(diff / 86400)}d`;
}

function avatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

interface ActivityPanelProps {
  entries: AuditLogEntry[];
  onSeeAll: () => void;
}

export function ActivityPanel({ entries, onSeeAll }: ActivityPanelProps) {
  const { t } = useLanguage();
  const recent = entries.slice(0, 5);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: INK }}>
          {t('home.activity.title') || 'Activity in your team'}
        </h3>
        <button onClick={onSeeAll} style={{ background: 'transparent', border: 0, fontSize: 12, color: GOLD, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}>
          {t('home.activity.seeAll') || 'See all →'}
        </button>
      </div>

      <div style={{ background: PAPER, border: `1px solid ${RULE_SOFT}`, borderRadius: 8, overflow: 'hidden' }}>
        {recent.length === 0 ? (
          <div style={{ padding: '20px 14px', fontSize: 12, color: INK_SOFT, textAlign: 'center' }}>
            {t('home.activity.empty') || 'No recent activity yet.'}
          </div>
        ) : recent.map((entry, i) => (
          <div key={entry.id} style={{
            padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: i < recent.length - 1 ? `1px solid ${RULE_FAINT}` : undefined,
          }}>
            <div aria-hidden="true" style={{
              width: 22, height: 22, borderRadius: '50%',
              background: avatarBg(entry.user || ''),
              display: 'grid', placeItems: 'center',
              fontSize: 10, fontWeight: 500, color: '#fff', flexShrink: 0,
            }}>
              {(entry.user || '?').substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, fontSize: 12, color: INK_SOFT }}>
              <strong style={{ color: INK, fontWeight: 500 }}>{entry.user}</strong>
              {' '}{ACTION_LABELS[entry.action] || entry.action}{' '}
              <strong style={{ color: INK, fontWeight: 500 }}>{entry.invoiceNumber}</strong>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(61,90,128,0.9)', flexShrink: 0 }}>
              {relativeTime(entry.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
