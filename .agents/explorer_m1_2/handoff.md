# Handoff Report — Explorer M1_2 (Product Label CSS Print Analysis)

## 1. Observation

- **Target File**: `src/components/ProductLabelPdf.tsx` (lines 45–195).
- **Current `@page` Directive** (lines 52–55):
  ```css
  @page {
    size: 3in 2in landscape;
    margin: 0;
  }
  ```
- **Current `html, body` Directive** (lines 57–67):
  ```css
  html, body {
    margin: 0;
    padding: 0;
    width: 3in;
    height: 2in;
    background: white;
    color: #000;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-print-color-adjust: exact;
    overflow: hidden;
  }
  ```
- **Current `.print-label` Class** (lines 83–94):
  ```css
  .print-label {
    width: 3in;
    height: 2in;
    margin: 0 auto;
    padding: 0.1in;
    display: flex;
    flex-direction: column;
    background: #fff;
    page-break-after: avoid;
    page-break-before: avoid;
    break-inside: avoid;
  }
  ```
- **Missing Elements**:
  - No `@page { margin: 0.33in 0.13in 0.46in 0.11in; }` rule exists.
  - No 80% scale transformation or 80% scaled dimensions (2.4" x 1.6") exist.
  - No margin gap rules (`margin-bottom: 0.08in;`) exist for vertical label stacking on larger paper sizes (e.g., 4x6in).

---

## 2. Logic Chain

1. **Observation**: `@page` currently has `margin: 0;`, whereas the requirement demands Top 0.33", Left 0.11", Right 0.13", Bottom 0.46".
   - **Reasoning**: Standard CSS `@page` shorthand uses Top Right Bottom Left (`margin: top right bottom left;`). Therefore, Top 0.33", Right 0.13", Bottom 0.46", Left 0.11" translates exactly to `@page { margin: 0.33in 0.13in 0.46in 0.11in; }`.
2. **Observation**: `html, body` has fixed `width: 3in; height: 2in; overflow: hidden;`.
   - **Reasoning**: Setting fixed dimensions on `html, body` when `@page` margins are set reduces the remaining printable area on a 3x2in page to 2.76" x 1.21". A fixed 3in x 2in body causes clipping or forces empty second pages in Chrome/Firefox. Setting `width: 100%; height: auto; overflow: visible;` allows `body` to fluidly fit the `@page` printable region.
3. **Observation**: Scaling can be achieved via `transform: scale(0.8)` or direct dimension scaling (`2.4in x 1.6in`).
   - **Reasoning**: Visual `transform: scale(0.8)` preserves the layout bounding box (3in x 2in), causing phantom margins and breaking vertical label stacking gaps on multi-label sheets. Direct layout scaling (width 2.4in, height 1.6in, scaled fonts/padding) ensures the layout bounding box matches the visual box, rendering crisp vector text and supporting natural vertical label stacking.
4. **Observation**: Vertical stacking on larger paper sizes (e.g. 4x6in) requires labels to avoid splitting across pages while allowing clean gaps.
   - **Reasoning**: `break-inside: avoid; page-break-inside: avoid;` prevents an individual label from splitting across page breaks. Removing `page-break-after: avoid;` enables multi-label wrapping across pages. `margin-bottom: 0.08in;` on `.print-label:not(:last-child)` guarantees reliable cross-browser vertical spacing.

---

## 3. Caveats

- **Physical Printer Hard Margins**: Some hardware thermal printers enforce unprintable physical hardware margins (e.g., 0.125"). If the driver's unprintable margin exceeds `@page` margins, the physical printout may shift slightly depending on printer driver settings.
- **`html2canvas-pro` PDF Export**: `downloadProductLabel` uses `html2canvas-pro` to capture `.print-label`. Ensuring `.print-label` has explicit pixel/inch dimensions (2.4in x 1.6in) prevents canvas distortion during PNG generation.

---

## 4. Conclusion

The CSS print styles in `src/components/ProductLabelPdf.tsx` must be updated as follows:
1. Set `@page { margin: 0.33in 0.13in 0.46in 0.11in; }`.
2. Remove fixed `width: 3in; height: 2in; overflow: hidden;` from `html, body` and `@media print`.
3. Apply direct 80% dimension scaling to `.print-label` (`width: 2.4in; height: 1.6in; padding: 0.08in;`) and scale internal font/icon dimensions proportionally.
4. Use `break-inside: avoid; page-break-inside: avoid;` and `margin-bottom: 0.08in;` on `.print-label:not(:last-child)` for natural vertical label stacking on 4x6in or larger paper sizes.

---

## 5. Verification Method

To independently verify these conclusions:
1. Inspect `src/components/ProductLabelPdf.tsx` CSS styles in `buildLabelHtml`.
2. Inspect `.agents/explorer_m1_2/analysis.md` for detailed technical comparisons.
3. Validate `@page` margin order syntax (TRBL): `Top 0.33in`, `Right 0.13in`, `Bottom 0.46in`, `Left 0.11in`.
4. Run `npm test` or `npx playwright test` if print tests exist, or verify layout rendering using Chrome Print Preview (`Ctrl+P` on popup window).
