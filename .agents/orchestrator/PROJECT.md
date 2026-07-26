# Project: Madeena Traders ERP - Inventory Validation System (R1-R6)

## Architecture
- React + Vite application with TanStack Router
- Zustand store (`src/lib/store.ts` / `useApp`) for local/global app state
- Supabase integration for backend persistence & inventory state
- Tailwind CSS & shadcn/ui components

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture Analysis | Map existing stock retrieval, InvoiceEditor form, store & Supabase save/print flows | none | IN_PROGRESS |
| 2 | Stock Badges & Search UI (R1, R5) | Display available stock live in editor & badges in product selection dropdowns | M1 | PLANNED |
| 3 | Out-of-Stock Prevention & Live Quantity Validation (R2, R3) | Prevent 0-stock add, live quantity validation, input capping, red border, button disabling | M2 | PLANNED |
| 4 | Pre-Save/Print Network Verification & Database Safety (R4, R6) | Supabase stock re-check pre-save/print, block concurrent overselling, atomic deduction | M3 | PLANNED |
| 5 | Comprehensive Verification & Forensic Audit | Verification across all requirements, UI integrity check, zero-bypass audit | M4 | PLANNED |

## Interface Contracts
- `Product`: `{ id: string, name: string, stock: number, price: number, ... }`
- `InvoiceItem`: `{ productId: string, quantity: number, price: number, ... }`
- `Invoice`: `{ id: string, items: InvoiceItem[], isDraft?: boolean, ... }`
- Supabase queries/actions for live stock checks & inventory updates.

## Code Layout
- `src/components/InvoiceEditor.tsx` — Main invoice editing form and item management
- `src/routes/_authenticated/invoices.index.tsx` — Invoice list page
- `src/lib/store.ts` — Zustand store definition
- `src/lib/` — Backend queries, supabase client & helper services
