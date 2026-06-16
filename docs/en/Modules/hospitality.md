# Hospitality Module — Integration Roadmap & Backlog

**Status:** 🔵 PLANNING — Pre-Sprint 0  
**Last updated:** 2026-06-11  
**Owner:** Product / Engineering  
**Source bundle:** `mn-hospitality-bundle/` — prototype build 2026-06-10 (97/103 features built in HTML prototype)  
**Stack target:** BillingTool API (CodeIgniter 4) · React/TypeScript SPA · Existing RBAC/Auth/Tenant/CMS/Invoice infrastructure

---

## 1. What This Module Is

The **[mn] Hospitality Module** adds a commission-free, venue-owned digital ordering and operations layer to BillingTool. Any tenant who operates a gastronomy venue (restaurant, café, bar, hotel, sports club) can activate this module from their workspace and get:

- A **QR-code guest ordering surface** (single-file offline-capable HTML client per venue)
- A **POS / waiter interface** for staff (floor overview, quick till, kitchen routing)
- A **reservation system** (table, room, court booking with floor plan)
- A **supply contracting module** (structured supply orders with cut-off times and ad placement)
- A **social layer** (send to table, table chat, mediated contact)
- A **SCLAN operations bridge** (table light, audio, relay automation via local node)
- **Automated invoicing** via BillingTool's existing invoice engine (orders → invoices, no new billing code)

**Core principle from spec:** _"No new primitives. Everything is configuration over existing primitives."_ The module sits as a thin vertical on top of BillingTool's existing tenant/RBAC/invoice/CMS/subscription infrastructure.

---

## 2. Relationship to Existing BillingTool Modules

| Existing BillingTool Module | How Hospitality Uses It |
|-----------------------------|------------------------|
| **Tenants / Multi-tenancy** | Each venue = one tenant; Hospitality activates as a module toggle per tenant |
| **RBAC** | New roles: `venue_owner`, `waiter`, `kitchen`, `bar`, `delivery` map onto existing role primitives |
| **Invoice / PDF** | Guest session settlements generate invoices via existing `invoiceService`; receipts use existing PDF engine |
| **Subscription / Packages** | Phase 0 free tier; Phase 2 paid add-ons (CI skin, analytics, extra languages) use existing plan system |
| **CMS** | Menu content, venue About/Team page, imprint powered by CMS; multilingual via existing i18n |
| **WorkHub** | Staff roster, shift scheduling, service duties → directly reuses WorkHub tasks/roles |
| **Company Profile** | Venue identity (name, address, IBAN for QR payment) = company profile |
| **Ticketing Widget** | Guest support requests, order issues → existing ticketing pipeline |
| **Audit Log** | Order lifecycle events, credential changes, contract signatures logged |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Guest Surface (QR)        Staff Surface        Owner        │
│  mares-palma.html          /hospitality/floor   /settings   │
│  (offline-capable SPA)     (React, post-login)  (React)     │
└──────────────┬──────────────────┬───────────────────────────┘
               │  REST / WS       │  REST
               ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  CI4 API  —  HospitalityController (new)                    │
│  ├── GuestSession CRUD         ├── Order lifecycle          │
│  ├── Catalog CRUD              ├── Reservation CRUD         │
│  ├── Contract CRUD             ├── KDS ticket routing       │
│  └── Settlement → invoiceService (existing)                 │
└──────────────┬──────────────────────────────────────────────┘
               │  ORM
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (new tables)                                       │
│  hospitality_venues · hosp_contexts · hosp_catalogs         │
│  hosp_guest_sessions · hosp_orders · hosp_order_lines       │
│  hosp_reservations · hosp_contracts · hosp_vouchers         │
│  hosp_kds_tickets · hosp_staff_passes · hosp_social_msgs   │
└─────────────────────────────────────────────────────────────┘
               │  (optional, Phase 3)
               ▼
┌─────────────────────────────────────────────────────────────┐
│  SCLAN Local Node (autarkic, venue LAN)                      │
│  Table lights · Audio relay · PFE automations               │
└─────────────────────────────────────────────────────────────┘
```

### Key Domain Concepts (from spec)

| Term | Definition |
|------|-----------|
| **ctx** (context) | Atomic unit — a table, room, court, zone or seat. Everything is scoped to a ctx. |
| **GuestSession** | Owns the order (not the table). Created on QR scan, survives rounds. |
| **Catalog** | Menu items with sections, option groups, pricing, multilingual content. |
| **KDS ticket** | Order line routed to kitchen/bar station; status: new → accepted → in-prep → ready → served. |
| **SCLAN** | Site Control Local Area Network — local peer-to-peer node for hardware automation. |
| **Settlement** | Payment act that closes a GuestSession → creates a BillingTool invoice. |
| **Contract** | Supply agreement between venue and supplier with cut-off, ad terms, signature. |

---

## 4. Phased Roadmap

### Phase 0 — Free Gastronomy Entry _(Target: Q3 2026)_

**Goal:** Any BillingTool tenant can activate Hospitality for free, configure a venue, and hand guests a QR code to browse a live menu and place orders. Owner can settle orders as invoices.

**Deliverables:**
- Hospitality module toggle in tenant Settings
- Venue setup wizard (name, address, currency, languages, logo)
- Catalog editor (categories, items, photos, prices, option groups)
- ctx/table management (create tables, assign QR codes)
- Guest ordering surface (React route `/v/{venue-slug}/{ctx}`) — adapted from mares-palma.html prototype
- Order lifecycle: open → placed → delivered → settled (cash/card in-person)
- Settlement → generates BillingTool invoice via existing invoiceService
- Basic POS view for owner (floor grid, running totals, mark paid)
- 6-language support (ES, EN, DE, FR, IT, NL) via existing i18n system
- Light/dark theme, mobile-first responsive

---

### Phase 1 — POS & Kitchen Surfaces _(Target: Q4 2026)_

**Goal:** Full staff workflow — waiter mode, kitchen/bar display, reservation inbox — so the module handles a real evening service without paper.

**Deliverables:**
- Waiter mode with PIN access and compact ordering grid
- Kitchen Display System (KDS) with per-station routing (food → kitchen, drinks → bar)
- Kitchen sub-stations (Chef de partie, Sous-chef, Pâtissier) with on-duty toggle
- KDS ticket flow: new → accepted → in-prep → ready → served + refuse-with-reason
- Ready-for-pickup list in service screen
- Reservation system: online booking form, floor-plan table selection (SVG), owner inbox
- Booking modes: table-only, pre-order with menu, additional tables during session
- Cash drawer relay integration (via SCLAN local node, browser ESC/POS fallback)
- Shift roster + service duties → WorkHub tasks integration
- Staff passes (temporary guest/staff identifier, pay-later accumulation)

---

### Phase 2 — Paid Services & Analytics _(Target: Q1 2027)_

**Goal:** Monetise the module through paid add-ons using BillingTool's existing subscription/plan system.

**Paid Add-ons (new plan features):**
- **CI Skin** — custom brand colours, fonts, logo on guest surface
- **Analytics dashboard** — covers, order value, popular items, peak hours
- **Extra languages** — beyond the 6 base languages
- **Table photos** — per-table gallery for reservations
- **SCLAN scenes** — timed venue automations (opening lights, closing routines)
- **Our Team page** — guest-facing staff introduction page
- **Happy Hour** — time-boxed discount rules per catalog item

**Infrastructure:**
- Plan feature flags: `hosp_ci_skin`, `hosp_analytics`, `hosp_extra_lang`, `hosp_table_photos`, `hosp_sclan_scenes`, `hosp_team_page`, `hosp_happy_hour`
- Venue analytics tables + dashboard React component
- SCLAN scenes PFE editor (process flow automation UI)

---

### Phase 3 — Full Platform Expansion _(Target: Q2–Q3 2027)_

**Goal:** Complete the substrate — vouchers, delivery, social layer, occupancy management, supply contracting, and humpl.org cloud sync.

**Deliverables:**
- **Vouchers** — pre-paid (gift) and post-paid (delegation) with balance tracking
- **Delivery workers** — delivery zone, driver assignment, delivery status surface
- **Social layer** — Send to Table (Lokalrunde), Table Chat (gesture or open), Mediated Contact (anonymous safe contact, minors-blocked)
- **Occupancy & energy** — sub-contexts, EST/MEAS discipline (Principle 069)
- **Age gate** — alcohol restriction with optional age verification
- **SHOPING LIST** — per-product stock tracking and auto shopping list generation
- **Supply Contracting** — full CRUD: cut-off orders, change lead time, freshness grading, ad placement terms, touch signatures, multi-channel send (Email/SMS/Telegram)
- **Guest Wi-Fi QR** — one-tap sticker generation
- **Taxi service** — call/partner/ride-app link configuration
- **House tab** — pay-later for registered regulars
- **humpl.org sync** — profitability, forecast, budget, workhub personal to-do generation

---

## 5. Detailed Backlog

Each item has: **ID · Priority · Phase · Effort · Status · Description**

Priority scale: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low  
Effort: S (< 1 day) · M (1–3 days) · L (3–7 days) · XL (> 1 week)  
Status: `[ ]` Not started · `[~]` In progress · `[x]` Done

---

### Epic 1 — Foundation & Module Activation

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-001 | 🔴 | 0 | M | `[ ]` | Database migrations — create all `hosp_*` tables (venues, contexts, catalogs, guest_sessions, orders, order_lines) |
| H-002 | 🔴 | 0 | M | `[ ]` | CI4 model layer — HospitalityVenueModel, HospContextModel, HospCatalogModel, HospOrderModel |
| H-003 | 🔴 | 0 | S | `[ ]` | Module activation toggle in tenant Settings page (feature flag `hospitality_enabled` per tenant) |
| H-004 | 🔴 | 0 | M | `[ ]` | Venue setup wizard — name, address, currency, default language, logo (reuse company profile patterns) |
| H-005 | 🔴 | 0 | S | `[ ]` | Admin panel section: Hospitality in sidebar nav under Workspace |
| H-006 | 🟠 | 0 | S | `[ ]` | RBAC — new roles: `venue_owner`, `waiter`, `kitchen`, `bar` mapped to existing RBAC primitives |
| H-007 | 🟡 | 0 | S | `[ ]` | Audit log integration — log order lifecycle events (placed, delivered, settled, cancelled) |

---

### Epic 2 — Catalog Management

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-010 | 🔴 | 0 | L | `[ ]` | Catalog editor UI — sections, items, prices, photos, sort order |
| H-011 | 🔴 | 0 | M | `[ ]` | Item option groups — generic (sides, extras) and drink-specific (sugar, milk, gas, bottle size) |
| H-012 | 🔴 | 0 | M | `[ ]` | Photo upload per catalog item (reuse CMS media library) |
| H-013 | 🟠 | 0 | M | `[ ]` | Multilingual catalog content — 6 base languages (ES/EN/DE/FR/IT/NL) via existing i18n |
| H-014 | 🟠 | 0 | S | `[ ]` | Icon/photo display toggle per item (icon-only vs. thumbnail mode) |
| H-015 | 🟡 | 0 | M | `[ ]` | Inline WYSIWYG menu editing — edit item name/price/description in-place on live card |
| H-016 | 🟡 | 0 | S | `[ ]` | Option group presets library (size, carbonation, lemon, temperature, spice, doneness, side, extras) |
| H-017 | 🟡 | 0 | S | `[ ]` | Per-option images — upload/camera per choice chip |
| H-018 | 🟡 | 2 | M | `[ ]` | Menu template library — pre-built catalog templates for different venue types |
| H-019 | 🟡 | 2 | M | `[ ]` | AI translation (Claude API) — one-tap translate catalog to any language |
| H-020 | 🟢 | 2 | S | `[ ]` | Recipe catalog — ingredients and quantities per dish |

---

### Epic 3 — Context (Table/Room) Management

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-030 | 🔴 | 0 | M | `[ ]` | Context CRUD — create/edit/delete tables, rooms, zones with name, type, capacity |
| H-031 | 🔴 | 0 | M | `[ ]` | QR code generation per context — downloadable print sheet (reuse existing QR infrastructure) |
| H-032 | 🔴 | 0 | S | `[ ]` | QR resolver route `/v/{venue-slug}/{ctx-token}` — opens guest surface scoped to that context |
| H-033 | 🟠 | 1 | L | `[ ]` | SVG floor plan editor — drag-and-drop table placement, zones (window/hall/bar/terrace), 16+ tables |
| H-034 | 🟡 | 2 | M | `[ ]` | Per-table photos — gallery upload, caption, preview popover in reservation flow |
| H-035 | 🟡 | 1 | S | `[ ]` | Prominent table number display on guest surface with quick-switch dropdown for staff |

---

### Epic 4 — Guest Surface (Frontend)

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-040 | 🔴 | 0 | XL | `[ ]` | Port mares-palma.html prototype to React component tree at route `/g/{venue}/{ctx}` (public, no auth required) |
| H-041 | 🔴 | 0 | M | `[ ]` | Category tinted navigation with section dots |
| H-042 | 🔴 | 0 | M | `[ ]` | Item detail feed with image gallery (prev/next navigation) |
| H-043 | 🔴 | 0 | M | `[ ]` | Cart — add/remove/quantity, persistent via localStorage |
| H-044 | 🔴 | 0 | M | `[ ]` | Order submission → REST POST to API, order confirmation screen |
| H-045 | 🔴 | 0 | M | `[ ]` | Order lifecycle display — order phases: menu → sent → delivered → paying → settled |
| H-046 | 🟠 | 0 | M | `[ ]` | Payment method selection — online (Stripe) or cash/card (in-person) |
| H-047 | 🟠 | 0 | S | `[ ]` | Language switcher on guest surface (6 languages) |
| H-048 | 🟠 | 0 | S | `[ ]` | Light/dark/system theme toggle |
| H-049 | 🟠 | 0 | S | `[ ]` | Service call button ("Call Waiter") — triggers notification to floor staff |
| H-050 | 🟡 | 0 | S | `[ ]` | Venue About page and Imprint powered by CMS |
| H-051 | 🟡 | 1 | M | `[ ]` | Multi-round ordering — guest can add more items after first order is delivered |
| H-052 | 🟡 | 2 | M | `[ ]` | Happy Hour — time-boxed discount display and price override on items |
| H-053 | 🟡 | 2 | M | `[ ]` | Our Team page — guest-facing staff introductions (photo, role, words) |
| H-054 | 🟡 | 3 | M | `[ ]` | Guest Wi-Fi QR — one-tap sticker for network credentials |
| H-055 | 🟡 | 3 | M | `[ ]` | Taxi service section — call/partner/ride-app links configured by owner |
| H-056 | 🟢 | 3 | M | `[ ]` | Geselligkeit (social/gathering) category — group order items |

---

### Epic 5 — Order Management & POS

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-060 | 🔴 | 0 | L | `[ ]` | Floor overview — grid of active contexts with running totals, order status, elapsed time |
| H-061 | 🔴 | 0 | M | `[ ]` | Mark order as delivered — staff action per order line or whole order |
| H-062 | 🔴 | 0 | L | `[ ]` | Settlement flow — close session, generate BillingTool invoice via existing invoiceService |
| H-063 | 🟠 | 1 | M | `[ ]` | Waiter mode — compact ordering grid with PIN access, fast add to open session |
| H-064 | 🟠 | 1 | M | `[ ]` | POS / quick till — manual billing: free-text item, quantity, unit price via numpad, cash/card, print receipt |
| H-065 | 🟠 | 1 | S | `[ ]` | Mandatory human acceptance gate — staff must accept every incoming order (anti-abuse, PARTIAL in prototype) |
| H-066 | 🟡 | 1 | S | `[ ]` | Opening-hours gate — guest surface shows "closed" outside configured hours |
| H-067 | 🟡 | 2 | M | `[ ]` | Analytics dashboard — covers per day, order value, popular items, peak hours, revenue trend |
| H-068 | 🟡 | 3 | L | `[ ]` | Vouchers — pre-paid (gift card) and post-paid (delegation/house tab) with balance tracking |
| H-069 | 🟢 | 3 | L | `[ ]` | Age gate — alcohol items flagged, optional age verification on guest surface |

---

### Epic 6 — Kitchen & Bar Display (KDS)

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-070 | 🟠 | 1 | L | `[ ]` | KDS login — separate PIN-gated view for kitchen and bar stations |
| H-071 | 🟠 | 1 | M | `[ ]` | Category-based order routing — food lines auto-route to kitchen, drink lines to bar on submission |
| H-072 | 🟠 | 1 | M | `[ ]` | Ticket status flow — new → accepted → in-prep → ready → served + refuse-with-reason |
| H-073 | 🟠 | 1 | M | `[ ]` | Refuse with reason → notify waiter and owner (human-in-the-loop hardening) |
| H-074 | 🟠 | 1 | S | `[ ]` | Ready-for-pickup list in service screen — surface ready tickets for "mark served" |
| H-075 | 🟡 | 1 | M | `[ ]` | Kitchen sub-stations — Chef de partie, Sous-chef, Pâtissier with per-station PIN and on-duty toggle |
| H-076 | 🟡 | 1 | S | `[ ]` | Dynamic fall-up routing — if sub-station unstaffed, lines fall to parent station with redirect marker |
| H-077 | 🟡 | 1 | S | `[ ]` | Per-dish station override — specific dishes can be routed to sub-station, overriding category default |
| H-078 | 🟡 | 1 | M | `[ ]` | Ticket audit history — every status change timestamped, visible to owner |

---

### Epic 7 — Reservations

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-080 | 🟠 | 1 | L | `[ ]` | Public reservation form — date/time/party-size/name/contact with slot granularity and duration limits |
| H-081 | 🟠 | 1 | M | `[ ]` | Booking modes toggle — table-only or with pre-order (full menu then book) |
| H-082 | 🟠 | 1 | L | `[ ]` | Reservation inbox for owner/service — accept/assign/refuse-with-reason/no-show/done with history |
| H-083 | 🟠 | 1 | M | `[ ]` | Floor plan table selection in booking flow — SVG plan with clickable tables, zone highlight |
| H-084 | 🟡 | 1 | S | `[ ]` | Reservation persistence — confirmed bookings survive page reloads |
| H-085 | 🟡 | 1 | S | `[ ]` | Direct booking URL anchor (`#book`, `?book=1`) — deep-link from external campaigns |
| H-086 | 🟡 | 2 | M | `[ ]` | Deposit policy — configurable deposit amount, payment at booking via Stripe |
| H-087 | 🟡 | 2 | S | `[ ]` | Confirmation modes — instant confirm vs. owner-reviewed confirm |
| H-088 | 🟡 | 2 | M | `[ ]` | Cart → pre-order bridge — guest fills main cart, cart 1:1 imported into reservation |
| H-089 | 🟢 | 2 | M | `[ ]` | SVG floor plan upload — real venue plan with clickable hotspot mapping |
| H-090 | 🟢 | 3 | M | `[ ]` | Date-range reservations — hotel room / court / long-table event bookings |

---

### Epic 8 — Staff & Roster

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-100 | 🟠 | 1 | M | `[ ]` | Staff roster — shift planning (date/label/who) with self-sign-up and open shift claiming |
| H-101 | 🟠 | 1 | M | `[ ]` | Service duties — recurring cleaning/operational tasks with schedule and responsible assignment |
| H-102 | 🟠 | 1 | S | `[ ]` | WorkHub integration — shifts and duties appear in WorkHub task list per staff member |
| H-103 | 🟡 | 1 | M | `[ ]` | Personal staff space — waiter-mode view: pick identity, see my shifts/duties, accept tasks |
| H-104 | 🟡 | 1 | S | `[ ]` | Owner alerts — notify owner when a duty is unclaimed or shift has no cover; one-tap self-assign |
| H-105 | 🟡 | 1 | M | `[ ]` | Staff passes — temporary guest/staff passes (nickname/anonymous), pay-later credit accumulation |
| H-106 | 🟡 | 2 | M | `[ ]` | Roles and rights — editMenu, editTeam rights mapped to existing RBAC |
| H-107 | 🟢 | 3 | L | `[ ]` | Larger staff structure — housekeeping, gardening, technician teams with manager hierarchy |

---

### Epic 9 — Supply Contracting

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-110 | 🟠 | 3 | L | `[ ]` | Contract list CRUD — supplier name, product category, terms, status |
| H-111 | 🟠 | 3 | M | `[ ]` | Venue business identity — legal name, address, bank account in contract header |
| H-112 | 🟠 | 3 | M | `[ ]` | Delivery service address per contract — separate delivery address and instructions |
| H-113 | 🟠 | 3 | M | `[ ]` | Order cut-off → next-day delivery — configured cut-off time, automated order window |
| H-114 | 🟠 | 3 | M | `[ ]` | Change lead time — configurable days advance notice per contract |
| H-115 | 🟡 | 3 | M | `[ ]` | Scope & dynamic update — whole menu or selected categories; live price/stock sync |
| H-116 | 🟡 | 3 | M | `[ ]` | Freshness grading — day-fresh/frozen indicators, origin, grade, organic, notes per product |
| H-117 | 🟡 | 3 | M | `[ ]` | Advertising terms — logo/text/banner/mention, placement, compensation in contract |
| H-118 | 🟡 | 3 | S | `[ ]` | Advertising live placement — activation toggle shows supplier ad on guest surface |
| H-119 | 🟡 | 3 | M | `[ ]` | Preset and custom clauses — exclusivity, price lock, packaging return, minimum order, free-text |
| H-120 | 🟡 | 3 | M | `[ ]` | Touch signatures — finger/stylus embedded signature capture on contract |
| H-121 | 🟡 | 3 | M | `[ ]` | Contract document generation — PDF via existing invoice PDF engine |
| H-122 | 🟢 | 3 | L | `[ ]` | Multi-channel send — Email/SMS/Telegram contract dispatch (server-side) |

---

### Epic 10 — Social Layer

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-130 | 🟡 | 3 | M | `[ ]` | Send to Table (Lokalrunde) — guest can send a drink/dish to another table |
| H-131 | 🟡 | 3 | M | `[ ]` | Table chat — gesture-based or open text chat scoped to a context |
| H-132 | 🟡 | 3 | S | `[ ]` | Quick table picker — social table selection widget |
| H-133 | 🟡 | 3 | L | `[ ]` | Mediated contact — anonymous safe contact between guests; no real name collected; minors-blocked |

---

### Epic 11 — SCLAN & Operations

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-140 | 🟡 | 2 | L | `[ ]` | SCLAN bridge UI — explainer page + animated table-light guidance demo for owner |
| H-141 | 🟡 | 2 | M | `[ ]` | PFE scenes editor — configure timed automations (opening lights on, closing lights off, music schedule) |
| H-142 | 🟡 | 2 | M | `[ ]` | SHOPING LIST — per-product stock tracking, auto-deduction on order, shopping list generation |
| H-143 | 🟡 | 3 | XL | `[ ]` | SCLAN local node integration — hardware relay via ESC/POS, cash drawer, audio control |
| H-144 | 🟢 | 3 | M | `[ ]` | Occupancy & energy management — sub-contexts, EST/MEAS discipline, energy state per zone |

---

### Epic 12 — Credential Hardening & Security

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-150 | 🟠 | 1 | M | `[ ]` | Stage 1–3 credential escalation — shipped defaults → functional lock → per-venue secrets |
| H-151 | 🟠 | 1 | M | `[ ]` | LAN binding for SCLAN sessions — validate origin IP against venue node |
| H-152 | 🟡 | 1 | M | `[ ]` | Anomaly limits — max items per order, max orders per session, pay-before-fire gate |
| H-153 | 🟡 | 2 | M | `[ ]` | Stage 4–5 hardening — recovery codes, full credential rotation, multi-factor for owner |
| H-154 | 🟢 | 2 | S | `[ ]` | Session token signed by SCLAN node on order open (spec §42) |

---

### Epic 13 — Integration & DevOps

| ID | Pri | Phase | Effort | Status | Item |
|----|-----|-------|--------|--------|------|
| H-160 | 🔴 | 0 | M | `[ ]` | API route group `/api/hospitality/*` with tenant-scoped middleware |
| H-161 | 🔴 | 0 | S | `[ ]` | Admin panel route `/admin/hospitality` gated by `hospitality_enabled` feature flag |
| H-162 | 🟠 | 0 | M | `[ ]` | CI4 seeder — demo venue "Restaurante Marès" with sample catalog for dev/demo |
| H-163 | 🟠 | 1 | M | `[ ]` | WebSocket channel (or polling fallback) for real-time KDS ticket updates and order status |
| H-164 | 🟡 | 1 | M | `[ ]` | Stripe payment intent for online guest settlement — reuse existing Stripe module |
| H-165 | 🟡 | 2 | M | `[ ]` | humpl.org sync webhook — push settled invoices and roster data to humpl backend |
| H-166 | 🟡 | 2 | L | `[ ]` | E2E test suite for order lifecycle (place → deliver → settle → invoice created) |

---

## 6. Marketing & Growth Integration

From `marketing-reach-and-sideways-marketing.md`, three distribution channels are built into the product design:

### Channel 1 — Contracting as Wedge
Supply contracts (Epic 9) are the primary acquisition mechanism. Delivery services and food suppliers benefit from organised cut-off orders and structured ad placement. They co-fund venue software adoption (free tier or discounted paid tier) in exchange for guaranteed order volume and advertising terms embedded in contracts.

**SaaS implication:** Contracting module should include a "Powered by [mn]medianet BillingTool" imprint on generated contract PDFs (locked, non-removable on free tier).

### Channel 2 — Sideways Marketing
The same contracting mechanism applies to beverages, coffee, cleaning supplies, linen services, and energy partners. Each category has its own supply contract type, each with incentive to co-fund venue adoption.

**SaaS implication:** Contract categories are a configurable list (admin-defined), not hardcoded. Each category can carry different ad placement rules and compensation terms.

### Channel 3 — Finder Program
Independent distributors find venues and suppliers, earning business shares per activated tenant. Travel and acquisition costs may be tax-deductible.

**SaaS implication:** Affiliate/referral code on venue activation flow. Track finder ID per venue tenant in the admin panel.

---

## 7. Monetisation Model

From the spec (Besitz statt Provision — Ownership over Commission):

| Tier | Price | Features |
|------|-------|---------|
| **Free** | €0/month | Guest surface, basic catalog, QR ordering, cash/card settlement, 1 venue, 1 language |
| **Gastro Starter** | ~€29/month | + Reservations, KDS, waiter mode, 6 languages, POS till |
| **Gastro Pro** | ~€79/month | + Analytics, CI skin, table photos, Happy Hour, Staff roster, Service duties |
| **Gastro Enterprise** | Custom | + SCLAN integration, supply contracting, social layer, vouchers, delivery, humpl.org sync |

**Integration point:** Map tiers to BillingTool's existing `packages` table and `feature_flags` per tenant. The `hospitality_enabled` flag activates the module; individual feature flags (`hosp_*`) gate paid features within it.

---

## 8. Open Questions & Dependencies

| # | Question | Owner | Blocking |
|---|----------|-------|---------|
| OQ-1 | Should the guest surface (`/g/...`) be served from BillingTool's domain or a separate `menu.{venue-domain}` subdomain? | Product | H-040, H-032 |
| OQ-2 | Will SCLAN node software be bundled with BillingTool or remain a separate product? Phase 0 can proceed without it. | Product | H-143 |
| OQ-3 | Real-time updates strategy: WebSockets (requires infra change) or short-polling (simpler, works now)? | Engineering | H-163, H-070 |
| OQ-4 | humpl.org API contract — is there a public API spec, or does this require bilateral agreement? | Business | H-165 |
| OQ-5 | Age verification provider for alcohol gate — which service, what cost, GDPR implications? | Legal/Product | H-069 |
| OQ-6 | Offline mode: does the guest surface need to work without internet (original prototype design)? Requires local-first data strategy. | Engineering | H-040 |
| OQ-7 | Finder program — flat referral credit or ongoing revenue share? Tax/legal structure in DE. | Business/Legal | H-160 |

---

## 9. Source Files

| File | Purpose |
|------|---------|
| `mn-hospitality-bundle/hospitality-spec.md` | Complete feature specification (977 lines, locked contract) |
| `mn-hospitality-bundle/mn-hospitality-feature-list.pdf` | 97/103 features built in prototype — source of truth for backlog |
| `mn-hospitality-bundle/mares-palma.html` | Guest surface prototype (1.3 MB, single-file, offline-capable) |
| `mn-hospitality-bundle/mares-order-booking.html` | Booking flow prototype |
| `mn-hospitality-bundle/marketing-reach-and-sideways-marketing.md` | Growth strategy |
| `mn-hospitality-bundle/00-read-me_first.pdf` | Executive summary (EN/DE) |
| `mn-hospitality-bundle/mn-hospitality-package-overview.pdf` | Document package index |
