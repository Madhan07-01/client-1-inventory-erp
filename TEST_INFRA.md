# E2E Test Infra: Madeena Traders ERP - Save as Draft

## Test Philosophy

- Opaque-box, requirement-driven. We test the application as an end-user through Playwright E2E tests, verifying user flows, UI visibility, and system state consistency.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory

| #   | Feature                         | Source (requirement)     | Tier 1 (Count) | Tier 2 (Count) | Tier 3 | Tier 4 |
| --- | ------------------------------- | ------------------------ | :------------: | :------------: | :----: | :----: |
| 1   | Save Draft Button & Form Saving | ORIGINAL_REQUEST R1      |       5        |       5        |   ✓    |   ✓    |
| 2   | Invoice Number Consumption      | ORIGINAL_REQUEST R1      |       5        |       5        |   ✓    |   ✓    |
| 3   | Auto-navigation after Save      | ORIGINAL_REQUEST R1      |       5        |       5        |   ✓    |   ✓    |
| 4   | Invoice List Filter by Default  | ORIGINAL_REQUEST R2      |       5        |       5        |   ✓    |   ✓    |
| 5   | 'Show Drafts' Toggle            | ORIGINAL_REQUEST R3      |       5        |       5        |   ✓    |   ✓    |
| 6   | Draft Badge Indicator           | ORIGINAL_REQUEST R4      |       5        |       5        |   ✓    |   ✓    |
| 7   | Dashboard Metrics Exclusion     | ORIGINAL_REQUEST Context |       5        |       5        |   ✓    |   ✓    |

## Test Architecture

- **Test Runner**: Playwright
- **Invocation**: `npx playwright test`
- **Pass/Fail Semantics**: 0 exit code indicates success; non-zero indicates failure.
- **Directory Layout**: All E2E tests live in `tests/` directory at the project root.
- **Mocking/State**: We interact with the UI elements directly, creating data via the UI forms and asserting page contents.

## Real-World Application Scenarios (Tier 4)

| #   | Scenario                             | Features Exercised         | Complexity |
| --- | ------------------------------------ | -------------------------- | ---------- |
| 1   | Complete Draft Lifecycle             | F1, F2, F3, F4, F5, F6     | Medium     |
| 2   | Multi-Warehouse Stock Isolation      | F1, F6                     | High       |
| 3   | Concurrent Invoice Number Generation | F1, F2                     | High       |
| 4   | Financial Metrics Verification       | F1, F7                     | Medium     |
| 5   | Edit Draft and Finalize              | F1, F2, F3, F4, F5, F6, F7 | High       |

## Coverage Thresholds

- Tier 1: Feature Coverage (≥5 per feature) -> Happy paths verifying each feature in isolation.
- Tier 2: Boundary & Corner Cases (≥5 per feature) -> Edge cases, e.g. empty/invalid inputs, duplicate numbers, deletion.
- Tier 3: Cross-Feature Combinations (pairwise coverage of major feature interactions).
- Tier 4: Real-world Workloads (≥5 realistic application scenarios).
