# Project: Madeena Traders ERP - Save as Draft Feature

## Architecture

This project implements the "Save as Draft" feature for the Invoice module in the Madeena Traders ERP.
The system consists of:

- **State Store (Zustand)**: `src/lib/store.ts` manages the application state including invoices, inventory, and warehouses. It handles invoice save/delete actions and inventory adjustments.
- **Form Component (React)**: `src/components/InvoiceEditor.tsx` handles creating and editing invoices, generating invoice numbers, and saving drafts or finalized invoices.
- **Invoices Listing Page**: `src/routes/_authenticated/invoices.index.tsx` displays the list of invoices in a table and provides toggles for filtering.
- **Dashboard Page**: `src/routes/_authenticated/index.tsx` calculates and displays key business metrics (revenue, total invoices, GST).

## Code Layout

- `src/lib/types.ts`: Domain models and interface definitions (including `Invoice`).
- `src/lib/store.ts`: Global state store and mutations (Zustand).
- `src/lib/cloud.ts`: Supabase database mapping and synchronization.
- `src/components/InvoiceEditor.tsx`: Shared UI form for invoice creation and editing.
- `src/routes/_authenticated/invoices.index.tsx`: Invoices management list page.
- `src/routes/_authenticated/index.tsx`: Main dashboard and analytics view.
- `tests/`: End-to-End Playwright tests.

## Milestones

| #   | Name                                               | Scope                                                                                                                          | Dependencies | Status  |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------- |
| 1   | Test Track: E2E Test Suite                         | Create Playwright E2E tests covering all 4 tiers in `tests/` and publish `TEST_READY.md`                                       | None         | DONE    |
| 2   | Implementation Track: Zustand Store Adjustments    | Update `saveInvoice` and `deleteInvoice` in `src/lib/store.ts` to exclude drafts from inventory stock changes                  | None         | PLANNED |
| 3   | Implementation Track: Invoice Editor Form Updates  | Update `src/components/InvoiceEditor.tsx` to handle "Save Draft" with `isDraft: true`, consume invoice number, and redirect    | M2           | PLANNED |
| 4   | Implementation Track: List Filter & Toggle & Badge | Add "Show drafts" checkbox, filter list by default, and render "Draft" badge in `src/routes/_authenticated/invoices.index.tsx` | M3           | PLANNED |
| 5   | Implementation Track: Dashboard Metrics Filtering  | Exclude draft invoices from dashboard statistics and recent table in `src/routes/_authenticated/index.tsx`                     | M4           | PLANNED |
| 6   | Verification Milestone                             | Run full E2E test suite (Tiers 1-4) on the implementation and complete Forensic Auditing                                       | M1, M5       | PLANNED |
| 7   | Adversarial Hardening (Tier 5)                     | Perform white-box gap analysis, generate adversarial tests, and fix any edge cases                                             | M6           | PLANNED |

## Interface Contracts

### Invoice State Contract

- An invoice represents a draft if `isDraft` is `true`.
- The `isDraft` field maps to database column `is_draft` via `src/lib/cloud.ts`.
- finalized invoices have `isDraft === false` or `undefined`.
- Inventory stock changes are only triggered for non-draft (`!isDraft`) invoices in the state actions.
