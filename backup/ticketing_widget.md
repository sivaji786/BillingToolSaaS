# Ticketing Widget — Improvement Guide

This document covers the current state of the ticketing widget and concrete improvements for **display**, **usage / UX**, and the **floating launcher icon**. Each section lists what exists today, what the problem is, and exactly what to change.

---

## 1. Architecture Overview

```
widget-loader.tsx          ← script-tag entry point (auto-init via data-api-key)
  └── TicketingWidget.tsx  ← full UI: launcher + panel + canvas + form
        └── ticketService.ts ← POST /tickets with X-API-Key header
```

**Embed snippet (current):**
```html
<link rel="stylesheet" href="/widget/billing-tool.css">
<script src="/widget/ticketing-widget.umd.js"
        data-api-key="YOUR_KEY"
        data-api-base-url="https://your-api.example.com"></script>
```

**Bundle sizes (current):** JS 564 KB · CSS 75 KB — both need reduction (see §4.3).

---

## 2. Display Improvements

### 2.1 Panel width on desktop

**Current:** `w-[95vw] md:w-[450px]` — 450 px is too narrow when a screenshot is attached; the annotation toolbar overflows on small laptops.

**Fix:** Use a two-column layout when a screenshot exists.

```tsx
// TicketingWidget.tsx — panel wrapper
<div className={`bg-background border rounded-lg shadow-2xl flex flex-col
  animate-in slide-in-from-bottom-2 fade-in duration-300 mb-2 mr-2 md:mb-0 md:mr-0
  max-h-[85vh] transition-all duration-300
  ${screenshot ? 'w-[95vw] md:w-[720px]' : 'w-[95vw] md:w-[420px]'}`}>
```

With screenshot → 720 px wide, split as 60 % canvas / 40 % form side by side.

---

### 2.2 Screenshot canvas area

**Current:** Canvas is stacked above the form in a single scrollable column. On a 13″ screen the canvas gets only ~200 px height before the user must scroll.

**Improvement:** When the panel is in wide mode (screenshot present), place canvas on the left and form on the right in a `flex-row` layout.

```tsx
<div className={`overflow-y-auto p-4 flex-1 min-h-0
  ${screenshot ? 'flex flex-row gap-4' : 'flex flex-col space-y-4'}`}>

  {screenshot && (
    <div className="flex-[3] min-w-0">   {/* 60% — canvas column */}
      {/* annotation toolbar + canvas */}
    </div>
  )}

  <div className={screenshot ? 'flex-[2] min-w-0' : 'w-full'}>  {/* form column */}
    {/* subject / description / priority */}
  </div>
</div>
```

---

### 2.3 Annotation toolbar layout

**Current:** The toolbar is `sticky top-2 right-2 z-10` inside the scrollable canvas container, rendered as a single horizontal row of 10 icons. On mobile (<380 px) it wraps badly.

**Improvement:** Split into two vertical pill groups (history | drawing tools) and dock them to the left edge of the canvas container instead of floating over it.

```tsx
{/* Left-docked toolbar */}
<div className="absolute left-2 top-2 z-10 flex flex-col gap-1
  bg-background/90 backdrop-blur-md border rounded-lg shadow-xl p-1">

  {/* Group 1 — history */}
  <button title="Undo" ...><Undo2 className="w-4 h-4" /></button>
  <button title="Redo" ...><Redo2 className="w-4 h-4" /></button>

  <div className="h-px bg-border my-0.5" />

  {/* Group 2 — draw tools */}
  <button title="Pencil"    ...><Pencil     className="w-4 h-4" /></button>
  <button title="Eraser"    ...><Eraser     className="w-4 h-4" /></button>
  <button title="Rectangle" ...><Square     className="w-4 h-4" /></button>
  <button title="Circle"    ...><Circle     className="w-4 h-4" /></button>
  <button title="Arrow"     ...><ArrowUpRight className="w-4 h-4" /></button>
  <button title="Pan"       ...><Hand       className="w-4 h-4" /></button>

  <div className="h-px bg-border my-0.5" />

  {/* Group 3 — clear */}
  <button title="Clear" ...><Trash2 className="w-4 h-4 text-red-500" /></button>
</div>
```

Active tool: highlight with `ring-2 ring-primary bg-primary/10`.

---

### 2.4 Annotation color

**Current:** All annotation marks are hardcoded red (`#ef4444`).

**Improvement:** Add a 5-colour swatch row below the toolbar (red, orange, blue, green, white). Store `annotationColor` in state, pass to `strokeStyle`.

```tsx
const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e', '#ffffff'];
const [annotationColor, setAnnotationColor] = useState('#ef4444');

// In draw setup:
ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : annotationColor;
```

---

### 2.5 Panel header

**Current:** Plain `bg-muted/50` bar with "Support Ticket" text and an X button.

**Improvement:** Add a priority-coloured left border stripe and a page URL breadcrumb so the submitter can see which page is captured.

```tsx
<div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30
  border-l-4"
  style={{ borderLeftColor: priorityColor[formData.priority] }}>

  <div>
    <h3 className="font-semibold text-heading-3">Support Ticket</h3>
    <p className="text-micro text-muted-foreground truncate max-w-[280px]">
      {window.location.pathname}
    </p>
  </div>

  <button onClick={handleClose} ...><X className="w-4 h-4" /></button>
</div>
```

Priority colours: `low=#6b7280 medium=#f59e0b high=#f97316 critical=#ef4444`.

---

### 2.6 Form field sizing

**Current:** Input height is `h-10` (40 px) which is fine, but `text-body` (12 px) makes labels feel too small inside a floating panel.

**Improvement:** Use `text-caption` (11 px) for labels and `text-body` (12 px) for input text — same as current, but add `font-medium` to labels and `uppercase tracking-wide` to section group headings.

```tsx
<label className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
  Subject
</label>
```

---

### 2.7 Screenshot loading state

**Current:** The button is clicked, there is no visual feedback during the `toPng()` call (can take 300–800 ms).

**Improvement:** Show a spinner inside the launcher button while capture is in progress.

```tsx
const [capturing, setCapturing] = useState(false);

const handleOpen = async () => {
  setCapturing(true);
  // ... existing capture logic ...
  setCapturing(false);
};

// In launcher button:
{capturing
  ? <Loader2 className="w-5 h-5 animate-spin" />
  : <MessageSquarePlus className="w-6 h-6" />
}
```

---

## 3. Usage / UX Improvements

### 3.1 Configurable position

**Current:** Position is hardcoded to `bottom: 24px; right: 24px` inside the component.

**Improvement:** Expose `position` in `WidgetOptions` so host apps can place the widget wherever it doesn't clash with their own FABs.

```ts
// widget-loader.tsx
interface WidgetOptions {
  apiKey: string;
  apiBaseUrl?: string;
  containerId?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';  // default: bottom-right
}
```

```tsx
// TicketingWidget.tsx
const positionStyles: Record<string, React.CSSProperties> = {
  'bottom-right': { bottom: 24, right: 24 },
  'bottom-left':  { bottom: 24, left:  24 },
  'top-right':    { top: 24,    right: 24 },
  'top-left':     { top: 24,    left:  24 },
};
```

Via data attribute:
```html
<script src="..." data-api-key="..." data-position="bottom-left"></script>
```

---

### 3.2 Pass user identity

**Current:** `userId` prop exists but is never passed from `initTicketingWidget()` — the ticket is submitted without a user ID even when the host app is authenticated.

**Fix in `widget-loader.tsx`:**
```ts
interface WidgetOptions {
  apiKey: string;
  apiBaseUrl?: string;
  containerId?: string;
  userId?: string;          // ← add
}

// In initTicketingWidget():
root.render(
  <React.StrictMode>
    <TicketingWidget
      apiKey={options.apiKey}
      apiBaseUrl={options.apiBaseUrl}
      userId={options.userId}    // ← pass through
    />
    <Toaster />
  </React.StrictMode>
);
```

Via data attribute:
```html
<script src="..." data-api-key="..." data-user-id="u_12345"></script>
```

---

### 3.3 Category / type field

**Current:** Only Subject, Description, Priority. There is no way to distinguish a bug from a feature request or a billing query.

**Improvement:** Add a `type` select before Subject.

```tsx
<select id="type" value={formData.type}
  onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
  <option value="bug">Bug</option>
  <option value="feature">Feature Request</option>
  <option value="billing">Billing Question</option>
  <option value="other">Other</option>
</select>
```

Add `type` to `TicketData` interface in `ticketService.ts` and include it in the POST body.

---

### 3.4 Keyboard shortcut to open

**Current:** Widget can only be opened by clicking the launcher button.

**Improvement:** Listen for `Alt+Shift+S` globally.

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && e.key === 'S') handleOpen();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

Show the shortcut hint in the launcher button tooltip: `title="Report issue (Alt+Shift+S)"`.

---

### 3.5 Escape key to close

**Current:** Only the Cancel button or X closes the panel.

**Fix:**
```tsx
useEffect(() => {
  if (!isOpen) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [isOpen]);
```

---

### 3.6 Confirmation before close when form has content

**Current:** Clicking Cancel discards subject/description without any warning.

**Improvement:**
```tsx
const handleClose = () => {
  const hasContent = formData.subject || formData.description;
  if (hasContent && !confirm('Discard this ticket?')) return;
  // ... existing close logic
};
```

For a non-blocking approach, replace `confirm()` with an inline warning banner that appears when the user clicks Cancel with a non-empty form.

---

### 3.7 Character counter on Description

**Current:** `textarea` has no max-length feedback.

```tsx
<div className="flex justify-between items-center">
  <label className="text-caption font-medium ...">Description</label>
  <span className={`text-micro ${formData.description.length > 1800 ? 'text-red-500' : 'text-muted-foreground'}`}>
    {formData.description.length}/2000
  </span>
</div>
<textarea maxLength={2000} ... />
```

---

### 3.8 Optional screenshot capture

**Current:** `handleOpen()` always triggers `toPng(document.body)`. The screenshot is mandatory — there is no way for a host app to disable it or for the user to opt out before submitting.

**Two levels of control needed:**

**A — Host-level opt-out (via data attribute)**

Allows the host app to disable auto-capture completely (e.g. on pages with sensitive data like payment forms).

```html
<script src="..."
  data-api-key="..."
  data-screenshot="false">   <!-- disables capture entirely -->
</script>
```

```tsx
// widget-loader.tsx
interface WidgetOptions {
  apiKey: string;
  apiBaseUrl?: string;
  screenshotEnabled?: boolean;   // default: true
}

// widget-loader auto-init:
const screenshotEnabled = script.getAttribute('data-screenshot') !== 'false';
initTicketingWidget({ apiKey, apiBaseUrl, screenshotEnabled });
```

```tsx
// TicketingWidget.tsx — skip capture entirely when disabled
const handleOpen = async () => {
  if (!props.screenshotEnabled) {
    setIsOpen(true);
    return;
  }
  // ... existing toPng logic
};
```

When `screenshotEnabled` is `false`, the canvas annotation section is hidden and the panel opens instantly with no capture delay.

**B — User-level opt-out (checkbox inside the panel)**

Even when auto-capture is on, the user can uncheck "Include screenshot" before submitting. This respects privacy without requiring a host-level config change.

```tsx
const [includeScreenshot, setIncludeScreenshot] = useState(true);

// Checkbox shown above the canvas section:
<label className="flex items-center gap-2 text-body cursor-pointer select-none">
  <input
    type="checkbox"
    checked={includeScreenshot}
    onChange={(e) => setIncludeScreenshot(e.target.checked)}
    className="rounded border-input"
  />
  Include page screenshot
</label>

{/* Only render canvas when checked */}
{screenshot && includeScreenshot && (
  <div className="space-y-2">
    {/* annotation toolbar + canvas */}
  </div>
)}
```

```tsx
// In handleSubmit — send null when user unchecked:
const finalScreenshot = includeScreenshot && canvasRef.current
  ? canvasRef.current.toDataURL('image/png')
  : null;
```

**Summary of behaviour by combination:**

| `screenshotEnabled` | User checkbox | Behaviour |
|---------------------|---------------|-----------|
| `true` (default)    | checked       | Captures + shows canvas, sends screenshot |
| `true`              | unchecked     | Captures (used for canvas baseline), sends `null` |
| `false`             | hidden        | No capture, no canvas, opens instantly, sends `null` |

---

### 3.9 File attachments (images and PDFs)

**Current:** The only attachment mechanism is the auto-captured screenshot sent as a base64 PNG string in the JSON body. Users cannot attach their own files, and PDFs are not supported at all.

**What to add:** A drag-and-drop / click-to-browse file picker that accepts images (`image/*`) and PDFs (`.pdf`), with inline previews and individual remove buttons.

---

#### 3.9.1 Frontend — file picker component

Add an `attachments` state and a dropzone area in the form, placed after the Description field:

```tsx
const [attachments, setAttachments] = useState<File[]>([]);

const onFilesSelected = (files: FileList | null) => {
  if (!files) return;
  const allowed = Array.from(files).filter(f =>
    f.type.startsWith('image/') || f.type === 'application/pdf'
  );
  const overLimit = allowed.filter(f => f.size > 10 * 1024 * 1024); // 10 MB cap per file
  if (overLimit.length) {
    toast.error(`${overLimit.length} file(s) exceed the 10 MB limit and were skipped.`);
  }
  setAttachments(prev => [...prev, ...allowed.filter(f => f.size <= 10 * 1024 * 1024)]);
};

const removeAttachment = (index: number) => {
  setAttachments(prev => prev.filter((_, i) => i !== index));
};
```

Dropzone UI:

```tsx
<div className="space-y-2">
  <label className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
    Attachments <span className="normal-case">(images, PDFs — max 10 MB each)</span>
  </label>

  {/* Drop target */}
  <label
    htmlFor="file-upload"
    className="flex flex-col items-center justify-center gap-1 border-2 border-dashed
      border-input rounded-md p-4 cursor-pointer hover:bg-muted/40 transition-colors"
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => { e.preventDefault(); onFilesSelected(e.dataTransfer.files); }}
  >
    <Paperclip className="w-5 h-5 text-muted-foreground" />
    <span className="text-body text-muted-foreground">
      Drop files here or <span className="text-primary underline">browse</span>
    </span>
    <span className="text-micro text-muted-foreground">PNG, JPG, GIF, WEBP, PDF</span>
    <input
      id="file-upload"
      type="file"
      accept="image/*,.pdf"
      multiple
      className="hidden"
      onChange={(e) => onFilesSelected(e.target.files)}
    />
  </label>

  {/* Preview list */}
  {attachments.length > 0 && (
    <ul className="space-y-1">
      {attachments.map((file, i) => (
        <li key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
          {file.type === 'application/pdf'
            ? <FileText className="w-4 h-4 text-red-500 shrink-0" />
            : <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-8 h-8 object-cover rounded shrink-0"
              />
          }
          <span className="text-body truncate flex-1">{file.name}</span>
          <span className="text-micro text-muted-foreground shrink-0">
            {(file.size / 1024).toFixed(0)} KB
          </span>
          <button type="button" onClick={() => removeAttachment(i)}
            className="text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  )}
</div>
```

Required new lucide imports: `Paperclip`, `FileText`.

---

#### 3.9.2 Frontend — switch POST to `multipart/form-data`

The current `ticketService.ts` sends JSON. With file attachments the request must switch to `FormData`.

```ts
// src/services/ticketService.ts

export const createTicket = async (
  data: TicketData,
  options: CreateTicketOptions
) => {
  const form = new FormData();
  form.append('subject',     data.subject);
  form.append('description', data.description);
  form.append('priority',    data.priority);
  form.append('type',        data.type ?? 'bug');
  form.append('domain',      data.domain);
  form.append('page',        data.page);
  if (data.user_id)   form.append('user_id',    data.user_id);
  if (data.screenshot) form.append('screenshot', data.screenshot);

  // Attach uploaded files
  data.attachments?.forEach((file, i) => {
    form.append(`attachments[${i}]`, file, file.name);
  });

  const response = await axios.post(
    `${options.baseUrl}/tickets`,
    form,
    {
      headers: {
        'X-API-Key': options.apiKey,
        // Do NOT set Content-Type — axios sets multipart boundary automatically
      },
    }
  );
  return response.data;
};
```

Update the `TicketData` interface:

```ts
interface TicketData {
  subject:     string;
  description: string;
  priority:    string;
  type?:       string;
  screenshot?: string | null;
  domain:      string;
  page:        string;
  user_id?:    string | null;
  attachments?: File[];          // ← new
}
```

Pass `attachments` from `handleSubmit`:

```tsx
const postData = {
  ...formData,
  screenshot: finalScreenshot,
  domain: window.location.hostname,
  page: window.location.pathname,
  user_id: propUserId,
  attachments,                   // ← new
};
```

---

#### 3.9.3 Backend — API changes required

The CI4 `tickets` endpoint must be updated to handle `multipart/form-data` and store the uploaded files.

**Controller (`api/app/Controllers/Tickets.php`):**

```php
public function create()
{
    // Text fields — same as before
    $data = [
        'subject'     => $this->request->getPost('subject'),
        'description' => $this->request->getPost('description'),
        'priority'    => $this->request->getPost('priority'),
        'type'        => $this->request->getPost('type') ?? 'bug',
        'domain'      => $this->request->getPost('domain'),
        'page'        => $this->request->getPost('page'),
        'user_id'     => $this->request->getPost('user_id'),
        'screenshot'  => $this->request->getPost('screenshot'),
    ];

    // Handle file attachments
    $uploadedPaths = [];
    $files = $this->request->getFiles('attachments') ?? [];
    foreach ($files as $file) {
        if ($file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(WRITEPATH . 'uploads/tickets/', $newName);
            $uploadedPaths[] = 'uploads/tickets/' . $newName;
        }
    }
    $data['attachments'] = json_encode($uploadedPaths);

    // Insert ticket ...
}
```

**Allowed MIME types (`app/Config/Mimes.php` or validation rules):**

```php
$rules = [
    'attachments.*' => 'is_image|max_size[attachments.*,10240]'
                     . '|mime_in[attachments.*,image/jpeg,image/png,image/gif,image/webp,application/pdf]',
];
```

**Database — add `attachments` column:**

```sql
ALTER TABLE tickets ADD COLUMN attachments JSON NULL AFTER screenshot;
```

**Serving files:** Attachments can be served through the existing uploads route, or a dedicated `GET /tickets/{id}/attachments/{filename}` endpoint that validates the `X-API-Key` before streaming the file.

---

#### 3.9.4 Constraints and limits

| Constraint | Recommended value | Reason |
|---|---|---|
| Max file size per file | 10 MB | Keeps uploads fast on mobile |
| Max total attachments | 5 files | Avoids oversized requests |
| Accepted MIME types | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf` | Covers all common support evidence |
| Server `upload_max_filesize` | 52 MB | 5 × 10 MB + overhead |
| Server `post_max_size` | 55 MB | Slightly above upload total |

Update `api/php.ini`:
```ini
upload_max_filesize = 52M
post_max_size       = 55M
```

---

### 3.11 Reduce bundle size

**Current:** `widget-loader.tsx` imports the full `index.css` (entire Tailwind output, 75 KB gzipped).

**Improvement:** Create a `widget.css` that only includes the CSS variables and the Tailwind classes actually used by `TicketingWidget.tsx`. Run PurgeCSS against the widget component file only.

In `vite.widget.config.ts`:
```ts
css: {
  postcss: {
    plugins: [
      require('@fullhuman/postcss-purgecss')({
        content: ['./src/components/TicketingWidget.tsx', './src/widget-loader.tsx'],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      }),
    ],
  },
},
```

Target: CSS ≤ 15 KB · JS ≤ 200 KB (gzipped).

---

### 3.12 oklch colour workaround cleanup

**Current:** `handleOpen()` overwrites 242 CSS custom properties with `#808080` before capturing, then removes them. This is fragile — it sets all colour variables to gray, which causes a brief flash if the capture is slow.

**Better approach:** Use `html-to-image`'s `filter` option to skip elements that use oklch, or switch the screenshot library to `dom-to-image-more` which handles CSS4 colours natively.

```ts
import { toPng } from 'dom-to-image-more';

const dataUrl = await toPng(document.body, {
  style: { colorScheme: 'light' },
  cacheBust: true,
});
```

If staying with `html-to-image`, at minimum scope the override only to elements that actually have oklch values rather than all 242 combinations.

---

## 4. Floating Icon Improvements

### 4.1 Current state

```tsx
<button
  className="bg-primary text-primary-foreground hover:bg-primary/90
    p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110
    flex items-center justify-center"
  title="Report a Bug / Request Support"
>
  <MessageSquarePlus className="w-6 h-6" />
</button>
```

Issues:
- Single icon with no label — users unfamiliar with `MessageSquarePlus` don't know what it does.
- No pulse/attention animation to draw initial notice.
- No unread/open-ticket badge.
- Icon is always the same regardless of state.

---

### 4.2 Labelled launcher with pulse ring

Replace the bare icon button with a pill-shaped button that shows a label and an attention ring on first visit.

```tsx
const [hasBeenOpened, setHasBeenOpened] = useState(
  () => localStorage.getItem('twgt_opened') === '1'
);

const handleOpen = async () => {
  localStorage.setItem('twgt_opened', '1');
  setHasBeenOpened(true);
  // ... capture logic
};

// Launcher:
<button
  onClick={handleOpen}
  className="relative bg-primary text-primary-foreground
    hover:bg-primary/90 pl-4 pr-5 py-3 rounded-full shadow-lg
    transition-all duration-200 hover:scale-105 flex items-center gap-2"
  title="Report issue (Alt+Shift+S)"
>
  {/* Pulse ring — only before first open */}
  {!hasBeenOpened && (
    <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
  )}
  <MessageSquarePlus className="w-5 h-5 shrink-0" />
  <span className="text-body font-medium whitespace-nowrap">Support</span>
</button>
```

---

### 4.3 Configurable icon and label via data attributes

Allow host apps to override the icon label and choose from a set of built-in icons.

```html
<script src="..."
  data-api-key="..."
  data-launcher-label="Feedback"
  data-launcher-icon="message">   <!-- message | bug | help | chat -->
</script>
```

```tsx
const ICONS = {
  message: MessageSquarePlus,
  bug:     Bug,          // lucide BugIcon
  help:    HelpCircle,
  chat:    MessagesSquare,
};

const LauncherIcon = ICONS[props.launcherIcon ?? 'message'];
```

---

### 4.4 Open ticket count badge

If the API supports fetching open ticket count for the current user, show a numeric badge on the launcher.

```tsx
{openCount > 0 && (
  <span className="absolute -top-1 -right-1 bg-red-500 text-white
    text-micro font-bold rounded-full w-4 h-4 flex items-center justify-center
    leading-none">
    {openCount > 9 ? '9+' : openCount}
  </span>
)}
```

New API call needed: `GET /tickets?user_id={userId}&status=open` — returns `{ count: number }`.

---

### 4.5 Drag-to-reposition

Power users may want to move the widget out of the way of their own UI.

```tsx
const [pos, setPos] = useState({ bottom: 24, right: 24 });
const dragStart = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);

const onMouseDown = (e: React.MouseEvent) => {
  if (isOpen) return;
  dragStart.current = {
    mx: e.clientX, my: e.clientY,
    bx: pos.right,  by: pos.bottom,
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (e: MouseEvent) => {
  if (!dragStart.current) return;
  const dx = dragStart.current.mx - e.clientX;
  const dy = dragStart.current.my - e.clientY;
  setPos({
    right:  Math.max(8, dragStart.current.bx + dx),
    bottom: Math.max(8, dragStart.current.by + dy),
  });
};
```

Persist position to `localStorage` so it survives page reloads.

---

### 4.6 Minimise to icon-only after first use

After the user submits a ticket, shrink the launcher from pill → icon-only to reclaim space.

```tsx
const [compact, setCompact] = useState(
  () => localStorage.getItem('twgt_submitted') === '1'
);

// After successful submit:
localStorage.setItem('twgt_submitted', '1');
setCompact(true);

// Launcher:
<button className={`... transition-all duration-300
  ${compact ? 'p-3' : 'pl-4 pr-5 py-3'}`}>
  <LauncherIcon className="w-5 h-5" />
  {!compact && <span className="text-body font-medium">Support</span>}
</button>
```

---

### 4.7 z-index management

**Current:** `zIndex: 9999` is hardcoded inline. This collides with modal frameworks that also use 9999.

**Improvement:** Make z-index configurable and document the default.

```html
<script src="..." data-z-index="10000"></script>
```

```tsx
style={{ bottom: pos.bottom, right: pos.right, zIndex: props.zIndex ?? 9999 }}
```

---

## 5. Summary Checklist

| # | Area | Change | Effort |
|---|------|--------|--------|
| 2.1 | Display | Widen panel to 720 px when screenshot attached | S |
| 2.2 | Display | Two-column layout (canvas left, form right) | M |
| 2.3 | Display | Vertical left-docked annotation toolbar | S |
| 2.4 | Display | Multi-colour annotation swatch | S |
| 2.5 | Display | Priority-coloured header stripe + page breadcrumb | S |
| 2.7 | Display | Spinner in launcher during screenshot capture | S |
| 3.1 | Usage | Configurable panel position via data attribute | S |
| 3.2 | Usage | Pass userId from data attribute through to ticket | S |
| 3.3 | Usage | Add ticket type/category field | S |
| 3.4 | Usage | Alt+Shift+S keyboard shortcut to open | S |
| 3.5 | Usage | Escape key to close | XS |
| 3.6 | Usage | Warn before discarding a filled form | S |
| 3.7 | Usage | Character counter on Description textarea | XS |
| 3.8 | Usage | Optional screenshot — host-level (`data-screenshot="false"`) | S |
| 3.8 | Usage | Optional screenshot — user-level checkbox inside panel | S |
| 3.9 | Usage | File attachments (images + PDFs) — frontend dropzone + preview | M |
| 3.9 | Usage | File attachments — switch POST to multipart/form-data | S |
| 3.9 | Usage | File attachments — CI4 backend upload handler + DB column | M |
| 3.11 | Usage | Widget-specific CSS bundle (target ≤15 KB) | M |
| 3.12 | Usage | Replace oklch workaround with dom-to-image-more | S |
| 4.2 | Launcher | Pill label + pulse ring on first visit | S |
| 4.3 | Launcher | Configurable icon and label via data attribute | S |
| 4.4 | Launcher | Open ticket count badge | M |
| 4.5 | Launcher | Drag-to-reposition + localStorage persistence | M |
| 4.6 | Launcher | Compact (icon-only) mode after first submit | S |
| 4.7 | Launcher | Configurable z-index via data attribute | XS |

**Effort key:** XS < 1 h · S = 1–3 h · M = half day
