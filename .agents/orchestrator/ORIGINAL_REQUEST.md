# Original User Request

## 2026-07-12T14:51:05Z

Implement 'Save as Draft' functionality for the invoice module in the existing Madeena Traders ERP. Drafts should be hidden by default on the All Invoices page, toggleable via a 'Show Drafts' checkbox, and visually marked as drafts. Saving a draft should return the user to the previous page.

Working directory: `e:/Client 1`
Integrity mode: development

### Context

This is an existing React application using:

- TanStack Router (`src/routes/_authenticated/invoices.index.tsx` for list, `src/components/InvoiceEditor.tsx` for form)
- Zustand store (`src/lib/store.ts`) for state management (`useApp` hook).
- Tailwind CSS & shadcn/ui for components.

### Requirements

#### R1. Save Draft Behavior

When the user clicks "Save Draft" in the `InvoiceEditor`, the invoice should be saved with `isDraft: true`. It must consume an official invoice number immediately upon creation (if it hasn't already). After saving, the application should automatically navigate back to the previous page (e.g., the invoice list).

#### R2. Invoice List Filtering

On the All Invoices page (`invoices.index.tsx`), draft invoices (where `isDraft === true`) must be hidden from the table by default.

#### R3. 'Show Drafts' Toggle

Add a toggle button with a checkbox labeled "Show Drafts" to the All Invoices page. When checked, draft invoices should be included in the table.

#### R4. Draft Badge Indicator

When draft invoices are visible in the table, they must be clearly distinguished with a gray "Draft" badge in the status/lifecycle column.

### Acceptance Criteria

#### Draft Creation & Navigation

- [ ] Clicking "Save Draft" successfully saves the invoice to the store with `isDraft: true`.
- [ ] The invoice consumes an official invoice number even if it's just a draft.

#### List View & Toggling

- [ ] By default, the invoices table does not display any invoice with `isDraft: true`.
- [ ] Checking the "Show Drafts" toggle updates the table to include draft invoices.
- [ ] Draft invoices in the table display a gray "Draft" badge in the status column.
