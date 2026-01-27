# Module Report: Ticketing Widget
**Status:** 🟢 Active (Feature Complete)

## 1. Sub-Modules
- **Annotation Canvas:** Interactive drawing layer for screenshots (Pencil, Shapes, Undo/Redo).
- **Screenshot Engine:** Captures the current viewport using `html-to-image`.
- **Backend Processor:** Validates API keys and saves screenshots as compressed JPGs.

## 2. Functionalities & Status
| Functionality | Description | Status |
| :--- | :--- | :--- |
| **Visual Feedback** | Capture viewport screenshot with a single click. | ✅ Stable |
| **Mark-up Tools** | Draw arrows, rectangles, and circles on screenshots. | ✅ Stable |
| **State Management** | Full Undo/Redo history for annotations (20 steps). | ✅ Stable |
| **Metadata Capture** | Auto-logging of Domain, Page Path, IP, and User ID. | ✅ Stable |
| **Stripe/Tailwind V4 Hack**| Workaround for `oklch` color rendering in screenshots. | 🟢 Active |

## 3. Technical Implementation
- **Controller:** `App\Controllers\TicketController`
- **Model:** `App\Models\TicketModel`, `App\Models\ProjectModel`
- **Frontend:** `src/components/TicketingWidget.tsx`
- **Storage:** `public/uploads/tickets/{Year}/{Month}/`

## 4. Risks & Conflicts
- **Storage Growth:** High-resolution screenshots can consume significant disk space over time.
- **Browser Compatibility:** `html-to-image` may have rendering artifacts on certain mobile browsers or with complex CSS filters.

## 5. Roadmap
- Video/Screen recording support for bug reports.
- Real-time chat integration within the widget.
- Automatic browser console log attachment.
