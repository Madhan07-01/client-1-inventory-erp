# Project: Product Label PDF CSS Print Styling Update

## Architecture

This project updates the CSS print styles in `src/components/ProductLabelPdf.tsx` for Madeena Traders ERP.
The system generates HTML/CSS for product labels and renders/prints them.

- **Component**: `src/components/ProductLabelPdf.tsx` contains `buildLabelHtml` which constructs the HTML and embedded CSS for printing product labels.
- **CSS @page Rules**: Defines page margins (`margin: 0.33in 0.13in 0.46in 0.11in;`) for automated printer layout.
- **Scaling & Stacking**: Applies 80% visual scaling to label dimensions and ensures vertical label stacking with a small gap when printing multiple labels on larger paper sheets.

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Custom @page Margins | Enforce @page { margin: 0.33in 0.13in 0.46in 0.11in; } in buildLabelHtml | M1 | ORIGINAL_REQUEST.md §R1 |
| 2 | 80% Label Scaling | Scale label dimensions by 80% (via 2.4in x 1.6in scaled dimensions and font/QR scaling) | M1 | ORIGINAL_REQUEST.md §R1 |
| 3 | Flexible Paper Size Stacking | Ensure multiple labels stack vertically with a standard small gap | M1 | ORIGINAL_REQUEST.md §R2 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | ProductLabelPdf CSS Update | Update ProductLabelPdf.tsx CSS print rules for margins, 80% scale, and label stacking gap | None | DONE |

## Interface Contracts

### Label PDF Print CSS Contract
- `@page` rule in `buildLabelHtml` CSS explicitly states: `@page { margin: 0.33in 0.13in 0.46in 0.11in; }`.
- Label container dimensions set to 80% scale (`width: 2.4in; height: 1.6in;`) with scaled internal padding, fonts (`8.8pt`, `7.2pt`, `6.4pt`), and QR code size (`56px`).
- Multi-label container supports page breaks (`break-inside: avoid; page-break-inside: avoid;`) and vertical gap (`margin-bottom: 0.125in;`) for natural vertical stacking.

## Code Layout
- `src/components/ProductLabelPdf.tsx`: Main component containing `buildLabelHtml`.
- `tests/product-label-pdf.spec.ts`: Playwright test suite for print CSS verification.
