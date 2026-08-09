# Analysis Report — Product Label PDF CSS Print Styling

## Executive Summary
This report analyzes the print CSS implementation in `src/components/ProductLabelPdf.tsx` and provides a complete implementation strategy for Milestone 1. The goal is to update the CSS print styles to automatically apply top 0.33", left 0.11", right 0.13", bottom 0.46" margins, 80% visual label scaling, and proper vertical label stacking with a small visible gap on larger sheets (e.g., 4x6in).

---

## 1. Problem & Scope Definition

### Requirements Summary
- **R1. Default Print Configuration**:
  - `@page` directive must set custom margins: `margin: 0.33in 0.13in 0.46in 0.11in;` (top=0.33", right=0.13", bottom=0.46", left=0.11").
  - Explicitly scale label dimensions by 80% (either via `transform` scale or direct CSS dimension math).
- **R2. Flexible Paper Size Stacking**:
  - Multiple labels must stack vertically in natural sequence with a standard small gap when printed on larger sheets (e.g., 4x6in or A4).

---

## 2. Codebase Investigation Findings

### File: `src/components/ProductLabelPdf.tsx`
- **Location**: `src/components/ProductLabelPdf.tsx`
- **Key Functions**:
  - `buildLabelHtml(batch, product, warehouseName, locationName, company)`: Generates complete HTML string with embedded `<style>` block.
  - `printProductLabel(...)`: Opens popup window, writes generated HTML, calls `popup.print()`.
  - `downloadProductLabel(...)`: Creates hidden iframe, renders label, captures via `html2canvas-pro`, and exports PDF via `jsPDF`.

### Current CSS Issues Identified in `buildLabelHtml`
1. **`@page` Margins**:
   - Currently: `@page { size: 3in 2in landscape; margin: 0; }` (line 52-55).
   - Defect: Hardcodes 0 margin and forces 3x2in page size in printer dialog.
   - Required fix: Update `@page` to `margin: 0.33in 0.13in 0.46in 0.11in;` (top right bottom left order). Omit fixed `size: 3in 2in landscape;` (or set `size: auto;`) so paper size chosen by user/printer (e.g., 4x6in) applies dynamically.

2. **Body & Print Media Rules Locking Viewport**:
   - Currently:
     ```css
     html, body {
       width: 3in;
       height: 2in;
       overflow: hidden;
     }
     @media print {
       html, body { width: 3in; height: 2in; }
       .print-label { width: 100% !important; height: 100% !important; margin: 0 !important; }
     }
     ```
   - Defect: `overflow: hidden`, fixed 3x2in body height, and `@media print` 100% width/height force every label to stretch full-screen and clip any subsequent stacked labels.
   - Required fix: Remove `overflow: hidden` and fixed `width`/`height` from `html, body`. Allow natural page flow (`width: auto; height: auto;`).

3. **Label Scaling (80%)**:
   - Base label dimensions: `3in` width × `2in` height.
   - 80% scaled dimensions:
     - Width: `3in * 0.8 = 2.4in` (or `calc(3in * 0.8)`)
     - Height: `2in * 0.8 = 1.6in` (or `calc(2in * 0.8)`)
   - Direct dimension math vs `transform`:
     - `transform: scale(0.8)` leaves the unscaled 3x2 layout box in CSS flow unless compensated.
     - Direct dimension math (`width: 2.4in; height: 1.6in;`) changes the actual layout box size, allowing labels to stack tightly and accurately with a small gap (`margin-bottom: 0.125in` / `10px`).
     - Inner elements (padding `0.08in`, QR code image `56px` x `56px`, headers `8.8pt` / `7.2pt`, table font `6.4pt`) scale proportionally by 80%.

4. **Vertical Stacking & Gap Spacing**:
   - On a 4x6in sheet:
     - Printable height = `6in - 0.33in (top) - 0.46in (bottom) = 5.21in`.
     - 3 labels of `1.6in` height + 2 gaps of `0.125in` = `3 * 1.6 + 2 * 0.125 = 5.05in` total height (fits perfectly on 1 sheet!).
   - CSS rules needed:
     ```css
     .print-label {
       width: 2.4in;
       height: 1.6in;
       margin-bottom: 0.125in;
       break-inside: avoid;
       page-break-inside: avoid;
     }
     ```

---

## 3. Existing Test Infrastructure

- **Test Runner**: Playwright (`@playwright/test`) is configured in `playwright.config.ts`.
- **Existing Spec Files**:
  - `tests/draft-invoices.spec.ts` (Invoice module E2E)
  - `tests/integration.spec.ts` (Barcode scanner E2E)
- **Current Coverage**: No existing unit or E2E tests for `ProductLabelPdf.tsx`.
- **Proposed Test File**: `tests/product-label-pdf.spec.ts` using `@playwright/test`.

---

## 4. Recommended Implementation Strategy for Worker

### Step 1: Update `src/components/ProductLabelPdf.tsx`
Modify `buildLabelHtml` style block:
1. Replace `@page` rule:
   ```css
   @page {
     margin: 0.33in 0.13in 0.46in 0.11in;
   }
   ```
2. Update `html, body` styles:
   Remove `width: 3in; height: 2in; overflow: hidden;`.
3. Update `@media print`:
   Ensure `.print-label` uses scaled `width: 2.4in; height: 1.6in; margin-bottom: 0.125in; break-inside: avoid; page-break-inside: avoid;`.
4. Scale inner components to 80%:
   - `.print-label`: `width: 2.4in; height: 1.6in; padding: 0.08in; margin: 0 0 0.125in 0;`
   - `.qr-wrapper img`: `width: 56px !important; height: 56px !important; max-width: 56px; max-height: 56px;`
   - `.item-type-header`: `font-size: 8.8pt; margin-bottom: 3px;`
   - `.size-header`: `font-size: 7.2pt;`
   - `.specs-table`: `font-size: 6.4pt;`
   - `.dotted-lines`: `height: 3px; margin-bottom: 4px;`

### Step 2: Add Automated Tests
Create `tests/product-label-pdf.spec.ts`:
- Import `buildLabelHtml` (or render mock label data).
- Assert `@page` contains `margin: 0.33in 0.13in 0.46in 0.11in;`.
- Assert `.print-label` has 80% scaled width/height (`2.4in`, `1.6in`, or `transform: scale(0.8)`).
- Assert `margin-bottom: 0.125in` / `10px` gap rule and `break-inside: avoid`.

### Step 3: Verification
- Execute `npx playwright test tests/product-label-pdf.spec.ts`
- Execute `npm run build` to verify clean build.
