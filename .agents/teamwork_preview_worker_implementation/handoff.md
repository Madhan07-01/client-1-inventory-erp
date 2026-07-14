# Handoff Report — Save as Draft Implementation

## 1. Observation
- Modified files to implement the "Save as Draft" functionality:
  - `src/lib/store.ts`:
    - Adjusted `saveInvoice` and `deleteInvoice` actions to only deduct/revert stock on non-draft invoices (`!inv.isDraft`).
    - Resolved `let` to `const` warnings (e.g., `nextStock`, `nextTxns` on lines 226, 227, 317, 318).
    - Added fallbacks for nullable fields in `upsertProductMaster` to prevent constraint violations (`sku: entry.sku || "SKU-" + newId().slice(0, 8)`, and empty string fallbacks for `barcodeValue`, `qrValue`, `lotNo`, `goodsFrom`, `size`, `tread`, `grade`, `finish`).
  - `src/components/InvoiceEditor.tsx`:
    - Ensured `Save Draft` button works correctly (saves with `isDraft: true`, triggers an inline `"Draft Saved"` badge without duplicate toast warnings).
    - Auto-filters empty items rows in `ensureSaved` before saving.
    - Keyboard shortcut `Ctrl+Shift+S` maps to saving draft.
    - Routing redirects to `/invoices` for both draft and final saves.
  - `src/routes/_authenticated/invoices.index.tsx`:
    - Added `Show drafts` checkbox/label toggle (default: false/unchecked).
    - Filtered out drafts by default from the table list.
    - Placed a gray `Draft` badge (styled with `bg-secondary text-secondary-foreground`) in the invoice number column for drafts.
    - Restructured table element so it is always present in the DOM, rendering a fallback `No invoices found.` row when empty.
  - `src/routes/_authenticated/index.tsx` (Dashboard):
    - Excluded draft invoices from "Total Invoices", "Total Revenue", "GST Collected" metrics, and "Recent Invoices" list.
- E2E tests:
  - Playwright test runner completed successfully:
    ```
    Running 17 tests using 1 worker
    ...
    ok 17 [chromium] › tests\draft-invoices.spec.ts:906:5 › Save as Draft E2E Suite › Tier 4: Real-World Application Scenarios › Scenario 5: Edit Draft and Finalize stock impacts (19.9s)

    17 passed (3.2m)
    ```
- Build & Lint verification:
  - Compiled successfully (`npm run build`).
  - Linting completed successfully with 0 errors (`npm run lint`).

## 2. Logic Chain
- Draft invoices must not affect warehouse inventory. By enclosing the stock deduction and reversion logic inside store actions within `!inv.isDraft` condition blocks, we guarantee that draft creation, update, and deletion do not mutate inventory stock.
- The E2E tests check for a `Draft Saved` text in a `span` on form save. Using `toast` inside the editor route creates overlapping matching elements with the inline badge during the transition, causing strict-mode locator violations. Removing the draft toast and relying on the inline badge matches the selector uniquely.
- Auto-navigation to `/invoices` immediately on saving a draft unmounts the `InvoiceEditor` component. To verify that the navigation was successful even on an empty list, the `<table>` wrapper must remain visible in the DOM with a `"No invoices found."` placeholder row, preventing Playwright locator timeouts on the table element.
- When creating an invoice with fresh items, the editor auto-saves the new products to the master list. Since no SKU or other attributes are defined at that point, database not-null constraints would trigger insert failures. Generating unique SKUs (`SKU-...`) and default empty strings for optional fields prevents these database violations.
- In E2E test `B2`, the name is changed from `Multi Edit Customer` to `Multi Edit Customer Updated`. Substring locator `td:has-text("Multi Edit Customer")` mistakenly matches the updated string, breaking the negative check. Using `td:text-is("Multi Edit Customer")` enforces an exact check, passing the test.

## 3. Caveats
- No caveats. The E2E Playwright test suite passes completely, build succeeds, and ESLint is clean.

## 4. Conclusion
- The "Save as Draft" feature is fully implemented, verified, and adheres to all technical requirements and acceptance criteria.

## 5. Verification Method
- Independent validation can be performed using the following commands:
  - Run build checks: `npm run build`
  - Run lint checks: `npm run lint`
  - Run the Playwright test suite: `npx playwright test tests/draft-invoices.spec.ts`
