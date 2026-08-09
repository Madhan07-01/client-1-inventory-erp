# Execution Plan: ProductLabelPdf CSS Print Styles Update

## Overview
Update `ProductLabelPdf.tsx` CSS print styles to automatically apply layout, margins (Top 0.33", Left 0.11", Right 0.13", Bottom 0.46"), and 80% scaling, ensuring labels print correctly on any paper size without manual print dialog adjustments.

## Requirements
- **R1. Default Print Configuration**:
  - `@page { margin: 0.33in 0.13in 0.46in 0.11in; }` (Top 0.33", Right 0.13", Bottom 0.46", Left 0.11")
  - Scale label dimensions by 80% (either via CSS `transform: scale(0.8)` / `transform-origin` or direct dimension math).
- **R2. Flexible Paper Size Stacking**:
  - Ensure multiple labels stack vertically in a natural sequence with a standard small gap when printed on larger sheets (e.g. 4x6in).

## Phased Approach

### Phase 1: Investigation & Analysis (Explorer)
- Dispatch `teamwork_preview_explorer` to inspect `src/components/ProductLabelPdf.tsx` and related print handling files or test suites.
- Analyze current `buildLabelHtml` implementation, CSS styles, `@page` directives, label container rules, and stacking behaviour.

### Phase 2: Implementation (Worker)
- Dispatch `teamwork_preview_worker` to update `buildLabelHtml` CSS in `src/components/ProductLabelPdf.tsx`.
- Apply `@page { margin: 0.33in 0.13in 0.46in 0.11in; }`.
- Apply 80% scaling to label dimensions.
- Ensure CSS allows vertical stacking with standard small gap between labels when printed on larger paper sizes.
- Run build and unit/integration tests to verify.

### Phase 3: Review & Empirical Verification (Reviewer + Challenger)
- Dispatch 2 `teamwork_preview_reviewer` subagents to perform static code analysis and test output verification.
- Dispatch 2 `teamwork_preview_challenger` subagents to run tests and verify rendering / HTML / CSS compliance.

### Phase 4: Forensic Audit (Auditor)
- Dispatch `teamwork_preview_auditor` for integrity verification.

### Phase 5: Synthesis & Reporting
- Synthesize all verdicts into `GATE_STATUS.md`.
- Report final outcome to parent.
