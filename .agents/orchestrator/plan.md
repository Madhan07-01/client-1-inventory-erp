# Execution Plan: Inventory Validation System (R1-R6)

## Milestone 1: Exploration & Codebase Analysis
- **Goal**: Thoroughly inspect `InvoiceEditor.tsx`, `invoices.index.tsx`, `store.ts`, Supabase setup, print/PDF generation code, product listing & search logic.
- **Worker**: `teamwork_preview_explorer` (Explorer 1)
- **Output**: `e:\Client 1\.agents\explorer_1\analysis.md` and `handoff.md` mapping out data structures, current stock handling, save/print triggers, and exact touch points for R1-R6.

## Milestone 2: Stock Badges & Search UI (R1 & R5)
- **Goal**: Add stock availability badges ("In Stock" green, "Low Stock" orange <=10, "Out of Stock" red 0) in product search/dropdowns. Display live available stock when product is selected in Invoice Editor.
- **Worker**: `teamwork_preview_worker` (Implementer 1)
- **Reviewer**: `teamwork_preview_reviewer` (Reviewer 1)

## Milestone 3: Out-of-Stock Prevention & Live Quantity Validation (R2 & R3)
- **Goal**: Prevent adding 0-stock products with warning toast/dialog. Live validate quantity typing (cap input at available stock, red border on field, inline error message). Disable "Save Invoice", "Print Invoice", and PDF export while quantity is invalid or stock unavailable.
- **Worker**: `teamwork_preview_worker` (Implementer 2)
- **Reviewer**: `teamwork_preview_reviewer` (Reviewer 2)

## Milestone 4: Final Pre-Save/Print Validation & Database Safety (R4 & R6)
- **Goal**: Perform network check against Supabase immediately before saving/printing. Abort save and show error dialog if stock changed concurrently. Ensure stock is deducted ONLY after successful invoice save. Guarantee no negative stock and preserve historical invoices.
- **Worker**: `teamwork_preview_worker` (Implementer 3)
- **Reviewer**: `teamwork_preview_reviewer` (Reviewer 3)

## Milestone 5: Verification, Challenger Testing & Forensic Audit
- **Goal**: Full E2E validation of R1-R6 acceptance criteria. Run build & test checks. Execute empirical challenge & forensic audit against cheating/facade implementations.
- **Workers**: `teamwork_preview_challenger`, `teamwork_preview_auditor`
