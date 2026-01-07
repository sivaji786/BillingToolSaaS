# PDF Page Dimensions Reference

## A4 Page Size in Points (pt)

The PDF uses **A4 format** with **points (pt)** as the unit.

### Page Dimensions

```typescript
const doc = new jsPDF({
  unit: 'pt',      // Points (1 point = 1/72 inch)
  format: 'a4',    // A4 paper size
});

const pageWidth = doc.internal.pageSize.getWidth();   // 595.28 pt
const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
```

## Coordinate System

### X-Axis (Horizontal)
- **Min X**: `0` (left edge of page)
- **Max X**: `595.28` (right edge of page)
- **Usable X**: `20` to `575` (with 20pt margins on each side)

### Y-Axis (Vertical)
- **Min Y**: `0` (top edge of page)
- **Max Y**: `841.89` (bottom edge of page)
- **Usable Y**: `20` to `791.89` (with 20pt top margin, 50pt bottom margin for page numbers)

## Safe Printable Area

To ensure content doesn't get cut off when printing:

```
┌─────────────────────────────────────┐
│ 0,0                                 │ ← Top-left corner
│  ┌───────────────────────────────┐  │
│  │ 20,20                         │  │ ← Safe area starts
│  │                               │  │
│  │   PRINTABLE AREA              │  │
│  │   Width: 555pt (595 - 40)     │  │
│  │   Height: 771pt (842 - 71)    │  │
│  │                               │  │
│  │                         575,  │  │
│  └───────────────────────────────┘  │
│                            791.89   │ ← Safe area ends
│                                     │
│                          595.28,    │
└─────────────────────────────────────┘
                            841.89 ← Bottom-right corner
```

## Recommended Margins

| Margin | Value (pt) | Purpose |
|--------|-----------|---------|
| Left | 20 | Standard margin |
| Right | 20 | Standard margin |
| Top | 20 | Header area |
| Bottom | 50 | Page numbers + safety margin |

## Common X Positions

| Element | X Position | Width | Notes |
|---------|-----------|-------|-------|
| Left margin | 20 | - | Start of content |
| Logo | 20 | 170 | Left-aligned |
| Header text | 200 | 375 | After logo |
| Dates | 380 | 20 | Right side |
| Seller info | 20 | 270 | Left column |
| Buyer info | 310 | 265 | Right column |
| Line items table | 20 | 555 | Full width |
| Totals labels | 350 | - | Right-aligned section |
| Totals values | 575 | - | Right edge (right-aligned) |
| Notes | 20 | 320 | Left side |
| QR code | 480 | 120 | Right side |
| Footer | 20 | 555 | Full width |

## Common Y Positions (Dynamic)

| Element | Y Position | Notes |
|---------|-----------|-------|
| Logo/Header | 20 | Fixed top |
| Invoice title | 90 | Fixed |
| Seller/Buyer | 120 | Fixed |
| Line items | `currentY` | Dynamic (flows after header) |
| Totals | `currentY + 2` | Dynamic (flows after table) |
| Notes | `currentY + 2` | Dynamic (flows after totals) |
| Payment/QR | `currentY + 2` | Dynamic (flows after notes) |
| Footer | `currentY + 2` | Dynamic (flows after payment) |
| Page numbers | 829.89 | Fixed (pageHeight - 12) |

## Width Calculations

```typescript
// Full page width
const pageWidth = 595.28;

// Usable width (with margins)
const usableWidth = pageWidth - 40; // 555.28pt

// Two-column layout
const columnWidth = (usableWidth - 20) / 2; // 267.64pt each
// 20pt gap between columns

// Table column widths (example)
const col1 = 20;   // Serial number
const col2 = 'auto'; // Description (flexible)
const col3 = 30;   // Quantity
const col4 = 60;   // Unit Price
const col5 = 30;   // Tax %
const col6 = 60;   // Amount
```

## Height Calculations

```typescript
// Full page height
const pageHeight = 841.89;

// Usable height (with margins)
const usableHeight = pageHeight - 70; // 771.89pt
// (20pt top + 50pt bottom)

// Check if content fits on current page
const remainingSpace = pageHeight - currentY - 50;
if (elementHeight > remainingSpace) {
  doc.addPage(); // Add new page
  currentY = 50; // Reset to top of new page
}
```

## Conversion Reference

| Unit | Points (pt) | Millimeters (mm) | Inches (in) |
|------|------------|------------------|-------------|
| 1 pt | 1 | 0.3528 | 0.0139 |
| 1 mm | 2.8346 | 1 | 0.0394 |
| 1 in | 72 | 25.4 | 1 |

### A4 Dimensions in Different Units

| Dimension | Points (pt) | Millimeters (mm) | Inches (in) |
|-----------|------------|------------------|-------------|
| Width | 595.28 | 210 | 8.27 |
| Height | 841.89 | 297 | 11.69 |

## Examples

### Centering Content Horizontally

```typescript
const contentWidth = 200; // Width of your content
const centerX = (pageWidth - contentWidth) / 2;
// centerX = (595.28 - 200) / 2 = 197.64pt

doc.text('Centered Text', centerX, 100);
```

### Centering Content Vertically

```typescript
const contentHeight = 100; // Height of your content
const centerY = (pageHeight - contentHeight) / 2;
// centerY = (841.89 - 100) / 2 = 370.95pt

doc.text('Vertically Centered', 100, centerY);
```

### Right-Aligning Text

```typescript
const rightMargin = 20;
const textX = pageWidth - rightMargin;
// textX = 595.28 - 20 = 575.28pt

doc.text('Right-aligned text', textX, 100, { align: 'right' });
```

## Current Layout Bounds

Based on the current implementation:

```
X-axis bounds:
├─ Min X: 20pt (left margin)
├─ Content area: 20pt to 575pt
└─ Max X: 575pt (right margin)

Y-axis bounds:
├─ Min Y: 20pt (top margin)
├─ Content area: 20pt to ~791pt
├─ Footer limit: ~791pt
└─ Page numbers: 829.89pt
```

## Safe Zone Summary

**Always keep content within these bounds:**

```typescript
const SAFE_ZONE = {
  minX: 20,
  maxX: 575,
  minY: 20,
  maxY: 791, // Leave 50pt for page numbers
  
  width: 555,  // maxX - minX
  height: 771, // maxY - minY
};
```

## Quick Reference

```
Page: 595.28 × 841.89 pt (A4)
Safe: 20 to 575 (X), 20 to 791 (Y)
Margins: 20pt (L/R/T), 50pt (B)
Unit: 1pt = 1/72 inch = 0.3528mm
```
