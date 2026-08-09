## 2026-08-06T18:53:45Z
Task summary:
Update ProductLabelPdf.tsx CSS print styles to automatically apply layout, margins (Top 0.33", Left 0.11", Right 0.13", Bottom 0.46"), and scale (80%). Ensure labels print correctly by default on any paper size without manual print dialog adjustments.

Requirements:
R1. Default Print Configuration: Update buildLabelHtml CSS in src/components/ProductLabelPdf.tsx to enforce @page { margin: 0.33in 0.13in 0.46in 0.11in; }. Scale label dimensions by 80%.
R2. Flexible Paper Size Stacking: Ensure that when a larger paper size is selected (e.g. 4x6in), multiple labels stack vertically in a natural sequence with a standard small gap.

Acceptance Criteria:
- CSS @page rule explicitly defines custom margins: margin: 0.33in 0.13in 0.46in 0.11in; (top right bottom left).
- CSS explicitly scales label dimensions by 80% (either via transform or direct dimension math).
- Labels stack with a small visible gap when multiple labels are printed on a single larger sheet.
