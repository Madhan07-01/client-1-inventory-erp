# Quotation Module Refinement (Patch V1.1)

Simplify the Quotation module: automatic expiry (persisted), reduced status set, no versioning, and remove Reference #, Dispatch From, and Ship To — while leaving Invoice, GST, Customer, Product, and PDF styling untouched.

## 1. Status model simplification

New allowed statuses: `draft`, `expired`, `converted`, `cancelled`.

- Update `QuotationStatus` in `src/lib/types.ts` to only those four values.
- Update `quotationStatusMeta()` in `src/lib/quotation-actions.ts` to only handle those four.
- Convert action guard: block only when status is `converted` or `cancelled` (drop the `isLatest` check — see §3).

## 2. Automatic expiry (persisted, lazy)

Expiry is written to the DB, but updated lazily on read — no cron, no background worker.

- Add a helper `maybeExpireQuotation(q)` in `src/lib/quotation-actions.ts`: if `status === 'draft'` AND `validityDate < today`, return a new object with `status: 'expired'`. `converted` and `cancelled` are never auto-expired.
- Hydration path (`useHydrateApp` / cloud fetch in `src/lib/cloud.ts`): after loading quotations from Supabase, pass each through `maybeExpireQuotation`; for any that changed, fire-and-forget an `UPDATE quotations SET status = 'expired' WHERE id = ...` back to the cloud (batched). Local store gets the updated statuses immediately.
- Also run the check when a single quotation is opened in the editor and when the Quotations list mounts, so stale rows self-heal even if the user skipped a full reload.
- No DB migration — `status` column already stores text; `'expired'` is just another allowed value.

Effect: dashboard, list, filters, PDF, and reports all just read `q.status` — no derived-status wrappers needed anywhere.

## 3. Remove versioning entirely

- Drop `version`, `isLatest`, `parentQuotationId` from `Quotation` type and from the cloud mapper (`src/lib/cloud.ts`); stop writing them.
- Remove `reviseQuotation()` and `duplicateQuotation()` from `src/lib/quotation-actions.ts` and their UI entry points (Duplicate, New Version, Revision History panel).
- Editing updates the same record (already the case via `updateQuotation`). Remove any "latest version" filter from the list.
- DB columns for version/parent stay in place (non-destructive).

## 4. Field removals (Quotation only)

Remove from Quotation editor UI, `buildBlankQuotation`, `QuotationPdf`, and any preview/details:

- `referenceNumber`
- `dispatchFrom`
- `shipTo`

Drop these from the `Quotation` type so they can't be set accidentally. Cloud mapper stops writing them. Invoice module keeps all three fields intact.

## 5. Dashboard & filters

- Dashboard: replace the sent/accepted/rejected-based "Conversion Rate" block with plain counts: Draft, Expired, Converted, Cancelled. Keep Total Quotations and Quotation Value cards.
- List page status filter: `All | Draft | Expired | Converted | Cancelled`.

## 6. Notifications & activity logs

- `src/lib/notifications.ts` (and quotation notification helpers): only emit for Created, Updated, Converted, Cancelled, Expired. Remove Sent/Accepted/Rejected paths. The lazy-expire step in §2 is the natural trigger for the Expired notification (only when a row actually flips).
- Activity log call sites: keep Created, Updated, Converted, Cancelled, Printed, Downloaded; add Expired (logged when lazy-expire flips a row). Remove Sent/Accepted/Rejected log types.

## 7. Preserved / untouched

Invoice module, invoice numbering, GST engine, Customer, Product, Auth, Company settings, invoice PDF styling, responsive layout, DB schema (version/reference/dispatch/ship columns become unused but remain).

## Technical notes

- No DB schema migration. Existing `quotations.status` text column simply gains `'expired'` as a written value; existing rows are updated in place the first time they're loaded past their validity date.
- Lazy-expire is idempotent: `maybeExpireQuotation` no-ops for rows already `expired`, `converted`, or `cancelled`.
- Convert-to-invoice (`convertQuotationToInvoice`) keeps bi-directional linking; drop the `isLatest` precondition.

## Files touched

- `src/lib/types.ts`
- `src/lib/quotation-actions.ts`
- `src/lib/cloud.ts` (quotation mapper + lazy-expire write-back)
- `src/lib/useHydrateApp.ts` (invoke lazy-expire after fetch)
- `src/lib/notifications.ts`
- `src/lib/default-settings.ts` (if it seeds versioning/reference defaults)
- `src/components/QuotationEditor.tsx`
- `src/components/QuotationPdf.tsx`
- `src/routes/_authenticated/quotations.index.tsx`
- `src/routes/_authenticated/quotations.$id.tsx` (remove version UI)
- `src/routes/_authenticated/index.tsx` (dashboard KPI block)

## Verification

1. New quotation → status `Draft`.
2. Set validity date to yesterday, reload → status flips to `Expired` in UI AND in the database.
3. Convert a quotation → `Converted` even after validity passes; Convert button hidden; editor locked.
4. Cancel a quotation → `Cancelled`; never auto-expires.
5. Status filter shows only the 4 values.
6. Reference #, Dispatch From, Ship To absent from quotation editor and PDF; still present on invoices.
7. No Duplicate / New Version / Revision History UI anywhere in quotations.
8. Invoice create/edit/PDF and GST split unchanged.
