# Initial Code Assessment Report: 'Save as Draft' Feature

## 1. Executive Summary

This report presents the initial code assessment and technical implementation plan for implementing and refining the "Save as Draft" feature for invoices in the FastenerERP Billing application. The database/sync layer (`src/lib/cloud.ts`) and data interfaces (`src/lib/types.ts`) already support the `isDraft` (represented as `is_draft` / `status` in the database) field.

However, critical changes are required in the state management layer (`src/lib/store.ts`) to prevent draft invoices from incorrectly updating inventory stocks or showing up in dashboard metrics and report exports. Additionally, the invoices list page needs to be updated to support filtering and badging of drafts.

---

## 2. Codebase Structure Overview

The project is built on Vite, React, and TypeScript:

- **Routing**: `@tanstack/react-router` handles routing, with code located in `src/routes/`. Subdirectories include:
  - `_authenticated/invoices.index.tsx` (Invoices table listing page)
  - `_authenticated/invoices.new.tsx` (Create invoice route)
  - `_authenticated/invoices.$id.tsx` (Edit invoice route)
  - `_authenticated/index.tsx` (Dashboard)
  - `_authenticated/reports.tsx` (Reports engine)
- **State Management**: Zustand store in `src/lib/store.ts` (`useApp` hook).
- **Core Components**: `src/components/InvoiceEditor.tsx` acts as the shared form editor for both creating and editing invoices.
- **Database/Sync**: Supabase integration mapping is defined in `src/lib/cloud.ts`.

---

## 3. Detailed Core System Analysis

### A. Zustand Store & Invoice Saving Flow

The state store handles saving invoices via the `saveInvoice(inv, oldInv)` action. Currently, when an invoice is saved, the store automatically runs stock adjustments if the invoice specifies a dispatch warehouse and location:

- Reverts quantities from `oldInv` (adding back to inventory stock with type `INVOICE_EDIT_REVERT`).
- Deducts quantities for `inv` (subtracting from inventory stock with type `INVOICE_SALE`).

**The Problem**: Draft invoices are not finalized transactions. If they deduct inventory stock when saved as draft, it distorts real-time physical stock counts.

**The Solution**:

- Adjust the store actions (`saveInvoice`, `deleteInvoice`) so that inventory stock deductions and reversions are **only** applied to finalized invoices (`!isDraft`).
- If `oldInv` was a draft, it never deducted stock; thus, editing it should not trigger a reversion. If the new `inv` is a draft, it should not deduct stock.

### B. Invoice Number Generation and Counters

The store uses `nextInvoiceNumber()` to get the next formatted number and `consumeInvoiceNumber()` to advance settings' counter.

- During invoice creation, `InvoiceEditor` generates a draft number using `nextInvoiceNumber()` and assigns it to the initial form state.
- When saving as a draft, `InvoiceEditor` consumes this invoice number.
- **Implication**: Consuming the official invoice number for drafts ensures that draft invoices hold a unique number in sequence, preventing collisions if other invoices are finalized concurrently. However, deleting a draft can leave a gap in invoice numbers. This matches the standard behavior of the database configuration where `is_draft` mapping is defined. The number consumption logic does not require changes.

---

## 4. UI/UX Enhancements in `invoices.index.tsx`

Currently, draft invoices appear in the general invoice list without any distinguishing badge or filtering options.

### A. "Show Drafts" Toggle

Add a "Show drafts" checkbox toggle in the toolbar next to the "Show cancelled" toggle in `invoices.index.tsx`.

- **Default State**: Drafts should be hidden by default (`showDrafts: false`) to keep the primary invoice list uncluttered.
- **Filtering Logic**: Modify the `filtered` invoices selector to hide drafts when the toggle is off.

### B. "Draft" Badge

Place a highly visible badge next to the invoice number link in the table to clearly denote draft invoices.

---

## 5. Other Impacted Areas (Dashboard & Reports)

To ensure system-wide consistency, drafts must not skew operational metrics:

- **Dashboard (`src/routes/_authenticated/index.tsx`)**:
  - Exclude draft invoices from "Total Invoices", "Total Revenue", and "GST Collected" metrics.
  - Exclude draft invoices from the "Recent Invoices" table.
- **Reports (`src/routes/_authenticated/reports.tsx`)**:
  - _Status_: The reports engine already correctly filters out drafts using `!inv.isDraft` when generating Customer Invoice and Overall Invoice reports.

---

## 6. Technical Implementation Plan

### Step 1: Update Zustand Store (`src/lib/store.ts`)

Modify the `saveInvoice` and `deleteInvoice` actions to check the `isDraft` property before applying stock adjustments.

#### Proposed Changes in `src/lib/store.ts`:

```typescript
// Replace lines 274-285 in src/lib/store.ts
// Revert old invoice if it existed and was NOT a draft
if (oldInv && !oldInv.isDraft && oldInv.dispatchWarehouseId && oldInv.dispatchLocationId) {
  for (const item of oldInv.items) {
    if (item.quantity)
      applyStockChange(
        item.description,
        item.quantity,
        oldInv.dispatchWarehouseId,
        oldInv.dispatchLocationId,
        "INVOICE_EDIT_REVERT",
      );
  }
}

// Apply new invoice deductions if it is NOT a draft
if (!inv.isDraft && inv.dispatchWarehouseId && inv.dispatchLocationId) {
  for (const item of inv.items) {
    if (item.quantity)
      applyStockChange(
        item.description,
        -item.quantity,
        inv.dispatchWarehouseId,
        inv.dispatchLocationId,
        "INVOICE_SALE",
      );
  }
}
```

```typescript
// Replace line 298 in src/lib/store.ts
// In deleteInvoice action, check that the invoice is NOT a draft before reverting stock
if (inv && !inv.isDraft && inv.dispatchWarehouseId && inv.dispatchLocationId) {
```

### Step 2: Update Invoices Listing (`src/routes/_authenticated/invoices.index.tsx`)

Introduce filtering state and render the draft badge.

#### Proposed Changes in `src/routes/_authenticated/invoices.index.tsx`:

```typescript
// Inside InvoicesList component
const [showDrafts, setShowDrafts] = useState(false);

// Update filtered useMemo
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
  return invoices
    .filter((inv) => (showCancelled ? true : inv.lifecycle !== "CANCELLED"))
    .filter((inv) => (showDrafts ? true : !inv.isDraft)) // Filter out drafts when toggle is off
    .filter((inv) =>
      q ? [inv.number, inv.customer.name].join(" ").toLowerCase().includes(q) : true,
    )
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}, [invoices, query, showCancelled, showDrafts]);
```

```typescript
// Inside toolbar container (around line 94)
<label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
  <input
    type="checkbox"
    checked={showDrafts}
    onChange={(e) => setShowDrafts(e.target.checked)}
  />
  Show drafts
</label>
```

```typescript
// Inside table row generator (around line 117)
<td className="px-5 py-3">
  <div className="flex items-center gap-2">
    <Link
      to="/invoices/$id"
      params={{ id: inv.id }}
      className="font-medium hover:underline"
    >
      {inv.number}
    </Link>
    {inv.isDraft && (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
        Draft
      </span>
    )}
  </div>
</td>
```

### Step 3: Update Dashboard Metrics (`src/routes/_authenticated/index.tsx`)

Exclude drafts from showing up on the dashboard metrics.

#### Proposed Changes in `src/routes/_authenticated/index.tsx`:

```typescript
// Update lines 22-23 to filter out drafts from dashboard calculation
const invoices = allInvoices.filter((i) => i.lifecycle !== "CANCELLED" && !i.isDraft);
const quotations = allQuotations.filter((q) => q.lifecycle !== "CANCELLED"); // (QuotationStatus handles drafts separately)
```
