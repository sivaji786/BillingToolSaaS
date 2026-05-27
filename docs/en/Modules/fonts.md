# Font Size Audit

**Question:** Are we using common font sizes across different segments?

**Short answer:** Mostly yes — 91% of usages go through the custom design-system classes defined in `tailwind.config.js`. There are a few targeted inconsistencies worth fixing.

---

## Design System: Custom Font Scale

Defined in [tailwind.config.js](../../../tailwind.config.js) under `theme.extend.fontSize`:

| Class | Size | Line-height | Role |
|---|---|---|---|
| `text-display` | 20 px | 1.3 | Hero numbers, major stats |
| `text-heading-1` | 18 px | 1.3 | Page & section titles |
| `text-heading-2` | 16 px | 1.4 | Sub-section titles, card headers |
| `text-heading-3` | 14 px | 1.4 | Group labels, minor headings |
| `text-body-lg` | 13 px | 1.5 | *(defined but **unused**)* |
| `text-body` | 12 px | 1.5 | Default body / form / table text |
| `text-caption` | 11 px | 1.4 | Secondary captions |
| `text-micro` | 10 px | 1.3 | Badges, timestamps, auxiliary info |
| `text-preview-lg` | 9 px | — | *(defined but **unused**)* |
| `text-preview` | 8 px | — | *(defined but **unused**)* |
| `text-preview-sm` | 7 px | — | *(defined but **unused**)* |

---

## Usage by Segment

| Segment | Primary class | Secondary class | Notes |
|---|---|---|---|
| Page titles | `text-heading-1` (18 px) | `text-display` (20 px) | Consistent |
| Section headers | `text-heading-2` (16 px) | `text-heading-1` | Consistent |
| KPI / stat numbers | `text-heading-1` | `text-display` | Dashboard, admin panels |
| Body text | `text-body` (12 px) | `text-heading-3` | Consistent across app |
| Form labels | `text-body` | `text-heading-2` | Consistent |
| Table / list content | `text-body` | `text-micro` | Consistent |
| Badges, timestamps | `text-micro` (10 px) | `text-caption` | Consistent |
| Chat messages | inline `13–15 px` | — | **Inconsistent — not using design system** |
| PDF table cells | inline `8–9 px` | — | Intentional (print scale differs from screen) |
| Template designer | dynamic `6–72 px` | — | Intentional (user-controlled) |

---

## Usage Statistics (839 total custom-class occurrences)

| Class | Count | % of total |
|---|---|---|
| `text-body` (12 px) | 443 | 53 % |
| `text-micro` (10 px) | 236 | 28 % |
| `text-heading-1` (18 px) | 59 | 7 % |
| `text-heading-2` (16 px) | 56 | 7 % |
| `text-heading-3` (14 px) | 36 | 4 % |
| `text-display` (20 px) | 13 | 2 % |
| `text-caption` (11 px) | 5 | <1 % |

12 px and 10 px account for 81 % of all text — the scale is compact and dense.

---

## Inconsistencies

### 1. Chat components use inline pixel values
**Files:** [HelpChatBot.tsx](../../../src/components/HelpChatBot.tsx) (4 instances, 13–15 px),
[GlobalAIAssistant.tsx](../../../src/components/GlobalAIAssistant.tsx) (6 instances, 12–16 px)

These components bypass the design system entirely. Sizes overlap with `text-body` / `text-heading-3` but are not tied to the token, so a future scale change won't apply to them.

**Fix:** Replace inline `style={{ fontSize: '13px' }}` etc. with the matching Tailwind class.

| Inline value | Replace with |
|---|---|
| 12 px | `text-body` |
| 13 px | `text-body-lg` *(or use `text-body`)* |
| 14 px | `text-heading-3` |
| 15–16 px | `text-heading-2` |

---

### 2. LandingPage mixes custom tokens with standard Tailwind sizes
**File:** [LandingPage.tsx](../../../src/components/screens/LandingPage.tsx) — 8 locations

Example pattern: `text-heading-1 sm:text-display md:text-5xl`

Standard Tailwind `text-5xl` (48 px) is far outside the custom scale. This is intentional for the marketing hero section but creates an invisible gap in the design system.

**Options:**
- Accept it as a deliberate exception (landing page has its own scale) and add a comment.
- Extend the custom font scale with a `text-hero` token at 48 px or similar.

---

### 3. Unused tokens in the design system
Four classes defined in `tailwind.config.js` have zero usages:

- `text-body-lg` (13 px)
- `text-preview-lg` (9 px)
- `text-preview` (8 px)
- `text-preview-sm` (7 px)

Remove them to keep the scale clean, unless they are planned for future use.

---

## PDF / UI font-size alignment (WYSIWYG)

jsPDF is initialised with `unit: 'pt'` and the comment in [invoice-pdf.ts:17](../../../src/utils/invoice-pdf.ts#L17) states *"1pt = 1px for our 72dpi designer"*, so there is no unit conversion needed — `el.fontSize` stored by the template designer can be passed directly to `doc.setFontSize()`.

**Root cause (now fixed):** `getPos()` previously returned only `x, y, w, h` and discarded `el.fontSize`. Every `doc.setFontSize()` call therefore used a hardcoded value. The fix extends `getPos()` to also return `fontSize`, and each PDF section now uses `pos.fontSize || <hardcoded fallback>`. Sections that contain multiple size levels (title + sub-number, party label + name + details) derive the sub-sizes proportionally from the base:

| Relationship | Ratio |
|---|---|
| Label → Value | × 0.82 |
| Value → Title | × 1.11 |
| Section label → body | × 1.0 (same) |

**Remaining exception — items table header/body rows:** jsPDF-autotable renders these internally; the table body size is now read from `itemsPos.fontSize || 9`. Column headers inherit from `headStyles` and scale automatically.

## Other intentional exceptions

| Context | Font approach | Why |
|---|---|---|
| Template designer canvas ([TemplateDesignLayout.tsx](../../../src/components/invoice/TemplateDesignLayout.tsx)) | Dynamic `el.fontSize` (6–72 px) | User-controlled element sizing by design |
| Print styles ([SAWiki.tsx](../../../src/components/screens/Admin/SAWiki.tsx)) | `em` units | Relative sizing for printable wiki pages |

---

## Recommendations

| Priority | Action |
|---|---|
| High | Replace inline font sizes in `HelpChatBot.tsx` and `GlobalAIAssistant.tsx` with design-system classes |
| Medium | Decide whether to add a `text-hero` token for LandingPage or document it as an explicit exception |
| Low | Remove the four unused tokens (`text-body-lg`, `text-preview-*`) from `tailwind.config.js` |
| Low | Consider whether 10 px (`text-micro`) is accessible enough for primary content — it is used 236 times |
