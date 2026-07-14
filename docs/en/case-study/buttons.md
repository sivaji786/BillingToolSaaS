# Buttons Audit — BillingTool

A catalog of every interactive button in the application: type, label, context, and whether the label/name actually matches what the button does. Compiled by sweeping the codebase in four slices (top-level screens, Admin, WorkHub, shared/layout/global components).

## Legend

**Type** — one of:
- **Primary** — solid/filled main action
- **Secondary/Outline** — outlined, lower-emphasis action
- **Destructive** — delete/remove/danger action
- **Ghost/Icon-only** — no visible text label, icon only
- **Link** — styled as a link or `variant="link"`
- **Navigation** — changes screen/route/tab
- **Submit** — form submit
- **Toggle/Tab** — segmented control, tab switcher, or on/off toggle

**Notes** — flags only when something is off: label doesn't match the real action, label is vague/generic, icon has no `aria-label`/`title` (accessibility gap), or duplicate/conflicting labels for the same action. `OK` means the label accurately matches its context/action.

---

## Table of Contents

1. [Top-Level Screens](#1-top-level-screens) — `src/components/screens/*.tsx`
2. [Admin Screens](#2-admin-screens) — `src/components/screens/Admin/*.tsx`
3. [WorkHub Module](#3-workhub-module) — `src/components/screens/WorkHub/*.tsx`, `src/pages/WorkHub/*.tsx`
4. [Shared / Layout / Global Components](#4-shared--layout--global-components)
5. [Cross-Cutting Findings](#5-cross-cutting-findings)

---

## 1. Top-Level Screens

`src/components/screens/*.tsx`. `ActivityLog.tsx` has no interactive buttons (read-only) and is omitted.

### AIHistory.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 69 | Ghost/Icon-only | ← (ArrowLeft icon) | Back button → navigates to Workspace | No aria-label/title — accessibility gap |
| 117-122 | Link (clickable cell) | Prompt text (row value) | Re-runs a past AI query, navigates to Workspace | OK |
| 142 | Secondary/Outline | "Previous" | Paginate history table backward | OK |
| 143 | Secondary/Outline | "Next" | Paginate history table forward | OK |

### Billing.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 147-153 | Primary | "View Plans" | Usage-limit warning banner — scrolls to plans section | OK |
| 217-225 | Primary/Outline | "Current Plan" / "Upgrade" | Plan card footer — upgrades subscription | OK |
| 262-264 | Ghost/Icon-only | Download icon | Payment-history row, intended to download invoice/receipt | **Dead button — no `onClick` handler at all.** Also no aria-label. |

### Buyers.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 380 | Secondary/Outline | "CSV Template" | Downloads sample CSV template | OK |
| 384 | Secondary/Outline | "Export CSV" | Exports buyers list to CSV | OK |
| 388-396 | Secondary/Outline | "Import CSV" | Opens file picker for CSV import | OK |
| 398-405 | Primary | "Add Buyer" | Opens Add/Edit buyer dialog (create mode) | OK |
| 492 | Ghost/Icon-only | Edit (pencil) icon | Opens Edit dialog for that buyer | No aria-label — accessibility gap |
| 495 | Ghost/Icon-only, Destructive | Trash icon | Opens delete-confirmation for that buyer | No aria-label — accessibility gap |
| 529 | Secondary/Outline, Icon-only | ChevronLeft | Pagination — previous page | No aria-label |
| 533 | Secondary/Outline, Icon-only | ChevronRight | Pagination — next page | No aria-label |
| 624 | Secondary/Outline | "Cancel" | Add/Edit dialog — close without saving | OK |
| 625 | Submit | "Save" | Add/Edit dialog — create/update buyer | OK |
| 698 | Secondary/Outline | "Cancel" | Import-preview modal — close without importing | OK |
| 699-708 | Primary | "Import N buyer(s)" | Import-preview modal — confirms bulk CSV import | OK |

### CmsPageView.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 106-109 | Secondary/Outline | "Go Back" | "Page not found" state | OK |
| 121-124 | Ghost | "Back" | Header back | OK |
| 126 | Navigation (div) | Logo + "BillingTool" | Navigates to landing | OK |
| 138-149 | Secondary/Outline | "Edit" | Admin edit-mode — jumps to CMS editor for this page | OK |
| 153-161 | Secondary/Outline (destructive color) | "Delete" | Admin edit-mode — starts inline delete confirmation | OK |
| 165-171 | Destructive | "Yes, delete" / "Deleting…" | Confirms permanent page deletion | OK |
| 172-177 | Secondary | "Cancel" | Cancels inline delete confirmation | OK |

### CookiePolicy.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 32-37 | Navigation (logo) | "BillingTool" | Header logo → back | OK |
| 40-43 | Ghost | "Back" | Header back | OK |
| 84-87 | Link/Navigation | "Impressum" / "Privacy" / "Terms" / "Cookies" (active) | Footer legal nav | OK — "Cookies" correctly highlighted as current page |

### Dashboard.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 210-217 | Primary | "New Invoice" | Header CTA — `onNewInvoice()` | OK |
| 222-235 | Navigation (Card) | "Total Invoices" stat card | Navigates to invoices list | Only 1 of 4 stat cards is clickable (Paid/Pending/Overdue aren't) — inconsistent |
| 365-379 | Secondary/Outline | "Create Invoice" | Quick Actions — same `onNewInvoice()` as header | Duplicate action, different label ("Create Invoice" vs header's "New Invoice") |
| 381-395 | Secondary/Outline | "Import Data" | Quick Actions — opens Import dialog | OK |
| 397-412 | Secondary/Outline | "Validate Batch" | Quick Actions — validates draft invoices | OK |
| 429-434 | Navigation (div) | Recent-invoice row | Opens that invoice | OK |
| 519-527 | Secondary/Outline | "Cancel" | Import dialog footer | OK |
| 528-541 | Primary | "Import" / "Importing…" | Import dialog footer — runs import | OK |

### Impressum.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 51-56 | Navigation (`<a>`) | "BillingTool" logo | Links to root | OK |
| 59-62 | Ghost | "Back" | Header back | OK |
| 144-147 | Link/Navigation | "Impressum" (active) / "Privacy" / "Terms" / "Cookies" | Footer legal nav | OK |

### InvoiceEditor.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 272-275 | Ghost | "Back" | Header back | OK |
| 296-300 | Secondary/Outline | "Load Template" | Opens template dropdown | OK |
| 306-318 | Link (menu item) | Template name | Loads that template's data | OK |
| 380-392 | Submit | "Save Template" / "Save Letter" / "Save Draft" (context-dependent) | Saves current doc | Label correctly adapts to mode |
| 401-404 | Secondary/Outline | "Validate" | Runs EN 16931 validation | OK |
| 405-408 | Secondary/Outline | "Preview" | Opens invoice preview | OK |
| 409-416 | Secondary/Outline | "Export" | Opens Export modal | OK |
| 643-646 | Primary (small) | "Add Line" | Adds a blank invoice line | OK |
| 659-662 | Primary | "Add First Line" | Empty-state CTA, same handler as above | Different label for the same action depending on empty state |
| 731-733 | Secondary/Outline | "Back" | Bottom actions, duplicate of header Back | OK |
| 734-750 | Submit | "Save Template"/"Save Letter"/"Save Draft" | Bottom duplicate of top Save | OK |

### InvoiceList.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 409-415 | Primary | "New Invoice"/"New Letter" | Header — `onNewInvoice()` | OK |
| 417-423 | Secondary/Outline | "Import File" | Opens bulk-import dialog (invoices only) | OK |
| 499-522 | Secondary/Outline | Date value / "Select date" (×2) | Custom date-range filter popovers | OK |
| 536-547 | Secondary/Outline | "Clear" | Clears custom date range | OK |
| 575-583 | Secondary/Outline | "Change Status" | Bulk-actions bar | OK |
| 584-592 | Secondary/Outline | "Export Selected" | Bulk-actions bar | OK |
| 593-601 | Secondary/Outline (destructive) | "Delete Selected" | Bulk-actions bar | OK |
| 717-737 | Secondary/Outline, Icon-only | ChevronLeft/Right, `aria-label="Previous/Next page"` | Table pagination | OK — has aria-label |
| 793-816 | Secondary/Outline | "CSV Template" / "JSON Template" / "UBL XML Template" | Import dialog — download templates | OK |
| 832-858 | Secondary/Outline + Primary | "Cancel" / "Import File"/"Validating…" | Import dialog footer | OK |
| 898-904 | Secondary/Outline + Primary | "Cancel" / "Export N Invoices/Letters" | Export-format dialog footer | OK |
| 957-966 | Secondary/Outline + Primary | "Cancel" / "Update Status" | Bulk status-change dialog footer | OK |
| 1014-1019 | Link | Invoice/letter number | Opens editor/viewer | OK |
| 1041-1049 | Ghost/Icon-only | MoreVertical, `aria-label="Actions for {invoiceNumber}"` | Row actions menu trigger | OK — has aria-label |
| 1046-1075 | Link/Destructive (menu items) | "View" / "Edit" / "Duplicate" / "Share (copy link)" / "Export" / "Delete" | Row actions menu | OK |

### InvoicePreview.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 599-601 | Ghost/Icon-only (destructive) | Trash icon | Removes a line item (edit mode) | No aria-label — accessibility gap |
| 611-614 | Secondary/Outline (dashed) | "Add Line Item" | Adds a blank line | OK |
| 964-967 | Secondary/Outline | "Back" | Sticky header back | OK |
| 1000-1007 | Primary | "Save" / "Saving..." | Saves invoice | OK |
| 1043-1056 | Toggle/Tab | "Web View" / "Print View" | Switches PDF preview rendering mode | OK |
| 1058-1065 | Secondary/Outline + Primary | "Download PDF" / "Pixel-Perfect PDF" | Two distinct PDF download variants | OK — labels distinct enough |
| 1069-1076 | Secondary/Outline + Primary | "Copy XML" / "Download UBL XML" | UBL tab actions | OK |

### LandingPage.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 234-246 | Ghost/Navigation | "About Us" / "Products" / CMS nav items | Desktop nav | OK |
| 252-259 | Secondary/Outline | "← Back to Admin Portal" | Admin-authenticated only | OK |
| 262-267 | Ghost + Primary | "Login" / "Sign up" | Desktop actions | OK |
| 276-283 | Ghost/Icon-only | Menu/X icon, `aria-label="Toggle menu"` | Mobile hamburger | OK — has aria-label |
| 291-328 | Link/Navigation | "About Us" / "Products" / "Admin Portal" / "Login" / "Sign up" | Mobile menu equivalents | OK |
| 373-388 | Primary + Secondary/Outline | "Get Started" / "Try it now" | Hero CTAs | OK |
| 631-753 | Primary/Outline | "Get Started" / "Contact Sales" (×3 more instances) | Pricing card, bottom CTA | OK — consistent reuse of the same label for the same action |
| 785-824 | Link/Navigation | CMS nav label / "Impressum" / "Privacy" / "Terms" / "Cookies" | Footer | OK |

### LetterEditor.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 100-103 | Ghost | "Back" | Header back | OK |
| 138-141 | Submit | "Save Letter" | Saves letter (auto-creates Buyer if new) | OK |
| 147-150 | Secondary/Outline | "Preview" | Opens preview | OK |

### LetterList.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 122-125 | Primary | "New Letter" | Header — `onNewLetter()` | OK |
| 177-181 | Destructive + Ghost | "Delete Selected" / "Clear" | Bulk-actions bar | OK |
| 250-255 | Secondary/Outline, Icon-only | ChevronLeft / ChevronRight | Pagination | No aria-label — accessibility gap |
| 291-293 | Link | Letter number | Opens viewer | OK |
| 305 | Ghost/Icon-only | MoreVertical | Row actions menu trigger | No aria-label — inconsistent with InvoiceList's equivalent button, which has one |
| 308-319 | Link/Destructive (menu items) | "View" / "Edit" / "Delete" | Row actions menu | OK |

### LetterPreview.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 280-292 | Secondary/Outline | "Improve with AI" / "Improving…" | Rewrites body text via AI | OK |
| 294-305 | Secondary/Outline + Primary | "Cancel" / "Apply" | Inline rich-text edit toolbar | OK |
| 340-343 | Secondary/Outline | "Back" | Sticky header back | OK |
| 378-389 | Primary | "Save"/"Saving..." / "Download PDF" | Sticky header actions | OK |

### Login.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 162-170 | Ghost | "Back to home" | Top bar | OK |
| 222-243 | Submit + Link | "Send Reset Link"/"Sending..." / "Back to login" | Forgot-password form | OK |
| 279-283 | Link | "Forgot password?" | Enters forgot-password mode | OK |
| 296-307 | Ghost/Icon-only | Eye/EyeOff, `aria-label="Show/Hide password"` | Password visibility toggle | OK — has aria-label |
| 311-317 | Submit | "Sign In"/"Logging in..." | Main login submit | OK |
| 340-357 | Secondary/Outline | "Continue with Google/Microsoft/GitHub/SSO" | SSO login | OK |
| 378-384 | Link | "Sign up" | Footer — `onSignup()` | OK |

### PackageComparison.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 283-286 | Ghost | "Back" | Header back | OK |
| 351-357 | Primary | "Get Started" | Per-plan column — `onSignup(plan.id)` | OK |

### PrivacyPolicy.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 37-48 | Navigation + Ghost | "BillingTool" logo / "Back" | Header | OK |
| 89-92 | Link/Navigation | "Impressum" / "Privacy" (active) / "Terms" / "Cookies" | Footer legal nav | OK |

### QuickAccessInvoice.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 429-437 | Navigation | "BillingTool" + "Quick Access" badge | Header logo → landing | OK |
| 463-473 | Secondary/Outline | "Guide" / "Login" | Header actions | OK |
| 492-501 | Secondary/Outline | "PDF" | Validates then gates "download" action | OK |
| 502-513 | Secondary/Outline | "eInvoice" | Opens UBL XML preview (not gated) | Not gated like sibling Download/Send/Save buttons — asymmetry worth a UX check |
| 514-523 | Secondary/Outline | "Send" | Validates then gates "send" action | OK |
| 524-532 | Primary | "Save Draft" | Validates then gates "save" action | OK — but see note below re: duplicate save CTAs |
| 828-836 | Ghost/Icon-only (destructive) | Trash icon | Removes a line item | No aria-label — accessibility gap |
| 843-851 | Secondary/Outline (dashed) | "Add Line Item" | Adds a blank line | OK |
| 898-906 | Primary (large) | "Save Invoice"/"Saving…" | Bottom CTA — same `triggerGatedAction('save')` as "Save Draft" | 3rd differently-labeled save CTA on this screen (also see guide-panel CTA below) |
| 1019-1024 | Link/Primary | Guide-panel CTA text | Same "save" handler as above | 3rd variant label for the identical save action |

### QuickAccessTour.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 307-309 | Ghost/Icon-only | X icon | Closes/completes the tour | No aria-label — accessibility gap |
| 326-334 | Ghost/Icon-only | ChevronLeft | Previous tour step | No aria-label |
| 335-342 | Primary | "Next" / "Finish" | Advances or completes tour | OK |

### ResetPassword.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 79-119 | Ghost/Icon-only (×2) | Eye/EyeOff | Password/Confirm-password visibility toggles | No aria-label — inconsistent with Login.tsx's equivalent, which has one |
| 124-137 | Submit | "Reset Password"/"Resetting..." | Main form submit | OK |
| 142-150 | Link | "Back to login" | Below form | OK |

### Settings.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 50-67 | Secondary/Outline + Ghost | "Change {Logo/Signature}" / "Remove" / "Upload {Logo/Signature}" | Company profile image fields | OK |
| 655-690 | Secondary/Outline | "Disconnect" / "Connect {Provider}" | SSO — Connected Accounts | OK |
| 807-809 | Secondary/Outline | "Open" | Opens SP metadata URL in new tab | Translation key is `downloadMetadata` but the button opens, not downloads — visible label is still accurate, just an internal key/intent mismatch |
| 828-846 | Secondary/Outline | "Test" | Tests OIDC discovery endpoint | OK |
| 872-888 | Primary | "Save SSO Settings" | Persists SSO config | OK |
| 952-954 | Submit (large) | "Save Settings" | Page-level save | Shares the same i18n key `settings.saveChanges` as the SSO tab's "Save SSO Settings" — harmless since tabs are mutually exclusive |

### SharedInvoiceView.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 133-135 | Secondary/Outline | "Go to BillingTool" | Error state — navigates to root | OK |
| 153-176 | Secondary/Outline + Primary | "Download PDF" / "Pixel-Perfect PDF" | Top bar PDF downloads | OK |

### Signup.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 237-338 | Navigation | "BillingTool" logo (×2) / "Back to home" / "Log in" | Branding panel + top nav | OK |
| 494-500 | Ghost/Icon-only | Eye/EyeOff | Password visibility toggle | No aria-label — inconsistent with Login.tsx |
| 508-519 | Submit | "Get Started"/"Creating account…" | Signup form submit | OK |
| 560-576 | Submit | "Verify"/"Verifying…" | Email-verification submit | OK |
| 582-605 | Link | "Resend code" / "Back to registration" | Email-verification screen | OK |

### TemplateLibrary.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 151-154 | Primary | "New Template" | Header — `onNewTemplate()` | OK |
| 159-186 | Toggle/Tab | "Invoices" / "Business Letters" + count badges | Type-filter tabs | OK |
| 194-197 | Primary | "New Template" | Empty-state CTA, duplicate of header | OK — acceptable empty-state pattern |
| 256-258 | Primary | "Use Template" | `onSelectTemplate()` | OK |
| 261-284 | Secondary/Outline, Icon-only | Layout / Edit / Trash icons, each with `title` | Template card actions | OK — all have title |

### TenantHome.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 109-117 | Ghost/Icon-only | Activity icon, `aria-label="Activity feed"` | Navigates to Activity screen | OK |
| 119-127 | Ghost/Icon-only | Bell icon, `aria-label="Support tickets"` | Opens support ticket flow | **Label/behavior mismatch**: Bell icon conventionally implies notifications, but this opens Support Tickets (confirmed by its own aria-label) |
| 129-145 | Primary | "+ New" | `onNewInvoice()` — creates an invoice only | `aria-label="Create new document"` is generic/implies any doc type, but it only creates an invoice |

### TermsAndConditions.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 39-50 | Navigation + Ghost | "BillingTool" logo / "Back" | Header | OK |
| 91-94 | Link/Navigation | "Impressum" / "Privacy" / "Terms" (active) / "Cookies" | Footer legal nav | OK |

### Workspace.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 390-422 | Secondary/Outline + Primary | "Refresh" / "New Folder" / "Upload Files"/"Uploading N%" | Header actions | OK |
| 424-427 | Secondary/Outline | "AI history" | Navigates to AI History screen | OK |
| 449-451 | Ghost/Icon-only | Home icon | Breadcrumb — `handleGoHome()` | No aria-label — accessibility gap |
| 455-462 | Ghost | Folder path segment | Breadcrumb navigation | OK |
| 473-480 | Secondary/Outline + Destructive | "Download ZIP" / "Delete" | Shown when items selected | OK |
| 487-505 | Toggle/Tab | "Standard Search" / "AI Search" | Search-mode switch | OK |
| 528-535 | Primary | "Ask AI" | Runs AI natural-language search | OK |
| 620-622 | Ghost/Icon-only | MoreVertical | Row actions menu trigger | No aria-label — accessibility gap |
| 626-665 | Link/Destructive (menu items) | "Download" / "Extract zip file here" / "Extract zip to folder" / "Extract and delete zip" / "Extract to folder and delete zip" / "Rename" / "Delete" | Row actions menu | OK |
| 694-735 | Secondary/Outline + Primary | "Cancel"/"Create Folder", "Cancel"/"Rename" | New-folder / Rename dialogs | OK |

---

## 2. Admin Screens

`src/components/screens/Admin/*.tsx` (22 files). `SAMenus.tsx` is a pure redirect stub with no interactive elements and is omitted.

### AdminLayout.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 81-92 | Toggle/Tab | "Users" / "Roles" / "Company Types" | Switches Admin main tab | OK |

### CompanyTypeList.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 26 | Link | "Settings → Company Profile" | Intends to send user to Settings → Company Profile | `href="#settings"` lacks the app's `#/...` hash-route convention used elsewhere — likely a no-op fragment link |

### RoleForm.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 88-90 | Ghost | "Back" | Returns to Role list without saving | OK |
| 111-125 | Toggle (clickable `<div>`) | Checkbox icon + permission name | Toggles a permission on/off | Not a real button/checkbox — no keyboard focus/activation, no `role="checkbox"`. Accessibility gap. |
| 130-131 | Secondary/Outline + Primary | "Cancel" / "Save" | Form footer | OK |

### RoleList.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 90 | Primary | "New Role" | Opens Create Role form | OK |
| 118-119 | Ghost/Icon-only + Destructive | Pencil / Trash2 icon | Edit / delete that role (delete confirms via `confirm()`) | No aria-label on either — accessibility gap |

### SAASusers.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 92 | Secondary/Outline | "Export CSV" | Downloads filtered user list | OK |
| 200-212 | Ghost | SAML provider badge, `title="Click to view SSO config summary"` | Opens SSO config summary | OK — has title |
| 219-225 | Ghost/Icon-only | Eye icon | Navigates to user details | No aria-label — accessibility gap |
| 226-237 | Ghost/Icon-only | Key icon, `title="Reset Password to password123"` | Resets that admin's password (confirm dialog) | OK — has title |
| 238-245 | Ghost/Icon-only, Destructive | UserX icon | Suspends an active user | No aria-label, **and no confirmation dialog** before a destructive account action |
| 246-253 | Ghost/Icon-only | UserCheck icon | Reactivates a suspended user | No aria-label — accessibility gap |
| 268-286 | Secondary/Outline | "Previous" / "Next" | Pagination | OK |

### SAbilling.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 286-293 | Ghost | Download icon + "PDF" | Generates/downloads that invoice's PDF | OK |
| 309-324 | Secondary/Outline | "Previous" / "Next" | Pagination | OK |

### SACompanyTypes.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 90-92 | Primary | "Add Type" | Opens create-type dialog | OK — see cross-screen verb-consistency note below |
| 115-120 | Ghost/Icon-only + Destructive | Pencil / Trash2 icon | Edit / delete (confirms via `confirm()`) | No aria-label on either — accessibility gap |
| 149-150 | Ghost + Primary/Submit | "Cancel" / "Save" | Create/Edit dialog | OK |

### SAdashboard.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 27-30 | Primary | "Add Package" | Navigates to Packages **list**, not a create form | Label implies immediate creation; lands on a list screen instead |
| 31-34 | Secondary/Outline | "Add User" | Navigates to Users **list**, not a create form | Same mismatch as above |
| 35-38 | Secondary/Outline | "Generate Invoice" | Navigates directly to the invoice create form | OK — unlike the two above, this one does land on a create form |
| 43-74 | N/A (renders `StatsCard`) | "Total Users" / "Active Subscriptions" / "Monthly Revenue" / "API Calls" | Stat tiles, each navigates on click | See `admin/StatsCard.tsx` in §4 |

### SAInvoiceForm.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 90-92 | Ghost/Icon-only | ArrowLeft icon | Back to dashboard | No aria-label — accessibility gap |
| 141-144 | Secondary/Outline | "Add Item" | Adds a blank line item | OK |
| 191-199 | Ghost/Icon-only, Destructive | Trash2 icon | Removes that line item | No aria-label — accessibility gap |
| 229-244 | Secondary/Outline + Primary/Submit | "Cancel" / "Generate Invoice"/"Generating…" | Form footer | OK |

### SALogin.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 52-59 | Link | "Back to Home" | Admin login page | OK |
| 126-135 | Primary/Submit | "Sign In"/"Signing in…" | Authenticates admin | OK |

### SAPackageForm.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 141-156 | Ghost/Icon-only (×2) | ArrowLeft icon | Back to Packages (loading + loaded states) | No aria-label on either — accessibility gap |
| 347-355 | Ghost/Icon-only, Destructive | X icon | Removes a custom feature | No aria-label — accessibility gap |
| 362-365 | Secondary/Outline | "Add Custom Feature" | Adds a blank feature row | OK |
| 375-381 | Secondary/Outline + Primary/Submit | "Cancel" / "Update Package"/"Create Package" | Form footer | OK |

### SAPackageServices.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 221-224 | Secondary/Outline + Primary/Submit | "Cancel" / "Save Changes"/"Create Service" | Service create/edit form | OK |
| 236-238 | Ghost/Icon-only | ArrowLeft icon | Back to Packages | No aria-label — accessibility gap |
| 254-268 | Toggle/Icon-only (×2) | List icon / LayoutGrid icon | View-mode toggle (list vs grid) | Neither has aria-label — accessibility gap |
| 272-275 | Primary | "Add Service Column" | Opens create-service form | OK |
| 341-362 | Secondary/Outline (×2) | "Edit" / "Delete" (styled red) | Grid-view card actions | Delete uses `variant="outline"` + manual red classes instead of `variant="destructive"`, and is styled differently from the list-view Delete for the same action |
| 430-449 | Ghost/Icon-only (×2) | Edit / Trash2, both `title` | List-view row actions | OK — has titles, but see grid-view styling inconsistency above |
| 493-528 | Secondary/Outline, Icon+sr-only (×4) | ChevronsLeft/Left/Right/Right, sr-only labels | Pagination (first/prev/next/last) | OK — good use of `sr-only` text |

### SApackages.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 172-178 | Primary | "Add Package" | Navigates to `SAPackageForm` (create) | OK — matches actual behavior, unlike Dashboard's "Add Package" |
| 200-221 | Ghost/Icon-only (×2) | Edit / Trash2 icon | Edit / delete that package (confirm dialog) | Neither has aria-label — accessibility gap |
| 342-349 | Secondary/Outline | "Set Default" | Marks package as default/trailing plan | OK |
| 400-408 | Secondary/Outline | "Add New Service" | Navigates to Package Services **list**, not directly a create form | Same navigation-labeled-as-action pattern as Dashboard's "Add Package"/"Add User" |
| 427 | Secondary/Outline | "Clear Search" | Empty-state — clears search query | OK |

### SAPages.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 75-83 | Ghost/Icon-only | GripVertical (drag handle) | Reorders a nav item | No aria-label; drag handles are a known keyboard/screen-reader gap |
| 447-454 | Toggle | "Navigation" + chevron | Expands/collapses sidebar section | OK |
| 557-565 | Secondary/Outline | "New Page" | Opens "Create New Page" modal | OK |
| 590-598 | Link | "View Live" | Opens the live public page in new tab | OK |
| 600-608 | Secondary/Outline (styled red) | "Delete" | Opens delete confirmation (custom pages only) | Uses `variant="outline"` + manual red classes instead of `variant="destructive"` — same pattern as `SAPackageServices.tsx` |
| 610-634 | Primary/Submit + Toggle/Tab | "Save (EN)"/"Saving…" / language tabs (🇬🇧 English, etc.) | Editor header | OK |
| 703-712 | Ghost | "Clear" | Clears scheduled publish date | Generic label, acceptable given adjacency to the field |
| 882-893 | Secondary/Outline | "Remove" / "Upload OG Image…" | SEO/OG image field | "Remove" only clears the field reference, doesn't delete the uploaded file — could be confused with actual deletion |
| 1016-1029 | Destructive/Icon-only + Ghost (clickable `<div>`) | Trash2 icon / "Click to upload image" | About Us image | Trash2 has no aria-label; the upload trigger is a `<div onClick>`, not a real button — no keyboard support |
| 1061-1104 | Secondary/Outline + Ghost/Icon-only, Destructive | "Add" / Trash2 icon | Testimonials &amp; FAQ sections | "Add" is generic (relies on section heading for context); Trash2 icons have no aria-label |
| 1159-1171 | Secondary/Outline + Primary/Submit | "Media Library" / "Save (EN)"/"Saving…" | Editor footer, duplicate submit of header's Save | OK |
| 1269-1277 | Secondary/Outline + Primary | "Cancel" / "Create Page"/"Creating…" | "Create New Page" modal | OK |

### SAsettings.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 299-301 | Primary/Submit | "Update Company Details"/"Saving…" | Platform Company Details card | OK |
| 337-339 | Primary/Submit | "Save Changes" | Profile Settings card | Generic label, but card header gives clear context |
| 385-387 | Primary/Submit | "Change Password" | Change Password card | OK |
| 403-437 | Primary + Secondary/Outline, Icon-only (×2) | "Generate New Key" / Copy icon / Trash2 icon (red) | API Keys card | Copy and Revoke icons both lack aria-label — accessibility gap |
| 499-519 | Toggle | "Light" / "Dark" / "System" | Theme preference | OK |
| 542-616 | Secondary/Outline + Primary | "Send Test Email"/"Sending…", "Save Telegram Settings"/"Saving…", "Send Test Message"/"Sending…" | Test Email / Telegram cards | OK |
| 632-635 | Secondary/Outline | "Run Check"/"Refresh" | System Health card | OK |
| 679-714 | Secondary/Outline (×2) | "Run Pending Migrations" / "Run Default Seeder" | Database Management | "Run Pending Migrations" has **no confirmation dialog** before a risky DB operation, while the Seeder button right below it does confirm — inconsistent safety pattern |

### SATicketDetails.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 108-125 | Ghost | "Back to Tickets" (×2) | Not-found state + header, both back to Tickets list | OK |
| 230-238 | Primary | "Save Changes" | Saves status/priority/assignee/comment update | OK |
| 327-336 | Link | "View Full Size" | Opens screenshot in new tab | OK |
| 366-373 | Link/Icon-only | ExternalLink icon | Opens that attachment in new tab | The `<a>` itself has no accessible text (icon-only); filename is a sibling element, not inside the link — accessibility gap |

### SATickets.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 151-177 | Secondary/Outline + Ghost | "Mark Resolved" / "Mark Closed" / "Clear Selection" | Bulk action bar | OK |
| 225-229 | Navigation (clickable row) | Entire table row | Navigates to ticket details | Not a `<button>` but works alongside an explicit "View Details" button on the same row — good for discoverability |
| 274-299 | Link + Ghost | "View" (opens screenshot) / "View Details" (opens ticket page) | Same row, two similarly-worded but different actions | Mild potential for confusion between "View" and "View Details" |
| 337-357 | Secondary/Outline | "Previous" / "Next" | Pagination | OK |

### SAusage.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 143-145 | Secondary/Outline, Icon-only | Download icon, `title="Export CSV"` | Exports usage metrics CSV | OK — has title |
| 151-176 | N/A (renders `StatsCard`) | "API Calls" / "Storage Used" / "Bandwidth" / "Active Sessions" | Purely informational, no onClick | — |
| 368-375 | Ghost | "View" | Navigates to tenant's user details | OK |

### SAUserDetails.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 100-208 | Ghost/Icon-only (×3) | ArrowLeft icon | Back to Users list (loading / not-found / loaded states) | None have aria-label — accessibility gap |
| 215-226 | Secondary/Outline | "Reset Password" | Resets tenant admin password (confirm dialog) | OK |
| 227-230 | Secondary/Outline | "Send Reminder" | Intended to send a payment reminder | **Misleading: only shows a success toast, makes no actual API call** — nothing is sent |
| 232-240 | Secondary/Outline | "Suspend" / "Activate" | Suspends/reactivates this user | "Suspend" has **no confirmation dialog**, inconsistent with other destructive actions elsewhere (e.g. API-key revoke) that do confirm |
| 317-320 | Secondary/Outline | "Export All" | Invoice History card header | **Dead button — no `onClick` handler at all** |
| 350-352 | Ghost/Icon-only | Download icon | Downloads that invoice's PDF | No aria-label — accessibility gap |

### UserForm.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 102-104 | Ghost | "Back" | Returns to User list | OK |
| 142-155 | Toggle (clickable `<div>`) | Checkbox icon + role name | Toggles a role assignment | Not a real button/checkbox — same accessibility gap as RoleForm's permission list |
| 161-162 | Secondary/Outline + Primary | "Cancel" / "Save" or "Add User" | Form footer | OK |

### UserList.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 45-47 | Primary | "Add User" | Opens Create User form | OK |
| 80-82 | Ghost/Icon-only | Pencil icon | Opens Edit User form | No aria-label. Also: this list has **no delete action at all**, unlike sibling RoleList/SACompanyTypes which have both Edit and Delete |

### SAWiki.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 302-317 | Ghost/Icon-only (×4, all with `title`) | FolderPlus / Upload / Pencil / Trash2 | Folder row actions (new subfolder, upload, rename, delete) | OK — all have title |
| 337-344 | Secondary + Ghost/Icon-only | "Add" / X icon | Inline new-subfolder input confirm/cancel | "Add" is generic; X icon has no aria-label |
| 394-404 | Ghost/Icon-only (×3, all with `title`) | ExternalLink / Pencil / Trash2 | File row actions | OK |
| 419-433 | Secondary + Primary | "Folder" / "Upload"/"…" | Mockups toolbar, root-level actions | OK |
| 453-459 | Secondary + Ghost/Icon-only | "Add" / X icon | Root-level new-folder input | Same generic "Add" / missing aria-label pattern as above |
| 493-503 | Primary + Ghost/Icon-only | "New Tab" / X icon | Preview panel open/close | X icon has no aria-label |
| 972-995 | Toggle/Tab | "Documentation" / "Mockups" | Wiki top-level tabs | OK |
| 811-843 | Toggle + Navigation | Folder expand/collapse, document selection | Docs sidebar tree | OK |
| 1013-1054 | Primary (×2) + Secondary | "New" (new document), "Create"/"Creating…", "Cancel" | New-document flow | OK |
| 1094-1127 | Primary + Secondary (×2) | "Save"/"Saving…" / "Cancel" / "Edit" / "Export PDF" | Content header actions | OK — all have title where icon-only |
| 1140-1189 | Ghost/Icon-only (many, all with `title`) | Bold, Italic, H1-H3, List, Quote, Code, Link, Table, HR, Diagram, Guide | Markdown editor toolbar | OK — every toolbar button has a title |

**Cross-screen observations (Admin):**
- **"Create new record" verb inconsistency**: "New Role", "Add Type", "Add User", "Add Package", "New Page" — no single consistent verb ("Add X" vs "New X") across sibling CRUD screens.
- **Destructive button styling inconsistency**: some use `variant="outline"` + manual red classes (`SAPackageServices.tsx` grid view, `SAPages.tsx`), others use `variant="ghost"` with red icon coloring (`RoleList.tsx`, `SACompanyTypes.tsx`, `SApackages.tsx`) — no single destructive pattern.
- **Missing delete affordance**: `UserList.tsx` has Edit but no Delete, while `RoleList.tsx`/`SACompanyTypes.tsx` have both for equivalent record types.
- **Icon-only buttons without aria-label/title** is the single most common accessibility gap in this slice — present on nearly every Edit/Delete/View/Suspend/Activate/Back-arrow icon button, with `SAWiki.tsx` and `SAASusers.tsx`'s reset-password/export as the main exceptions that consistently use `title`.
- **Two real functional bugs**: `SAUserDetails.tsx` "Export All" has no `onClick` at all; its "Send Reminder" only shows a toast with no backing API call.
- **Navigation mislabeled as direct action**: "Add Package"/"Add User" (`SAdashboard.tsx`) and "Add New Service" (`SApackages.tsx`) all just navigate to a list screen, unlike "Generate Invoice" on the same dashboard which lands directly on a create form.

---

## 3. WorkHub Module

`src/components/screens/WorkHub/*.tsx` and `src/pages/WorkHub/*.tsx`.

### KanbanBoard.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 177 | Primary (custom) | "+ New Task" | Toolbar — opens `NewTaskModal` | OK |
| 231 | Secondary/Outline (dashed) | "+ New Task" | "Open" column footer — same modal | Duplicate entry point for the identical action as the toolbar button — acceptable, just noting the dup |
| 338 | Ghost/Icon-only | ExternalLink icon, `title="View task details"` | Kanban card header — opens TaskDetail | OK — has title |
| 538 | Secondary/Outline (custom, per-column color) | "▶ Start task" / "✓ End task" / "→ Move to {status}" | Card footer — status transition only (`taskService.update`) | **Label/behavior risk**: "▶ Start task" strongly implies starting the *timer*, but this only moves Kanban status — it never calls `timerService.start`. Naming collision with TaskDetail's real "Start Timer" button. |

Inline-editable title/priority/project/worker fields on the card are click-to-edit, not standalone action buttons — noted for completeness, not counted.

### TimerWidget.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 179 | Link-style | Task title text | Header — `onViewTask(activeTaskId)` | OK, though not visually obvious as clickable |
| 253 | Secondary/Outline | "☕ Break" | Running state — `timerService.pause()` | OK |
| 261-279 | Destructive (×2) | "■ Stop" | Running and break states — `timerService.stop()` | OK — consistent label across both states |
| 272 | Primary (custom green) | "▶ End Break" | Break state — actually calls `timerService.start()`/`timer.resume()` | Semantically fine ("ending break" = "resuming work") but phrasing isn't shared with KanbanBoard's differently-behaving "Start task" |

### TimerPip.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 43 | Link-style | Elapsed time readout | Floating pip — `onViewTask()` | No aria-label/title |
| 49 | Ghost/Icon-only | ExternalLink icon, `title="Open task"` | Floating pip — same `onViewTask()` as above | Duplicate action via two adjacent controls; minor redundancy |
| 56 | Ghost/Icon-only (destructive) | Square icon, `title="Stop timer"` | Floating pip — `timerService.stop()` | OK — has title. No separate "Break" option here (reduced vs TimerWidget), a design choice not a naming bug |

### TaskDetail.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 57, 78 | Ghost/Icon-only (×2) | ArrowLeft icon | Back to task list (loading + loaded states) | Neither has aria-label/title — accessibility gap |
| 84 | Secondary/Outline | "Edit" | Opens `TaskEditModal` | OK |
| 199 | Primary (custom green) | "Start Timer" | The *real* timer-start action — `timerService.start(taskId)` | This is the genuine "Start Timer"; contrast with KanbanBoard's status-only "Start task" — naming collision risk flagged there |
| 210 | Secondary/Outline | "Done Report" | Opens `DoneReportModal` | OK |

### AICorrectField.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 75 | Secondary/Outline | "Correct with AI" | Fetches AI suggestions for completion note | OK |
| 97, 100 | Secondary/Outline + Primary | "Reject all" / "Accept all" | AI diff panel bulk actions | OK |
| 113, 128 | Ghost/Icon-only (×2, both `title`) | Check / X icon | Per-row accept/reject | OK — has title |

### BatchLocationPanel.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 45 | Toggle (disclosure) | "Also at {locationTag}" + count | Toggles co-located tasks panel | OK |
| 72 | Secondary/Outline | "View" | Navigates to that co-located task | OK |

### DoneReportModal.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 295 | Toggle/Segmented | "No copy" / "Email" / "SMS" / "WhatsApp" / "Telegram" | Completion-channel selector ("SMS"/"WhatsApp" disabled/"coming soon") | Disabled options still render fully clickable-looking — could read as "just unselected" rather than unavailable |
| 352-375 | Secondary/Outline + Ghost + Primary + Submit | "Back" / "Cancel" / "Next" / "Submit Done Report" | Multi-step footer nav | OK |

### FinanceTable.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 281 | Ghost/Icon-only | ExternalLink icon | Opens that task's detail | No aria-label/title — accessibility gap |

### MaterialsTable.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 85 | Ghost/Icon-only | Trash2 icon | Deletes a material row (unrecoverable) | No aria-label/title on a destructive action — accessibility gap, consider `variant="destructive"` too |
| 99 | Secondary/Outline | "Add row" | Adds a blank material row | OK |

### NewTaskModal.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 212-213 | Secondary/Outline + Primary | "Cancel" / "Assign Worker" | Step 1 footer — advances to step 2, doesn't create yet | OK — accurately describes the next step |
| 239-253 | Toggle (selectable card) | "Unassigned" / worker name + utilisation | Step 2 worker picker | OK |
| 285-288 | Secondary/Outline + Submit/Primary | "Back" / "Create Task" | Step 2 footer | OK |

### PhotoUploadGrid.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 26 | Ghost/Icon-only | X icon | Removes an uploaded photo | No aria-label/title — accessibility gap |
| 90-101 | Secondary/Outline (×2) | "Camera" / "Upload" | Jobsite photos toolbar | OK |
| 155 | Secondary/Outline | "Upload" | Identity photo section, ad-hoc `document.createElement('input')` pattern | Functionally fine but implemented inconsistently vs. the `useRef` pattern used two blocks above — maintainability note, not a labeling one |

### ProjectModal.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 150 | Toggle (swatch) | Colour swatch, no label | Colour picker | No aria-label/title describing the colour — accessibility gap |
| 177-178 | Secondary/Outline + Primary | "Cancel" / "Save"/"Create" | Footer | OK |

### SignaturePad.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 158-161 | Secondary/Outline + Primary | "Clear" / "Done" | Pre-signing controls | OK |
| 171 | Ghost | "Re-signi" | Post-signing — same `handleClear()` as "Clear" above | Same function, different label depending on signed state — intentional/contextual, reads fine |

### TaskDocumentsTab.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 123, 131 | Ghost/Icon-only (×2, both `title`) | Download icon "Download" / RefreshCw icon "Re-generate" | Same document row | Both call the same underlying `printService.generate` with slightly different post-actions — "Download" implies a stored file but it actually regenerates every time |
| 142 | Secondary/Outline | "Generate PDF"/"Generating…" | When doc not yet generated | OK |

### TaskEditModal.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 237-255 | Toggle (selectable card) | "Unassigned" / worker name | Worker-assignment grid | OK |
| 294-295 | Secondary/Outline + Primary | "Cancel" / "Save Changes" | Footer | OK |

### TaskList.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 112 | Ghost/Icon-only | X icon | Clears search input | No aria-label/title |
| 121 | Primary | "New" | Toolbar — opens `NewTaskModal` | Labeled "New" here vs "New Task" elsewhere in the same file (line 289) for the identical action |
| 265, 294 | Link/Secondary | "Clear filters" (×2) | Filter summary row + empty-state, same handler | Duplicated across two locations under different visibility conditions — not a bug |
| 289 | Secondary/Outline | "New Task" | Empty-state — same modal as line 121's "New" | See inconsistency noted at line 121 |
| 308 | Primary/Navigation (card) | Full task card | Opens TaskDetail | Whole-card-as-button, no explicit "open" label — acceptable pattern |

### WorkHubDesktopLayout.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 150 | Ghost/Icon-only | FolderPlus icon, `title="New project"` | Sidebar header — opens New Project modal | OK |
| 158 | Ghost/Icon-only | Chevron icon, `aria-label` expand/collapse | Sidebar collapse toggle | OK |
| 174-198 | Navigation | "All Tasks" / project name + count | Sidebar project list | OK |
| 231-245 | Ghost/Icon-only (×2, both titled) | Pencil "Edit project" / Trash2 "Delete project" (two-step confirm) | Hover overlay per project row | OK — has title+aria-label |
| 269 | Secondary/Outline (dashed) | "New Project" | Below list — same `onAdd()` as the header icon | Duplicate entry point, intentional |
| 351 (×4 via `NavBtn`) | Navigation | "Timer" / "Reports" / "Inbox" / "Profile" | Sidebar footer panel switches | OK |

### WorkHubGate.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 52 | Primary | "Upgrade to unlock WorkHub" | Shown when plan doesn't include WorkHub | OK |

### WorkHubMobileNav.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 34 | Navigation/Toggle-Tab | "Tasks" / "Timer" / "Reports" / "Inbox" / "Profile" | Mobile bottom tab bar | OK |

### WorkHubQuickActions.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 47 | Ghost/Icon-only | X icon | Closes flyout panel | No aria-label/title |
| 51-59 | Navigation | "New Task" | Calls `onNewTask?.()` then navigates | OK, assuming caller wires `onNewTask` correctly |
| 52 | Navigation | "Open Inbox" | Only navigates to WorkHub generally, does not deep-link to Inbox tab | Label overstates precision — lands on WorkHub's default view, not necessarily Inbox |
| 52 | Navigation | "Start Timer" | Only calls `onNavigate('workhub')`, identical to "Open Inbox"'s handler | **Label/behavior mismatch**: does not start any timer despite the label — no `timerService.start` call, unlike the real Start Timer in `TaskDetail.tsx` |
| 70 | Ghost/Icon-only | Briefcase/ChevronUp, `title="WorkHub quick actions"` | Dock trigger | OK |

### WorkHubInbox.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 99 | Ghost/Icon-only | CheckCheck icon, `title="Mark all read"` | Marks all unread as read | OK — has title |
| 150 | Navigation (row) | Message row | Opens/selects that message | OK |
| 200 | Ghost | "← Back" | Mobile — returns to message list | OK |

### WorkHubProfile.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 172 | Secondary/Outline | "Reset to Auto" | Clears a role override | OK |
| 289 | Secondary/Outline | "Upload identity photo"/"Replace identity photo" | Identity Photo card | OK — label correctly reflects add vs replace |
| 316 | Secondary/Outline | "Download My Data" | GDPR export | OK |
| 329 | Primary | "Save Changes"/"Saving…" | Page footer | OK |

### WorkHubSettings.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 174-220 | Secondary/Outline (×3) | "Add Worker" / "Add" / "Cancel" | Workers card | OK |
| 270 | Ghost/Icon-only, Destructive | Trash2/Loader2, `title` (two-step confirm) | Remove worker | OK — has title |
| 411 | Submit/Primary | "Save Settings"/spinner | Page footer | OK |

### WorkHubTimesheet.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 355-364 | Toggle/Tab (×6) | "Week"/"Month"/"Custom", "Daily"/"By Task"/"By Project" | Period + report-view segmented controls | OK |
| 370-374 | Secondary/Outline, Icon-only (×2) | ChevronLeft / ChevronRight | Prev/next period navigation | Neither has aria-label/title — accessibility gap |
| 377 | Secondary/Outline | "Now" | Jumps to current week/month | OK |
| 380 | Secondary/Outline, Icon-only | Download icon, `title="Download PDF"` | Week/month view — downloads timesheet PDF | OK — has title |
| 388 | Primary | "Sign", `title="Sign off this week (EuGH C-55/18)"` | Signs off the week's timesheet | OK |
| 408 | Secondary/Outline, Icon-only | Download icon | Custom-range view — same download action as line 380 | **Missing the `title="Download PDF"` that the equivalent button has in week/month view** — inconsistent accessibility coverage for the identical action |

---

## 4. Shared / Layout / Global Components

Covers `TenantHome/*`, `Dashboard/WorkHubDashboardWidget.tsx`, `components/admin/*` (lowercase), `components/cms/*`, `components/invoice/*`, `components/layout/*`, `FloatingDock.tsx`, `GlobalAIAssistant.tsx`, `HelpChatBot.tsx`, `TicketingWidget.tsx`, `NavDropdown.tsx`, `LanguageSwitcher.tsx`, `ui/RichTextEditor.tsx`, `ui/SearchBar.tsx`. `src/components/screens/Customer/*` does not exist. `App.tsx` is pure composition/routing with no direct buttons.

### TenantHome/WelcomeBanner.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 67-73 | Ghost/Icon-only | X icon, `aria-label="Dismiss welcome banner"` | Dismisses tour banner | OK |
| 97-111 | Primary | "Take the 2-min tour" | Opens `TenantTour` modal | OK |
| 112-117 | Link | "Skip and explore" | Dismisses the banner — same action as the X icon | Duplicate dismiss action with a different label |

### TenantHome/TicketSummaryPanel.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 23-27 | Link | "+ New ticket" | Calls `onNewTicket` | OK |
| 42-47 | Link | "Open a ticket →" | Same `onNewTicket` handler as above | Duplicate/conflicting labels for the identical action in the same panel |

### TenantHome/LaunchTiles.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 157/170 (Billing tile) | Primary + Outline | "+ New invoice" / "My billing" | Creates invoice / navigates to invoices | OK |
| 157/170 (Letter tile) | Primary + Outline | "+ New letter" / "My letters" | Creates letter / navigates to letters | OK |
| 157/170 (Template tile) | Primary + Outline | "+ New template" / "My templates" | Both navigate to templates screen | OK |
| 157/170 (Documents tile) | Primary + Outline | "+ Upload files" / "My workspace" | Both navigate to Workspace — no upload dialog actually opens | "+ Upload files" promises an upload action but just navigates |
| 157/170 (Custom-doc tile) | Primary + Outline | "+ Start blank" / "My documents" | Both navigate to Workspace | "+ Start blank" implies starting a new blank doc but lands on the same file browser as the Documents tile above — 4 buttons across 2 tiles all resolve to the same screen |

### TenantHome/TenantTour.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 172-177 | Ghost/Icon-only | X icon | Closes tour, marks completed | No aria-label/title |
| 194-201 | Ghost/Icon-only | ChevronLeft | Previous tour step | No aria-label |
| 202-209 | Primary | "Next" / "Done" | Advances/finishes tour | OK |

### TenantHome/ActivityPanel.tsx / RecentDocsRow.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| ActivityPanel:49-53 | Link | "See all →" | Navigates to Activity screen | OK |
| RecentDocsRow:61-65 | Link | "See all →" | Prop named `onNavigateLetters`, but per TenantHome's wiring actually navigates to **Invoices** | Row shows both invoices and letters, but "See all" only opens Invoices — mismatched given prop name and mixed row content |
| RecentDocsRow:78-95 | Navigation (×4) | Document name + type label | Opens that document | OK |

### Dashboard/WorkHubDashboardWidget.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 62-69 | Ghost | "Open" + ExternalLink | Navigates to WorkHub | OK |
| 71-73 | Ghost/Icon-only | Raw "×" character (not an icon component) | Dismisses the widget | No aria-label, and uses a literal "×" glyph rather than an icon+label — screen readers read it as a stray character |
| 100-107 | Ghost | "View →" | Same destination as "Open" above | Duplicate navigation target with a different label, shown simultaneously |

### admin/AdminSidebar.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 82-101 | Ghost/Icon-only (×2) | X icon (mobile) / Chevron, `title="Collapse/Expand sidebar"` | Sidebar open/close/collapse | Chevron has title; mobile X doesn't |
| 112-133 | Navigation (×10) | Dashboard, Products, Clients, Billing, Reports, Tickets, Wiki, Company Types, CMS &amp; Navigation, Settings | Admin nav | OK |
| 155-175 | Secondary/Outline (×2) | "Edit Live Site" / "Log out" | Footer actions | OK |
| 178-185 | Outline/Icon-only | LogOut icon only (collapsed state) | Same log out action | No aria-label on icon-only variant |
| 192-198 | Outline/Icon-only | Menu icon (mobile floating) | Toggles mobile sidebar | OK |

### admin/ThemeToggle.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 19-24 | Outline/Icon-only | Sun/Moon/Monitor icon, sr-only "Toggle theme" | Opens theme dropdown | OK — has sr-only text |
| 27-38 | Toggle (menu items) | "Light" / "Dark" / "System" | Sets theme | OK |

### admin/StatsCard.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 39-42 | Ghost (clickable Card) | Dynamic `title`/`value` (e.g. "SaaS Users") | Navigates to the related admin screen when `onClick` is passed | Only a `cursor-pointer` + hover style on a `<Card>` — no button role, no keyboard focus/handler, no aria-label indicating it's clickable |

### cms/CmsMediaLibrary.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 87-96 | Toggle (clickable div) | Image thumbnail | Selects/deselects for insertion | OK |
| 117-142 | Ghost/Icon-only + Destructive (both `title` only) | Pencil "Edit alt text" / Trash2 "Delete" | Per-image actions | Title only, no aria-label |
| 161-202 | Primary + Ghost + Outline + Primary | "Save" / "Cancel" / "Close" / "Insert Selected" | Modal footer actions | OK |

### cms/CmsVersionPanel.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 60-70 | Toggle | "Version History" "Show"/"Hide" | Expands/collapses version list | OK |
| 76-85 | Outline | "Save Snapshot"/"Saving…" | Saves a version snapshot | OK |
| 101-111 | Ghost | "Restore"/"Restoring…" | Restores an old version, **overwrites current content** (confirms via `confirm()`) | Styled as low-emphasis Ghost despite being a destructive/overwriting action |

### cms/EditModeBar.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 42-79 | Navigation + Primary + Destructive | "Admin Portal" / "New Page" / "Exit Edit Mode" / "Edit Page" | CMS edit-mode toolbar | OK |
| 137-143 | Ghost/Icon-only | X icon (modal close) | Closes "Create New Page" modal | No aria-label |
| 186-229 | Toggle + Outline + Primary | "Show in Navigation" switch / "Cancel" / "Create Page"/"Creating…" | Create-page modal | OK — switch has proper `role="switch"`/`aria-checked` |

### cms/InlineEditableRich.tsx / InlineImagePicker.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| InlineEditableRich:94-129 | Primary + Outline | "Save"/"Saving…" / "Cancel" | Rich-text field edit | OK |
| InlineImagePicker:144-162 | Ghost/Icon-only | Camera icon, `aria-label="Change image"` | Opens image upload/URL popover | OK |
| InlineImagePicker:191-234 | Outline + Primary | "Click to choose a file" / "Apply"/"Saving…" | Upload popover actions | OK |

### invoice/AIAssistantChat.tsx

Not imported/rendered anywhere in the app (superseded by `GlobalAIAssistant.tsx`) — orphaned/dead code, listed for completeness only.

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 168-268 | Primary/Icon-only + Ghost/Icon-only ×3 + Submit/Icon-only | Sparkles / Chevron / X / Send icons | Chat launcher &amp; panel controls | None have aria-label/title — moot since the component is unused |

### invoice/ChatMessage.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 102-174 | Primary + Outline (×2 pairs) | "Use This Letter"/"Discard", "Use This Invoice"/"Discard" | Applies or discards AI-parsed data | OK |

### invoice/ExportModal.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 122 | Toggle (×5) | "PDF" / "UBL 2.1 XML" / "Peppol BIS" / "JSON" / "CSV" | Export format selection | OK |
| 209-224 | Outline + Primary | "Cancel" / "Export"/"Exporting…" | Modal footer | OK |

### invoice/InlineQuickAccess.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 257-263 | Ghost/Icon-only | X icon, `aria-label="Dismiss"` | Dismisses banner | OK |
| 302-314 | Submit/Primary + Link | "Continue"/spinner / "Already have an account?" | Email step | **"Already have an account?" has no `onClick` at all** — styled as a clickable link (blue text, pointer cursor) but does nothing |
| 349-362 | Submit + Link | "Verify"/spinner / "Change email" | OTP step | OK |
| 395-431 | Ghost/Icon-only + Submit + Outline | Eye/EyeOff toggle / "Set Password"/spinner / "Skip" | Password step | Eye toggle has no aria-label |

### invoice/LineItemRow.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 60-65 | Ghost/Icon-only | GripVertical, `aria-label="Drag to reorder"` | Intended drag handle for reordering | **Non-functional**: no `onClick`/`onDragStart`/`draggable` wired up — looks like drag-to-reorder but does nothing |
| 128-148 | Ghost/Icon-only + Destructive (both aria-labeled) | Chevron expand/collapse / Trash2 "Delete line X" | Row detail toggle / delete | OK — has aria-label |

### invoice/PartyCard.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 56-71 | Ghost/Icon-only (×3, all aria-labeled) | Pencil "Edit {title}" / Check "Save changes" / X "Cancel editing" | Seller/Buyer card edit controls | OK |
| 111-127 | Outline | "Use Default" | Fills in default seller/buyer | OK |

### invoice/PreviewModal.tsx / TaxSummaryPanel.tsx / TemplateDesignLayout.tsx / TemplateEditor.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| PreviewModal:332-366 | Outline + Primary | "Copy XML" / "Download UBL XML" | UBL export actions | OK |
| TaxSummaryPanel:80-92 | Ghost/Toggle | "UBL mappings" + chevron | Expands field-mapping reference | OK |
| TemplateDesignLayout:162-174 | Ghost + Primary | "Cancel" / "Save" | Layout designer footer | OK |
| TemplateDesignLayout:243-250 | Ghost/Icon-only (×N) | Eye/EyeOff | Per-element visibility toggle | No aria-label |
| TemplateDesignLayout:269-276 | Outline | "Reset Layout" | Resets to default layout | OK |
| TemplateDesignLayout:713-739 | Ghost (×3) | "Out" / Reset Zoom (`title` only) / "In" | Zoom controls | Reset Zoom has title but no aria-label |
| TemplateEditor:287-294 | Destructive/Icon-only | X icon | Removes uploaded template logo | No aria-label on a destructive icon-only action |
| TemplateEditor:310-557 | Outline + Primary | "Upload/Change Logo" / "Design Layout" / "Cancel" / "Save" | Template editor actions | OK |

### layout/AppSidebar.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 173-197 | Navigation (×11) | Home, Dashboard, Manage Files, Buyers, Billing, Invoices, Business Letters, Templates, Activity, WorkHub, Settings | Main app nav | "WorkHub" is visually dimmed with a "Pro" badge when locked, but its `onClick` still fires `onNavigate('workhub')` unconditionally — styled as disabled but functionally isn't |
| 210-223 | Ghost/Toggle | Avatar + name/email + chevron | Opens account dropdown | OK |
| 245-258 | Navigation + Destructive (menu items) | "Account Settings" / "Billing" / "Log out" | Account menu | "Billing" here duplicates the main nav's own "Billing" item — intentional alternate path, not a conflict |
| 264 | Ghost/Icon-only, Toggle | `SidebarRail`, `aria-label="Toggle Sidebar"` | Click/drag to resize sidebar | Has `tabIndex={-1}` — **not reachable via keyboard** |

### FloatingDock.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 93-131 | Ghost/Icon-only, Toggle | MoreVertical/X, `title` + `aria-label` "Show/Hide actions" | Expands/collapses the floating launcher stack | OK — has title, aria-label, and `aria-expanded` |

The individual launchers inside the dock (Support Ticket, AI Assistant, Help bot, Edit Mode) are defined in their own files, catalogued below.

### GlobalAIAssistant.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 328-357 | Primary/Icon-only (FAB) | Sparkles icon, title + aria-label "AI Invoice/Letter Assistant" | Opens AI chat panel | OK |
| 399-420 | Ghost/Icon-only | X icon, `aria-label="Close AI Assistant"` | Closes panel | OK |
| 523-544 | Ghost/Icon-only, Toggle | Mic/MicOff, `title` only | Toggles voice dictation | Title only, no aria-label |
| 545-565 | Submit/Icon-only | Send/Loader2 | Submits AI prompt | No aria-label |

### HelpChatBot.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 162-184 | Primary/Icon-only (FAB) | HelpCircle icon, title + aria-label | Opens FAQ chat bot | OK |
| 220-227 | Ghost/Icon-only (×2, title only) | RotateCcw "restart" / X "close" | Bot header controls | Title only, no aria-label |
| 251-263 | Navigation/Toggle | Quick-reply chip text | Drives FAQ conversation | OK |
| 290-299 | Submit/Icon-only | Send icon, `aria-label` | Submits typed question | OK |

### TicketingWidget.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 381-400 | Primary (FAB) | Icon + optional "Support" label, `title="Report issue (Alt+Shift+S)"` | Opens ticket widget, captures screenshot | OK |
| 438-439 | Outline + Destructive (amber, not red) | "Keep" / "Discard" | Discard-draft warning | "Discard" uses warning-amber rather than typical destructive-red — under-signals an irreversible action |
| 444-455 | Ghost/Icon-only (×2) | Maximize2/Minimize2 (title only) / X (**no title, no aria-label at all**) | Fullscreen toggle / close widget | Close button has zero accessible text |
| 485-519 | Ghost/Icon-only, Toggle (many, title only) | Undo2/Redo2, pencil/eraser/rectangle/circle/arrow/pan tool icons, ×5 color swatches | Screenshot annotation toolbar | Color swatches' `title` is a raw hex code (e.g. "#ef4444") rather than a human-readable name — weak for accessibility |
| 503-507 | Destructive/Icon-only | Trash2, `title="Clear All"` | Clears all annotations | Title only, no aria-label |
| 666-670 | Ghost/Icon-only | X icon | Removes an attachment | No aria-label — screen reader can't tell which file |
| 681-697 | Outline + Primary/Submit | "Cancel" / "Submit Ticket"/"Submitting…" | Widget footer | OK |

### NavDropdown.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 44-51 | Navigation | CMS nav item label | Navigates to a CMS page | OK |
| 86-147 | Toggle (×2) | Parent nav label + chevron | Desktop dropdown / mobile accordion expand | OK — has `aria-haspopup`/`aria-expanded` |

### LanguageSwitcher.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 34-42 | Outline | Flag + language code | Opens language dropdown | OK |
| 46-54 | Toggle (×4) | "English" / "Deutsch" / "العربية" / "Polski" | Switches app language | OK |

### ui/RichTextEditor.tsx (`MenuBar`)

Every toolbar button (Undo, Redo, Bold, Italic, Strikethrough, Inline Code, Underline, Text Color, Highlight, Add Link, Superscript, Subscript, align ×4, List, Ordered List, Blockquote, Code Block, Upload Image, Clear Formatting — ~22 buttons total) relies on `title` only, with **no `aria-label` anywhere in this toolbar** — a systemic accessibility gap worth fixing once at the shared component level. Additionally:
- **Text Color** (line 231-242) and **Add Link** (line 259-268) both use a blocking native `window.prompt()` instead of an in-app UI, inconsistent with the rest of the app's design system.

### ui/SearchBar.tsx

| Line | Type | Label | Context | Notes |
|---|---|---|---|---|
| 22-28 | Ghost/Icon-only | X icon, `aria-label="Clear search"` | Clears search input | OK |

---

## 5. Cross-Cutting Findings

### Real bugs (button does nothing or lies about what it does)

| File | Button | Problem |
|---|---|---|
| `Billing.tsx` | Download icon (payment history row) | No `onClick` handler at all — dead button |
| `Admin/SAUserDetails.tsx` | "Export All" | No `onClick` handler at all — dead button |
| `Admin/SAUserDetails.tsx` | "Send Reminder" | Only shows a success toast, makes no API call — nothing is actually sent |
| `invoice/InlineQuickAccess.tsx` | "Already have an account?" | Styled as a clickable link, no `onClick` at all |
| `invoice/LineItemRow.tsx` | Drag handle (GripVertical) | `aria-label="Drag to reorder"` but no `onDragStart`/`draggable`/`onClick` wired up |
| `WorkHub/KanbanBoard.tsx` | "▶ Start task" | Only changes Kanban status; does not start the timer despite the strongly timer-suggestive label |
| `WorkHubQuickActions.tsx` | "Start Timer" | Only navigates to WorkHub; never calls `timerService.start` |
| `TenantHome.tsx` | Bell icon | Reads as "Notifications" but opens Support Tickets (per its own aria-label) |
| `TenantHome/LaunchTiles.tsx` | "+ Upload files" / "+ Start blank" | Both just navigate to Workspace; no upload dialog or blank-doc flow actually opens |
| `TenantHome/RecentDocsRow.tsx` | "See all →" | Prop named `onNavigateLetters` but wired to navigate to Invoices |
| `Admin/CompanyTypeList.tsx` | "Settings → Company Profile" | `href="#settings"` doesn't follow the app's `#/...` route convention — likely a no-op |

### Label/behavior or naming mismatches (not broken, but misleading)

- **KanbanBoard "Start task" vs TaskDetail "Start Timer"** — two differently-behaving actions with confusingly similar names, in the same module.
- **Settings.tsx "Open" button** — i18n key `settings.saveChanges`... actually `downloadMetadata`, but visible text says "Open" and it does open (not download) — internal-key drift, not user-visible, but worth cleaning up.
- **Admin dashboard "Add Package"/"Add User"** navigate to list screens, not create forms, while "Generate Invoice" on the same dashboard does land on a create form — inconsistent expectation-setting.
- **`SApackages.tsx` "Add New Service"** — same navigation-as-action pattern.

### Same action, inconsistent labels

- "New" (`TaskList.tsx` toolbar) vs "New Task" (`TaskList.tsx` empty state) — same modal, same file.
- "New Invoice" (Dashboard header) vs "Create Invoice" (Dashboard Quick Actions) — same handler.
- "Add Line" vs "Add First Line" (`InvoiceEditor.tsx`) — same handler, empty-state variant.
- Three separately-labeled "save" CTAs in `QuickAccessInvoice.tsx` ("Save Draft", "Save Invoice", guide-panel CTA) all calling the identical `triggerGatedAction('save')`.
- "Add Type" / "New Role" / "Add User" / "Add Package" / "New Page" across sibling Admin CRUD screens — no consistent "Add X" vs "New X" convention.
- Two "See all →"-style duplicate dismiss/navigate actions in `TenantHome/WelcomeBanner.tsx` and `TenantHome/TicketSummaryPanel.tsx`.

### Styling inconsistencies for the same category of action

- **Destructive buttons**: some screens use `variant="destructive"`, others use `variant="outline"`/`variant="ghost"` plus manual red Tailwind classes — no single consistent pattern (`Admin/SAPackageServices.tsx`, `Admin/SAPages.tsx` vs `Admin/RoleList.tsx`, `Admin/SACompanyTypes.tsx`).
- **`cms/CmsVersionPanel.tsx` "Restore"** — an overwrite-and-replace action styled as low-emphasis Ghost.
- **`TicketingWidget.tsx` "Discard"** — a destructive/irreversible action styled amber instead of red.

### Accessibility: icon-only buttons without `aria-label`/`title`

This is by far the most common issue found, appearing in nearly every screen swept. Worth fixing as a general pass rather than file-by-file: back-arrow icons, row Edit/Delete/View icons, pagination chevrons, password-visibility toggles (inconsistent — `Login.tsx` has one, `Signup.tsx`/`ResetPassword.tsx` don't), and the entire `ui/RichTextEditor.tsx` toolbar (title-only, zero aria-labels across ~22 buttons).

### Missing confirmation on destructive/risky actions

- `Admin/SAASusers.tsx` "Suspend user" — no confirm dialog (contrast: password reset on the same screen does confirm).
- `Admin/SAUserDetails.tsx` "Suspend" — same gap.
- `Admin/SAsettings.tsx` "Run Pending Migrations" — no confirm dialog, while the "Run Default Seeder" button right below it does confirm.

### Missing keyboard accessibility (not just missing labels)

- `Admin/RoleForm.tsx` and `Admin/UserForm.tsx` — permission/role toggle rows are clickable `<div>`s, not real checkboxes/buttons (no keyboard focus, no `role="checkbox"`).
- `Admin/SAPages.tsx` — "Click to upload image" is a clickable `<div>`, not a button.
- `layout/AppSidebar.tsx` — the `SidebarRail` resize/toggle control has `tabIndex={-1}`, making it unreachable by keyboard.
