# E2E Test Suite - Save as Draft Feature Ready

This E2E test suite covers the "Save as Draft" feature for the Madeena Traders ERP. It is implemented in `tests/draft-invoices.spec.ts` using Playwright.

## Test Coverage Summary

### Tier 1: Feature Coverage (35 Assertions total)

- **F1: Save Draft Button & Form Saving** (5 assertions) - Verifies the presence of the button, the form saving with draft status, and correct feedback.
- **F2: Invoice Number Consumption** (5 assertions) - Verifies assignment of the current `INV-*` number to drafts and correct counter increments on subsequent invoices.
- **F3: Auto-navigation after Save** (5 assertions) - Verifies redirects to the invoices list view and page visibility.
- **F4: Invoice List Filter by Default** (5 assertions) - Verifies drafts are omitted from the default invoices listing table.
- **F5: 'Show Drafts' Toggle** (5 assertions) - Verifies that the toggle checkbox correctly displays and hides draft rows in the list.
- **F6: Draft Badge Indicator** (5 assertions) - Verifies the display of the gray "Draft" badge in the row status/lifecycle section.
- **F7: Dashboard Metrics Exclusion** (5 assertions) - Verifies that drafts are excluded from "Total Invoices", "Total Revenue", "GST Collected", and the recent invoices list.

### Tier 2: Boundary & Corner Cases (35 Assertions total)

- **B1: Validations and Empty Fields** (7 assertions) - Verifies that saving without a customer name fails, shows appropriate errors, and does not navigate.
- **B2: Edit Draft Multiple Times** (5 assertions) - Verifies that editing draft keeps the original number, and updates details without duplicates.
- **B3: Deleting Draft vs Finalized Invoice Stock Impact** (10 assertions) - Verifies deleting draft does not affect stock ledger, but deleting a finalized invoice reverts inventory stock.
- **B4: Custom Invoice Number Entry & Isolation** (3 assertions) - Verifies custom numbering support and that it does not consume/disrupt the auto-increment counter.
- **B5: Boundary & Edge Inputs** (3 assertions) - Verifies very long customer names, negative quantities, and negative prices are preserved in drafts.
- **B6: Finalize Draft** (4 assertions) - Verifies editing a draft and clicking final "Save" converts the draft to a final invoice, retaining the original invoice number.
- **B7: Empty Row Cleanup** (3 assertions) - Verifies that multiple trailing empty items/rows are automatically removed from the document on save.

### Tier 3: Cross-Feature Combinations (8 Assertions total)

- Verifies a joint lifecycle path (F1 + F3 + F4 + F5 + F6 + F7): Saving a draft -> showing drafts in list -> seeing the gray badge -> editing and finalizing the invoice -> checking list visibility without toggle -> checking dashboard revenue update.

### Tier 4: Real-World Application Scenarios (5 Workflows)

- **Scenario 1: Complete Draft Lifecycle** - From draft creation, exclusion check, list toggles, modification, to final conversion and dashboard inclusion.
- **Scenario 2: Multi-Warehouse Stock Isolation** - Setup warehouses, locations, and products. Verify draft creation has zero stock impact, finalized invoice deducts stock, and deletions correctly restore inventory.
- **Scenario 3: Concurrent Invoice Number Generation** - Verifies concurrent draft creation assigns separate unique numbers without conflicts.
- **Scenario 4: Financial Metrics Verification** - Verifies financial dashboard metrics before and after draft creation, and update on finalization.
- **Scenario 5: Edit Draft and Finalize Stock Impact** - Verify editing draft quantities keeps stock unaffected, but finalization calculates final deductions from the updated quantities.

## Verification Commands

To execute this suite:

```bash
npx playwright test tests/draft-invoices.spec.ts
```
