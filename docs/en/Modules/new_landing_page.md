# Tenant Portal — Post-Login Landing Page Redesign

> **Reference design:** `landing_page/humpl-landing-page.html` (Humpl mockup v4)  
> **Scope:** Tenant portal only (not the public marketing `LandingPage.tsx`)  
> **Target screen:** The screen a user lands on after successful login — currently `Dashboard.tsx`

---

## 1. Design Analysis: Humpl Reference

The Humpl mockup is a *workspace entry hall* — not a dashboard with charts, not a marketing page. Its three-question hierarchy guides every design decision:

| Question | Visual answer |
|---|---|
| What can I do right now? | 5 launch tiles (center stage) |
| What was I doing last time? | "Continue where you left off" row |
| Where is everything else? | Left vertical sidebar |

### 1.1 Layout Shell

```
┌─────────────────────────────────────────────────────────┐
│ SIDEBAR (200px, sticky, navy #1e3a5f)                   │
│  • Brand / logo                                         │
│  • Workspace switcher (tenant name)                     │
│  • Primary nav (Home, Documents, Letters, Billing …)    │
│  • Divider                                              │
│  • Secondary nav (Support, Settings, Help)              │
│  • User identity + online dot                           │
├─────────────────────────────────────────────────────────┤
│ MAIN CANVAS (flex col, pale blue bg)                    │
│  HEADER BAR (sticky, white, 1px border bottom)          │
│   greeting | search (⌘K) | 🎫 🔔 ~ | + New            │
│  ─────────────────────────────────────────────────────  │
│  BODY (max-width 1400px, 28px/24px padding)             │
│   Welcome banner  (dismissible, 3 pillars + CTA)        │
│   Section heading "What would you like to do today?"    │
│   Launch Tiles ×5 (invoice, letter, template, …)        │
│   Continue row ×4  (recent docs)                        │
│   Bottom row: Activity feed (2/3) | Tickets (1/3)       │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Brand Token System

The Humpl design is built entirely on CSS custom properties. This is the correct architecture to adopt — all colors must come from the skin engine, never be hardcoded in components.

| Token | Value | Usage |
|---|---|---|
| `--ink` | `#1e3a5f` | Primary text, sidebar background |
| `--ink-soft` | `#3d5a80` | Secondary text, meta info |
| `--paper` | `#ffffff` | Cards, header bar |
| `--paper-soft` | `#f0f6ff` | Search inputs, tile previews |
| `--paper-warm` | `#dbe8f7` | Page canvas background |
| `--accent` | `#f08a3c` | Primary CTA buttons, badges, active nav highlight |
| `--accent-soft` | `#ff9d52` | Hover state on accent |
| `--accent-tint` | `#fff5ec` | Custom tile background wash |
| `--gold` | `#2a8fbd` | Secondary CTAs, links, outline buttons |
| `--rule` | `#1e3a5f33` | Card borders |
| `--rule-soft` | `#1e3a5f1a` | Hairline dividers |
| `--radius-sm/md/lg` | `4/8/12px` | Consistent border radii |
| `--shadow-card` | `0 1px 2px rgba(30,58,95,0.04)` | Flat card lift |

### 1.3 Typography Contract

- **Font:** `system-ui / -apple-system / Segoe UI / Roboto` — no web font load required
- **Sizes:** 10px hint → 11px body-small → 12px body → 13px tile-title → 14px nav → 17–18px headings
- **Weights:** 400 (regular) and 500 (medium) only — **never 700** (too heavy on cards)
- **Smoothing:** `-webkit-font-smoothing: antialiased`

### 1.4 Interaction Patterns

- Cards: `transform: translateY(-2px)` on hover, border color darkens
- Buttons: `transform: translateY(1px)` on `:active` (tactile press feel)
- All transitions: `0.15s` — fast, not flashy
- Sidebar active item: `3px solid var(--accent)` left border + full-row highlight
- Search: `border-color: var(--gold)` on `:focus-within`

---

## 2. Current State vs. Target State

| Area | Current (`Dashboard.tsx`) | Target (Humpl pattern) |
|---|---|---|
| Post-login screen | Chart-heavy billing dashboard | Workspace entry hall with action tiles |
| Sidebar | None for tenant portal | Persistent left nav, collapsible on mobile |
| Navigation | Top tab bar / screen switch in `App.tsx` | Sidebar with item-level active state |
| Quick actions | New Invoice button only | 5 module tiles (invoice, letter, template, workspace, custom) |
| Recents | None | "Continue where you left off" row (4 cards from API) |
| Activity | None | Team activity feed (shared tenant workspace) |
| Tickets | Widget popup only | Inline tickets panel on landing + widget for all other screens |
| Color system | Tailwind utility classes (hardcoded) | CSS design token skin variables |
| Welcome/onboarding | None | Dismissible welcome banner with product pillars and tour CTA |

---

## 3. Re-Design Requirements

### 3.1 App Shell Restructure

**Requirement:** Introduce a persistent app shell that wraps all authenticated tenant screens.

The current `App.tsx` renders screens by name-switch with no shared layout. We need a `TenantLayout` wrapper:

```
TenantLayout
 ├── TenantSidebar      (new component, mirrors AdminSidebar pattern)
 └── MainCanvas
      ├── TenantHeader  (new component)
      └── <Outlet />    (current screen content)
```

- `TenantLayout` replaces direct screen rendering for all authenticated non-admin screens
- Sidebar width: **200px** desktop, **64px** icon-only collapsed, **hidden + drawer** mobile
- The layout must be `position: sticky` and `100vh` so content scrolls independently

### 3.2 Sidebar Navigation

**Requirement:** New `TenantSidebar.tsx` component with:

```
Brand block
  [Logo] [App Name]
  [Tenant name label]

Workspace switcher (future: multi-tenant)
  [Avatar] [Tenant name] [▾]

Primary nav group
  ⌂  Home (landing page)
  ₪  Billing (invoices, quotes)
  ✉  Letters
  ▣  Templates
  ☑  Worksheets
  ▤  Documents / Workspace
  ⚇  Buyers

[divider]

Secondary nav group (muted opacity)
  ◉  Support tickets
  ⚙  Settings
  ◐  Appearance
  ?  Help

User bar (bottom, pinned)
  [Avatar + online dot] [Name] [Role]
```

Rules:
- Active item: `border-left: 3px solid var(--accent)`, full-row background highlight
- Hover: subtle background `rgba(255,255,255,0.06)`
- Icons: use Lucide (already in project) — replace Unicode glyphs from mockup
- Collapse state stored in `tenantStore` (mirror `adminStore.sidebarCollapsed` pattern)
- Mobile: drawer slide-in triggered by hamburger in header

### 3.3 Header Bar

**Requirement:** New `TenantHeader.tsx` component:

```
[Good morning, {name}]  [Search…  ⌘K]  [🎫][🔔 3][~]  [+ New ▾]
```

- Greeting uses `user.firstName` from auth context + time-of-day logic (morning/afternoon/evening)
- Search: global search across invoices, letters, buyers — triggers existing `Workspace` AI search or new command palette
- `🎫` icon: opens ticketing widget (already exists)
- `🔔` bell: notification badge with unread count from API
- Activity `~` icon: links to `ActivityLog` screen
- `+ New` button: dropdown with quick-create options (new invoice, new letter, new template)
- Sticky `top: 0; z-index: 10` with 1px bottom border

### 3.4 Post-Login Landing (`TenantHome.tsx`)

This is the **new screen** that replaces `Dashboard.tsx` as the first screen after login.

#### 3.4.1 Welcome Banner

- Shown on first visit and after password reset; state tracked in `localStorage` (`tenant_tour_dismissed`)
- Dismissible with Esc key or "Skip" link
- Three pillars communicate the product value: Billing platform / Team workspace / Support included
- CTA: "Take the 2-min tour →" — links to `QuickAccessTour.tsx` (already exists)
- After dismissal: collapses to a single hint line "Tour available anytime in Help"

#### 3.4.2 Launch Tiles

Five tiles in a single row on desktop (5-col grid), 3-col on tablet, 1-col on mobile:

| # | Tile | Primary CTA | Secondary CTA | Route |
|---|---|---|---|---|
| 1 | Billing / Invoice | `+ New invoice` | `My invoices` | `/billing/new` / `/billing` |
| 2 | Business Letter | `+ New letter` | `My letters` | `/letters/new` / `/letters` |
| 3 | Template Editor | `+ New template` | `My templates` | `/templates/new` / `/templates` |
| 4 | Documents / Workspace | `+ Upload` | `My files` | `/workspace/new` / `/workspace` |
| 5 | Custom / Blank | `+ Start blank` | `My documents` | `/documents/new` / `/documents` |

Each tile:
- Mini document preview (visual preview, not just an icon — see mockup pattern)
- Title (14px, weight 500)
- One-line description (11px, `ink-soft`)
- Primary button: filled accent orange
- Secondary button: `gold` outline, fills on hover
- Tile 5 visually distinct: dashed accent border + `accent-tint` background

#### 3.4.3 Continue Where You Left Off

- 4-column grid of recent document cards
- Data from a new API endpoint: `GET /api/tenant/recent-docs?limit=4`
- Each card: doc type icon (colored), document name, relative timestamp (`2 hours ago`)
- "See all documents →" link to `Workspace` screen
- Empty state: "Nothing yet — create your first document above"

#### 3.4.4 Activity Feed

- Rendered in a white card, 2/3 of bottom row width
- Data from `ActivityLog` (already exists) — slice to last 5 team events
- Each row: avatar initials (colored), action text (`[Name] edited [Doc]`), relative time
- "See all →" link to `ActivityLog` screen

#### 3.4.5 Tickets Panel

- 1/3 of bottom row, white card
- Shows the most recent open ticket (number, status dot, first line of body)
- "+ New" header link → opens ticketing widget
- "Open ticket →" link → navigates to ticket detail (if full tickets screen is implemented)

---

## 4. Stylesheet Requirements

### 4.1 Design Token Integration

Create `src/styles/tenant-tokens.css`:

```css
:root {
  /* Humpl skin — must match skin engine "humpl" preset */
  --ink:          #1e3a5f;
  --ink-soft:     #3d5a80;
  --paper:        #ffffff;
  --paper-soft:   #f0f6ff;
  --paper-warm:   #dbe8f7;
  --accent:       #f08a3c;
  --accent-soft:  #ff9d52;
  --accent-tint:  #fff5ec;
  --gold:         #2a8fbd;
  --rule:         #1e3a5f33;
  --rule-soft:    #1e3a5f1a;
  --rule-faint:   #1e3a5f11;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --shadow-card: 0 1px 2px rgba(30, 58, 95, 0.04);
  --shadow-card-hover: 0 4px 12px rgba(30, 58, 95, 0.08);

  --sidebar-width: 200px;
  --sidebar-width-collapsed: 64px;
}
```

These tokens are consumed in Tailwind via CSS variable references. Existing Tailwind classes remain unaffected — the token file is additive.

### 4.2 Tailwind Config Extension

Extend `tailwind.config.js` to map skin tokens:

```js
// tailwind.config.js — extend theme.colors
colors: {
  ink:        'var(--ink)',
  'ink-soft': 'var(--ink-soft)',
  paper:      'var(--paper)',
  'paper-soft':'var(--paper-soft)',
  'paper-warm':'var(--paper-warm)',
  accent:     'var(--accent)',
  'accent-soft':'var(--accent-soft)',
  'accent-tint':'var(--accent-tint)',
  gold:       'var(--gold)',
}
```

This allows using `bg-paper-warm`, `text-ink-soft`, `border-rule` etc. in Tailwind utility classes while still reading from the CSS variable skin system.

### 4.3 Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `>= 1200px` | 5-tile grid, 200px sidebar |
| `900–1199px` | 3-tile grid, 200px sidebar |
| `720–899px` | 2-tile grid, collapsed sidebar icon-only |
| `< 720px` | 1-tile stack, sidebar hidden (hamburger drawer) |

Breakpoint names map to existing Tailwind: `xl`, `lg`, `md`, `sm`.

### 4.4 Typography Classes

Create utility classes to enforce the typography contract:

```css
.text-hint    { font-size: 10px; }
.text-body-sm { font-size: 11px; }
.text-body    { font-size: 12px; }
.text-label   { font-size: 13px; }
.text-nav     { font-size: 14px; }
.text-heading { font-size: 18px; }
/* All at font-weight: 400 or 500 — never 700 for card content */
```

### 4.5 Shared Card Style

All cards across the landing page share:

```css
.card-base {
  background: var(--paper);
  border: 1px solid var(--rule-soft);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.card-base:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--rule);
}
```

---

## 5. Component Restructure

### 5.1 New Components to Create

| Component | Path | Description |
|---|---|---|
| `TenantLayout` | `src/components/layout/TenantLayout.tsx` | App shell — sidebar + header + outlet |
| `TenantSidebar` | `src/components/layout/TenantSidebar.tsx` | Left nav, collapsible, with user bar |
| `TenantHeader` | `src/components/layout/TenantHeader.tsx` | Sticky top bar with greeting/search/actions |
| `TenantHome` | `src/components/screens/TenantHome.tsx` | Post-login landing (new entry screen) |
| `WelcomeBanner` | `src/components/screens/TenantHome/WelcomeBanner.tsx` | Dismissible onboarding banner |
| `LaunchTiles` | `src/components/screens/TenantHome/LaunchTiles.tsx` | 5-tile quick-launch grid |
| `LaunchTile` | `src/components/screens/TenantHome/LaunchTile.tsx` | Individual tile (preview + buttons) |
| `RecentDocsRow` | `src/components/screens/TenantHome/RecentDocsRow.tsx` | "Continue where you left off" row |
| `ActivityPanel` | `src/components/screens/TenantHome/ActivityPanel.tsx` | Team activity feed card |
| `TicketSummaryPanel` | `src/components/screens/TenantHome/TicketSummaryPanel.tsx` | Open ticket quick-view card |
| `DocPreviewMini` | `src/components/ui/DocPreviewMini.tsx` | Reusable tiny doc preview for tiles |
| `UserPresenceDot` | `src/components/ui/UserPresenceDot.tsx` | Green online indicator dot |

### 5.2 Components to Modify

| Component | Change Required |
|---|---|
| `App.tsx` | Wrap authenticated screens in `TenantLayout`; change default post-login screen from `dashboard` to `home` |
| `Dashboard.tsx` | Rename to `BillingDashboard.tsx`; keep charts; accessible from nav item, not as landing |
| `AdminSidebar.tsx` | Extract shared sidebar primitives (`SidebarItem`, `SidebarSection`) into `src/components/layout/SidebarPrimitives.tsx` for reuse |
| `TicketingWidget.tsx` | Expose a `compact` prop so the landing page ticket panel can render inline without the floating button |

### 5.3 Store Changes

Add a `tenantStore.ts` (Zustand, mirroring `adminStore.ts`) to track:

```ts
interface TenantState {
  sidebarCollapsed: boolean;
  tourDismissed: boolean;
  recentDocs: RecentDoc[];
  unreadNotifications: number;
  toggleSidebar: () => void;
  dismissTour: () => void;
  setRecentDocs: (docs: RecentDoc[]) => void;
  setUnreadNotifications: (count: number) => void;
}
```

`tourDismissed` is persisted to `localStorage` via Zustand `persist` middleware (already used in the project).

### 5.4 API Requirements

New or extended endpoints needed:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tenant/recent-docs` | GET | Returns last 4 documents across all types (invoices, letters, templates) with `type`, `name`, `updated_at` |
| `/api/tenant/activity` | GET | Returns last 5 team activity events with `user`, `action`, `target`, `timestamp` |
| `/api/tickets?status=open&limit=1` | GET | Already exists — returns open ticket for panel |
| `/api/notifications/unread-count` | GET | Returns integer for header bell badge |

---

## 6. Accessibility Requirements

These must be implemented at build time — not added later:

- All sidebar items use `<a>` tags (keyboard nav, not `<div onClick>`)
- All icon-only buttons have `aria-label`
- Search input has `aria-label="Search"`
- Welcome banner dismissible with `Escape` key (attach `onKeyDown` to document)
- Focus rings must remain visible — do not override `:focus-visible` in CSS resets
- Color contrast: `--ink` on `--paper-warm` passes WCAG AA
- `--accent` (#f08a3c) on white — use only on filled buttons or accent borders, **never as body text**
- `role="navigation"` on sidebar `<aside>`
- `role="banner"` on header `<header>`
- Launch tile articles use `<article>` semantic element

---

## 7. i18n Requirements

All user-facing strings must use the existing i18n cascade — no hardcoded strings:

| Key | English | Note |
|---|---|---|
| `home.greeting.morning` | `Good morning, {name}` | Time-gated |
| `home.greeting.afternoon` | `Good afternoon, {name}` | |
| `home.greeting.evening` | `Good evening, {name}` | |
| `home.section.today` | `What would you like to do today?` | |
| `home.section.today.sub` | `Create something new — or jump into what you already have.` | |
| `home.continue.title` | `Continue where you left off` | |
| `home.continue.seeAll` | `See all documents →` | |
| `home.activity.title` | `Activity in your team` | |
| `home.tickets.title` | `Your tickets` | |
| `home.welcome.title` | `Welcome to {appName} — what makes us different` | |
| `home.welcome.tour` | `Take the 2-min tour →` | |
| `home.welcome.skip` | `Skip and explore` | |
| `tile.billing.title` | `Billing` | |
| `tile.billing.desc` | `Invoices, quotes, and reminders.` | |
| `tile.billing.new` | `+ New invoice` | |
| `tile.billing.mine` | `My billing` | |
| *(repeat pattern for letter, template, workspace, custom)* | | |

**German note:** German strings run ~30% longer than English. Do not pixel-pin labels — use `min-width` and `white-space: nowrap` only on chrome items (badge counts), not tile buttons.

---

## 8. Proposed Backlogs

### Epic 1 — App Shell & Navigation (prerequisite for all below)

| ID | Story | Priority | Estimate |
|---|---|---|---|
| SHELL-01 | Create `TenantLayout` wrapper with sidebar + header slot | P0 | M |
| SHELL-02 | Create `TenantSidebar` with primary/secondary nav groups, active state, and user bar | P0 | M |
| SHELL-03 | Create `TenantHeader` with greeting, search input, notification badge, +New button | P0 | S |
| SHELL-04 | Implement sidebar collapse/expand with `tenantStore` persistence | P1 | S |
| SHELL-05 | Mobile drawer: hamburger trigger, slide-in overlay, close on backdrop click | P1 | M |
| SHELL-06 | Extract `SidebarPrimitives` shared between `TenantSidebar` and `AdminSidebar` | P2 | S |

### Epic 2 — Post-Login Landing Page (`TenantHome`)

| ID | Story | Priority | Estimate |
|---|---|---|---|
| HOME-01 | Scaffold `TenantHome` screen and wire as default post-login route in `App.tsx` | P0 | S |
| HOME-02 | Implement `WelcomeBanner` with 3 pillars, tour CTA, and dismiss-to-hint behavior | P1 | S |
| HOME-03 | Implement `LaunchTiles` grid with 5 tiles, responsive grid (5→3→1 col) | P0 | M |
| HOME-04 | Build `DocPreviewMini` component for each tile type (invoice, letter, template, workspace, custom) | P1 | M |
| HOME-05 | Implement `RecentDocsRow` consuming `/api/tenant/recent-docs` endpoint | P1 | M |
| HOME-06 | Build `/api/tenant/recent-docs` backend endpoint (CI4) | P1 | M |
| HOME-07 | Implement `ActivityPanel` sliced from existing activity log API | P2 | S |
| HOME-08 | Implement `TicketSummaryPanel` using existing tickets API | P2 | S |

### Epic 3 — Design Token System

| ID | Story | Priority | Estimate |
|---|---|---|---|
| TOKEN-01 | Create `src/styles/tenant-tokens.css` with all Humpl skin variables | P0 | S |
| TOKEN-02 | Extend `tailwind.config.js` to expose token colors as Tailwind utilities | P0 | S |
| TOKEN-03 | Audit existing components — replace hardcoded color values with token references | P2 | L |
| TOKEN-04 | Create typography utility classes (`.text-hint` through `.text-heading`) | P1 | S |
| TOKEN-05 | Create `.card-base` shared card style and apply across landing page components | P1 | S |

### Epic 4 — Global Search & Quick-Create

| ID | Story | Priority | Estimate |
|---|---|---|---|
| SEARCH-01 | Wire header search input to existing workspace AI search or command palette | P1 | M |
| SEARCH-02 | Add `⌘K` keyboard shortcut to open/focus search | P2 | S |
| SEARCH-03 | `+New` dropdown in header: options for invoice, letter, template, blank doc | P1 | S |

### Epic 5 — Notifications

| ID | Story | Priority | Estimate |
|---|---|---|---|
| NOTIF-01 | Build `/api/notifications/unread-count` backend endpoint | P2 | S |
| NOTIF-02 | Poll (or SSE) unread count into header bell badge | P2 | S |
| NOTIF-03 | Notification panel/popover (full list of notifications) | P3 | L |

### Epic 6 — Accessibility & i18n

| ID | Story | Priority | Estimate |
|---|---|---|---|
| A11Y-01 | Audit all new components against WCAG AA — semantic HTML, aria-labels, focus rings | P1 | M |
| A11Y-02 | Implement Esc key dismiss for welcome banner | P1 | XS |
| I18N-01 | Add all `home.*` and `tile.*` i18n keys to `de`, `en`, `ar` translation files | P1 | M |

---

## 9. Migration Strategy

1. **Phase 1 (SHELL-01 to SHELL-03):** Build the layout shell in isolation. Keep `App.tsx` routing unchanged. Verify the layout renders correctly wrapping the existing `Dashboard.tsx`.

2. **Phase 2 (HOME-01, HOME-03, TOKEN-01, TOKEN-02):** Create the new `TenantHome` screen and design tokens. Switch the default authenticated route from `dashboard` to `home`. The old `Dashboard.tsx` becomes `BillingDashboard` reachable via the sidebar "Billing" nav item.

3. **Phase 3 (HOME-02, HOME-04, HOME-05, HOME-06):** Add data-driven sections — recent docs, welcome banner. These require the new backend endpoint.

4. **Phase 4 (HOME-07, HOME-08, SHELL-04, SHELL-05):** Activity panel, ticket panel, collapse/mobile behavior.

5. **Phase 5 (TOKEN-03, SEARCH, NOTIF, A11Y, I18N):** Polish, search wiring, notifications, accessibility audit, all language keys.

---

## 10. Files Impacted

| File | Change type |
|---|---|
| `src/App.tsx` | Modify — wrap authenticated screens in `TenantLayout`, change default screen |
| `src/components/screens/Dashboard.tsx` | Rename → `BillingDashboard.tsx` |
| `src/components/screens/LandingPage.tsx` | No change (public marketing page, separate concern) |
| `src/components/layout/TenantLayout.tsx` | **New** |
| `src/components/layout/TenantSidebar.tsx` | **New** |
| `src/components/layout/TenantHeader.tsx` | **New** |
| `src/components/layout/SidebarPrimitives.tsx` | **New** (extracted) |
| `src/components/screens/TenantHome.tsx` | **New** |
| `src/components/screens/TenantHome/` | **New** (sub-components) |
| `src/components/ui/DocPreviewMini.tsx` | **New** |
| `src/components/ui/UserPresenceDot.tsx` | **New** |
| `src/stores/tenantStore.ts` | **New** |
| `src/styles/tenant-tokens.css` | **New** |
| `src/index.css` | Modify — import tenant-tokens.css |
| `tailwind.config.js` | Modify — extend colors with token references |
| `src/translations/en.ts` | Modify — add `home.*` and `tile.*` keys |
| `src/translations/de.ts` | Modify — add German translations |
| `src/translations/ar.ts` | Modify — add Arabic translations |
| `api/app/Controllers/TenantController.php` | **New** or modify — `/api/tenant/recent-docs` endpoint |
| `api/app/Config/Routes.php` | Modify — register new tenant routes |
