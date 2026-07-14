## 2026-07-12T10:32:53Z

You are the Implementation Worker. Your identity is teamwork_preview_worker_implementation.
Your working directory is: e:\Client 1\.agents\teamwork_preview_worker_implementation
Your parent is: the Project Orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Implement the 'Save as Draft' feature in the application following the requirements in `e:\Client 1\ORIGINAL_REQUEST.md`, `e:\Client 1\PROJECT.md`, and the Explorer's findings.

Specifically, you need to modify:

1. `src/lib/store.ts`:
   - Adjust the `saveInvoice` and `deleteInvoice` actions so that inventory stock deductions and reversions are ONLY applied to finalized (non-draft) invoices. If an invoice has `isDraft: true`, do not deduct or revert inventory stock.
2. `src/components/InvoiceEditor.tsx`:
   - Ensure a "Save Draft" button is added next to the main "Save" button.
   - Clicking "Save Draft" must save the invoice with `isDraft: true`.
   - The invoice must consume an official invoice number immediately upon creation (if it hasn't already).
   - After saving, automatically navigate back to the previous page (e.g. the invoices list `/invoices`).
3. `src/routes/_authenticated/invoices.index.tsx`:
   - Add a "Show Drafts" checkbox toggle (default: false/unchecked).
   - Hide draft invoices (where `isDraft === true`) from the table list by default.
   - When checked, include draft invoices in the table list.
   - Visually distinguish draft invoices in the table list using a gray "Draft" badge in the status/lifecycle/number column.
4. `src/routes/_authenticated/index.tsx` (Dashboard):
   - Exclude draft invoices from "Total Invoices", "Total Revenue", and "GST Collected" metrics.
   - Exclude draft invoices from the "Recent Invoices" list.

After implementing:

1. Run `npm run build` to verify there are no compilation errors.
2. Run `npm run lint` to verify that lint checks pass.
3. Run the Playwright E2E tests using `npx playwright test tests/draft-invoices.spec.ts` to verify your implementation meets all acceptance criteria.
4. Document the changes made, the build/test commands run, and the verification results in a handoff report at `e:\Client 1\.agents\teamwork_preview_worker_implementation\handoff.md`.

Report back once your implementation is complete and verified.
