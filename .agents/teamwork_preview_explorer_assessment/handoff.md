# Handoff Report: Save as Draft Code Assessment

## 1. Observation

- `src/lib/types.ts` contains the `Invoice` interface definition which declares `isDraft?: boolean;` at line 122.
- `src/lib/cloud.ts` maps `isDraft` to the backend/database mapping: `is_draft: inv.isDraft ?? false` at line 145 and `rowToInvoice` sets `isDraft: (r.is_draft as boolean) ?? false` at line 105.
- `src/lib/store.ts` action `saveInvoice` at lines 274-285 automatically adjusts stock levels on edit/save actions, without checking if the invoice is a draft:
  ```typescript
  // Revert old invoice if it existed
  if (oldInv && oldInv.dispatchWarehouseId && oldInv.dispatchLocationId) {
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

  // Apply new invoice deductions
  if (inv.dispatchWarehouseId && inv.dispatchLocationId) {
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
- `src/routes/_authenticated/invoices.index.tsx` is the entry point for the invoice listing. It does not filter out draft invoices from the primary list, and it doesn't display any badge distinguishing draft invoices.
- `src/routes/_authenticated/index.tsx` (Dashboard) includes all non-cancelled invoices in its revenue, count, and GST calculations:
  ```typescript
  const invoices = allInvoices.filter((i) => i.lifecycle !== "CANCELLED");
  ```
- `src/routes/_authenticated/reports.tsx` already excludes draft invoices from reports calculations at line 225 and line 416:
  ```typescript
  !inv.isDraft;
  ```

---

## 2. Logic Chain

- Since `isDraft` is already mapped in types and the sync layer (`src/lib/types.ts` and `src/lib/cloud.ts`), the data layer is fully prepared for this feature.
- Since draft invoices represent non-finalized transactions, they should not affect inventory stock levels. Therefore, in `src/lib/store.ts`, the `saveInvoice` and `deleteInvoice` actions must only apply stock adjustments if `!inv.isDraft` and `!oldInv.isDraft` respectively.
- Since draft invoices are incomplete work-in-progress records, they should be hidden by default in the general invoices listing (`invoices.index.tsx`) to avoid cluttering the view. Adding a "Show drafts" toggle (default: false) and a "Draft" badge next to the invoice number link in the table provides clear visual separation and control.
- Since draft invoices are not recognized sales, they should be excluded from Dashboard metrics (total revenue, invoice counts, GST) and the recent invoices table in `src/routes/_authenticated/index.tsx`.

---

## 3. Caveats

- The code assessment was performed purely in read-only mode, and no code modifications were applied.
- The next invoice number is consumed immediately when a new draft invoice is saved. If that draft is later deleted, it will create a gap in the invoice numbers. In typical audit trails, this is an acceptable trade-off to ensure sequence integrity and prevent simultaneous number generation collisions.

---

## 4. Conclusion

The implementation of the 'Save as Draft' feature requires the following minimal set of code changes:

1. Update Zustand store actions (`saveInvoice` and `deleteInvoice`) in `src/lib/store.ts` to skip stock adjustments for draft invoices.
2. Update the invoices listing view (`src/routes/_authenticated/invoices.index.tsx`) to introduce a `showDrafts` filter toggle, filter drafts when unchecked, and render a "Draft" badge.
3. Update the Dashboard (`src/routes/_authenticated/index.tsx`) to exclude drafts from metric calculations.

---

## 5. Verification Method

- **Static Verification**:
  - Open `src/lib/store.ts` and confirm the `saveInvoice` and `deleteInvoice` updates match the proposed implementation.
  - Open `src/routes/_authenticated/invoices.index.tsx` and verify the `showDrafts` toggle state and the draft filter/badge rendering.
  - Open `src/routes/_authenticated/index.tsx` and verify draft filtering in the dashboard metrics.
- **Build and Lint Verification**:
  - Run `npm run build` to verify there are no compilation or TanStack Router generation issues.
  - Run `npm run lint` to verify that there are no style or syntax violations.
