import { useLanguage } from '../../../contexts/LanguageContext';

/* ── Brand tokens (hardcoded so they never rely on CSS var loading) ── */
const INK        = '#1e3a5f';
const INK_SOFT   = '#3d5a80';
const PAPER      = '#ffffff';
const PAPER_SOFT = '#f0f6ff';
const ACCENT     = '#f08a3c';
const ACCENT_SOFT = '#ff9d52';
const ACCENT_TINT = '#fff5ec';
const GOLD       = '#1e6f96'; // >=4.5:1 on white (was #2a8fbd, ~3.64:1 — fails WCAG normal-text threshold)
const RULE_SOFT  = 'rgba(30,58,95,0.10)';
const RULE       = 'rgba(30,58,95,0.20)';
const SHADOW     = '0 1px 2px rgba(30,58,95,0.04)';
const SHADOW_HVR = '0 4px 12px rgba(30,58,95,0.09)';

interface TileConfig {
  title: string;
  desc: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  preview: React.ReactNode;
  custom?: boolean;
}

interface LaunchTilesProps {
  onNewInvoice: () => void;
  onMyInvoices: () => void;
  onNewLetter: () => void;
  onMyLetters: () => void;
  onNewTemplate: () => void;
  onMyTemplates: () => void;
  onWorkspace: () => void;
  onMyDocuments: () => void;
}

export function LaunchTiles({
  onNewInvoice, onMyInvoices,
  onNewLetter, onMyLetters,
  onNewTemplate, onMyTemplates,
  onWorkspace, onMyDocuments,
}: LaunchTilesProps) {
  const { t } = useLanguage();

  const tiles: TileConfig[] = [
    {
      title:         t('tile.billing.title')   || 'Billing',
      desc:          t('tile.billing.desc')    || 'Invoices, quotes, and reminders.',
      primaryLabel:  t('tile.billing.new')     || '+ New invoice',
      secondaryLabel:t('tile.billing.mine')    || 'My billing',
      onPrimary:     onNewInvoice,
      onSecondary:   onMyInvoices,
      preview:       <InvoicePreview />,
    },
    {
      title:         t('tile.letter.title')    || 'Business Letter',
      desc:          t('tile.letter.desc')     || 'Write professional correspondence.',
      primaryLabel:  t('tile.letter.new')      || '+ New letter',
      secondaryLabel:t('tile.letter.mine')     || 'My letters',
      onPrimary:     onNewLetter,
      onSecondary:   onMyLetters,
      preview:       <LetterPreview />,
    },
    {
      title:         t('tile.template.title')  || 'Template Editor',
      desc:          t('tile.template.desc')   || 'Reusable templates for any doc type.',
      primaryLabel:  t('tile.template.new')    || '+ New template',
      secondaryLabel:t('tile.template.mine')   || 'My templates',
      onPrimary:     onNewTemplate,
      onSecondary:   onMyTemplates,
      preview:       <TemplatePreview />,
    },
    {
      title:         t('tile.workspace.title') || 'Documents',
      desc:          t('tile.workspace.desc')  || 'Files and shared workspace.',
      primaryLabel:  t('tile.workspace.new')   || '+ Upload files',
      secondaryLabel:t('tile.workspace.mine')  || 'My workspace',
      onPrimary:     onWorkspace,
      onSecondary:   onWorkspace,
      preview:       <WorkspacePreview />,
    },
    {
      title:         t('tile.custom.title')    || 'Your custom document',
      desc:          t('tile.custom.desc')     || "Build something the app doesn't have yet.",
      primaryLabel:  t('tile.custom.new')      || '+ Start blank',
      secondaryLabel:t('tile.custom.mine')     || 'My documents',
      onPrimary:     onMyDocuments,
      onSecondary:   onMyDocuments,
      preview:       <CustomPreview />,
      custom:        true,
    },
  ];

  return (
    <section
      aria-label="Quick start"
      className="ht-tiles"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 14,
        marginBottom: 32,
      }}
    >
      {tiles.map((tile) => <Tile key={tile.title} {...tile} />)}
    </section>
  );
}

function Tile({ title, desc, primaryLabel, secondaryLabel, onPrimary, onSecondary, preview, custom }: TileConfig) {
  return (
    <article
      style={{
        background: PAPER,
        border: custom ? `1px dashed ${ACCENT}` : `1px solid ${RULE_SOFT}`,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: SHADOW,
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = SHADOW_HVR;
        if (!custom) el.style.borderColor = RULE;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = SHADOW;
        el.style.borderColor = custom ? ACCENT : RULE_SOFT;
      }}
    >
      {/* Mini document preview */}
      <div style={{
        background: custom ? ACCENT_TINT : PAPER_SOFT,
        border: custom ? `1px dashed rgba(240,138,60,0.35)` : `1px solid ${RULE_SOFT}`,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        minHeight: 130,
        overflow: 'hidden',
      }}>
        {preview}
      </div>

      {/* Text */}
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: INK }}>{title}</h3>
      <p  style={{ margin: '0 0 14px', fontSize: 11, color: INK_SOFT, lineHeight: 1.4, flex: 1 }}>{desc}</p>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <button
          onClick={onPrimary}
          style={{
            background: ACCENT, color: '#ffffff', border: 0,
            padding: '8px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'background 0.15s', width: '100%',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT_SOFT)}
          onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
        >
          {primaryLabel}
        </button>
        <button
          onClick={onSecondary}
          style={{
            background: PAPER, color: GOLD,
            border: `1px solid ${GOLD}`,
            padding: '7px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s', width: '100%',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; e.currentTarget.style.color = GOLD; }}
        >
          {secondaryLabel}
        </button>
      </div>
    </article>
  );
}

/* ── Mini document previews ──────────────────────────────────────── */

function InvoicePreview() {
  return (
    <div style={{ fontSize: 7, color: INK_SOFT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 500, color: INK, letterSpacing: '0.5px' }}>INVOICE</span>
        <span style={{ fontSize: 8, color: INK_SOFT }}>#2026-0142</span>
      </div>
      <div style={{ fontSize: 7, lineHeight: 1.4, marginBottom: 7 }}>Client GmbH<br />14 Main Street<br />London</div>
      <div style={{ borderTop: `1px solid ${RULE_SOFT}`, paddingTop: 5 }}>
        {[['Consulting · 8h','€960'],['Design work','€480'],['VAT 19%','€272']].map(([l,v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, padding: '1px 0' }}>
            <span>{l}</span><span>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${RULE_SOFT}`, marginTop: 5, paddingTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, fontWeight: 500, color: INK }}>Total</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: ACCENT }}>€1,712</span>
      </div>
    </div>
  );
}

function LetterPreview() {
  return (
    <div style={{ fontSize: 7, color: INK_SOFT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 500, color: INK }}>Company</div>
          <div style={{ width: 20, height: 1, background: ACCENT, marginTop: 2 }} />
        </div>
        <div style={{ fontSize: 7, color: INK_SOFT, textAlign: 'right' }}>Germany<br />16 Jun 2026</div>
      </div>
      <div style={{ fontSize: 7, lineHeight: 1.4, marginBottom: 5 }}>Dr. James Smith<br />Smith &amp; Partners</div>
      <div style={{ fontSize: 8, fontWeight: 500, color: INK, marginBottom: 3 }}>Re: Partnership proposal</div>
      <div style={{ fontSize: 7, lineHeight: 1.5 }}>Dear Dr. Smith,<br />thank you for our meeting…</div>
      <div style={{ marginTop: 6, fontSize: 7 }}>Kind regards, <em style={{ color: INK }}>B. Schneider</em></div>
    </div>
  );
}

function TemplatePreview() {
  return (
    <div style={{ fontSize: 7, color: INK_SOFT }}>
      <div style={{ fontSize: 9, fontWeight: 500, color: INK, marginBottom: 7 }}>TEMPLATE · Project brief</div>
      {[
        { label: '{title}', token: true },
        { label: 'Header · logo + date' },
        { label: 'Goals · text block' },
        { label: '+ Add section', add: true },
      ].map(({ label, token, add }) => (
        <div key={label} style={{
          background: PAPER,
          border: `1px ${token ? 'solid' : 'dashed'} ${token ? GOLD : RULE_SOFT}`,
          padding: '4px 6px', borderRadius: 3, marginBottom: 4,
          fontSize: 8, color: add ? INK_SOFT : undefined,
        }}>
          {token
            ? <span style={{ fontSize: 8, color: GOLD, background: 'rgba(42,143,189,0.12)', padding: '1px 4px', borderRadius: 2 }}>{label}</span>
            : label}
        </div>
      ))}
    </div>
  );
}

function WorkspacePreview() {
  return (
    <div style={{ fontSize: 7, color: INK_SOFT }}>
      <div style={{ fontSize: 9, fontWeight: 500, color: INK, marginBottom: 8 }}>My Workspace</div>
      {['📁 Invoices 2026','📄 Q1 Report.pdf','📄 Template.docx','📁 Letters'].map((name) => (
        <div key={name} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '2px 0', fontSize: 7, color: INK_SOFT,
          borderBottom: `1px solid rgba(30,58,95,0.06)`,
        }}>{name}</div>
      ))}
    </div>
  );
}

function CustomPreview() {
  return (
    <div style={{ fontSize: 7, color: INK_SOFT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <span style={{ color: ACCENT, fontSize: 10 }}>✎</span>
        <span style={{ fontSize: 9, fontWeight: 500, color: INK }}>Your canvas</span>
      </div>
      {['+ Add text','+ Add table','+ Add image'].map((l) => (
        <div key={l} style={{
          background: PAPER, border: `1px dashed ${RULE_SOFT}`,
          padding: '4px 6px', borderRadius: 3, marginBottom: 4,
          fontSize: 8, color: INK_SOFT, textAlign: 'center',
        }}>{l}</div>
      ))}
      <div style={{ marginTop: 8, display: 'flex', gap: 4, justifyContent: 'center' }}>
        {['T','⊞','☑','▣'].map((icon) => (
          <span key={icon} style={{
            width: 16, height: 16, background: PAPER,
            border: `1px solid ${RULE_SOFT}`, borderRadius: 3,
            display: 'grid', placeItems: 'center', fontSize: 9, color: INK_SOFT,
          }}>{icon}</span>
        ))}
      </div>
    </div>
  );
}
