# Context & Key Discoveries

## Requirements Summary (R1-R6)
- **R1**: Display real-time available stock in Invoice Editor when product is selected.
- **R2**: Prevent adding 0-stock products with warning toast/dialog; do not add row or change stock.
- **R3**: Live validation of typed quantity vs stock; cap input or block typing above stock; red border + error text; disable Save/Print/PDF.
- **R4**: Pre-save & pre-print Supabase stock re-check; cancel & display error dialog if stock changed concurrently; deduct stock ONLY after successful save.
- **R5**: Product dropdown/search badges ("In Stock" green, "Low Stock" orange <=10, "Out of Stock" red 0); 0-stock items selectable to trigger R2 warning toast.
- **R6**: Negative stock impossible; historical invoices/inventory history untouched; UI layout/theme preserved.

## Active Subagents
- None currently active.

## Artifacts & References
- `e:\Client 1\ORIGINAL_REQUEST.md`
- `e:\Client 1\.agents\orchestrator\PROJECT.md`
