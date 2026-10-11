import { useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useApp } from "@/lib/store";
import type { ProductMasterEntry, InventoryStock } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Printer, Download, X, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cloud } from "@/lib/cloud";
import { printProductLabel, downloadProductLabel } from "@/components/ProductLabelPdf";

type EditableProduct = {
  id: string;
  sku: string;
  description: string;
  hsn: string;
  active: boolean;
  itemType: string;
};

function emptyProduct(): EditableProduct {
  return {
    id: "",
    sku: "",
    description: "",
    hsn: "7318",
    active: true,
    itemType: "",
  };
}

export function ProductMasterManager({ onViewStock }: { onViewStock?: (sku: string) => void }) {
  const products = useApp((s) => s.settings.productMaster);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const invoices = useApp((s) => s.invoices);
  const quotations = useApp((s) => s.quotations);
  const company = useApp((s) => s.settings.company);
  const upsertProduct = useApp((s) => s.upsertProductMaster);
  const deleteProductMaster = useApp((s) => s.deleteProductMaster);
  const deleteInventoryStock = useApp((s) => s.deleteInventoryStock);


  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [editing, setEditing] = useState<EditableProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = products.filter(p => viewMode === "active" ? (p.active !== false) : (p.active === false));
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        [p.description, p.sku, p.itemType, p.hsn].join(" ").toLowerCase().includes(q),
      );
    }
    return result;
  }, [products, query, viewMode]);

  function openEdit(p: ProductMasterEntry) {
    setEditing({
      id: p.id,
      sku: p.sku ?? "",
      description: p.description,
      hsn: p.hsn ?? "",
      active: p.active !== false,
      itemType: p.itemType ?? "",
    });
  }

  function handleSave() {
    if (!editing) return;
    if (!editing.sku.trim()) {
      toast.error("SKU / Product Code is required");
      return;
    }
    if (!editing.description.trim()) {
      toast.error("Product description is required");
      return;
    }
    if (!editing.itemType.trim()) {
      toast.error("Item Type is required");
      return;
    }
    
    const itemType = editing.itemType.trim();
    const sku = editing.sku.trim();
    upsertProduct({
      id: editing.id || undefined,
      sku,
      description: editing.description.trim(),
      hsn: editing.hsn.trim() || undefined,
      barcodeValue: sku,
      qrValue: sku,
      active: editing.active,
      itemType: itemType,
    });
    toast.success(editing.id ? "Product updated" : "Product added");
    setEditing(null);
  }

  const upsertInventoryStock = useApp((s) => s.upsertInventoryStock);

  /**
   * PERMANENT DELETE — erases the product from the catalogue and all its
   * stock variants from the ledger.
   * Blocked if the product has ever appeared in a saved invoice or quotation
   * (in that case the user should use the Archive / soft-delete button instead).
   */
  function handlePermanentDelete(p: ProductMasterEntry) {
    // Check invoices
    const usedInInvoice = invoices.some((inv) =>
      inv.items.some(
        (it) =>
          it.productId === p.id ||
          it.description.trim().toLowerCase() === p.description.trim().toLowerCase(),
      ),
    );
    // Check quotations
    const usedInQuotation = quotations.some((q) =>
      q.items.some(
        (it) =>
          it.productId === p.id ||
          it.description.trim().toLowerCase() === p.description.trim().toLowerCase(),
      ),
    );

    if (usedInInvoice || usedInQuotation) {
      toast.error(
        `Cannot delete "${p.description}" — it is referenced in ${usedInInvoice ? "invoices" : "quotations"}. Use the Archive button to hide it instead.`,
        { duration: 5000 },
      );
      return;
    }

    if (
      !confirm(
        `PERMANENTLY DELETE "${p.description}"?\n\nThis will also erase all ${inventoryStock.filter((s) => s.productId === p.id).length} stock batch(es) for this product.\n\nThis CANNOT be undone.`,
      )
    )
      return;

    // Delete all stock variants first
    inventoryStock
      .filter((s) => s.productId === p.id)
      .forEach((s) => {
        if (s.id) {
          deleteInventoryStock(s.id);
        }
      });

    // Then delete the product master entry
    deleteProductMaster(p.id);
    toast.success(`"${p.description}" permanently deleted.`);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(p.id);
      return next;
    });
  }



  function handleRestore(p: ProductMasterEntry) {
    const updated = { ...p, active: true };
    cloud.upsertProduct(updated).catch(console.error);
    upsertProduct(updated);

    // Cascade to stock
    inventoryStock.filter(s => s.productId === p.id && s.active === false).forEach(s => {
      const updatedStock = { ...s, active: true };
      cloud.upsertInventoryStock(updatedStock).catch(console.error);
      upsertInventoryStock(updatedStock);
    });

    toast.success("Product and its stock variants restored");
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(p.id);
      return next;
    });
  }

  function handleBulkRestore() {
    let restoredCount = 0;
    selectedIds.forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (p && !p.active) {
        const updated = { ...p, active: true };
        cloud.upsertProduct(updated).catch(console.error);
        upsertProduct(updated);
        restoredCount++;

        inventoryStock.filter(s => s.productId === p.id && s.active === false).forEach(s => {
          const updatedStock = { ...s, active: true };
          cloud.upsertInventoryStock(updatedStock).catch(console.error);
          upsertInventoryStock(updatedStock);
        });
      }
    });
    toast.success(`${restoredCount} products and their stock variants restored`);
    setSelectedIds(new Set());
  }

  function handleBulkArchive() {
    if (!confirm(`Are you sure you want to archive ${selectedIds.size} products? All associated stock variants will also be archived.`)) return;
    let archivedCount = 0;
    selectedIds.forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (p && p.active !== false) {
        const updated = { ...p, active: false };
        cloud.upsertProduct(updated).catch(console.error);
        upsertProduct(updated);
        archivedCount++;

        inventoryStock.filter(s => s.productId === p.id && s.active !== false).forEach(s => {
          const updatedStock = { ...s, active: false };
          cloud.upsertInventoryStock(updatedStock).catch(console.error);
          upsertInventoryStock(updatedStock);
        });
      }
    });
    toast.success(`${archivedCount} products and their stock variants archived`);
    setSelectedIds(new Set());
  }

  function getProductStock(productId: string) {
    return inventoryStock
      .filter((s) => s.productId === productId)
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  return (
    <div>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">Products</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your product catalogue and specifications.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setEditing(emptyProduct())} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 sm:static sm:bottom-auto bg-slate-800 text-white p-3 sm:rounded-lg shadow-lg z-50 flex items-center justify-between gap-4 sm:mb-4">
            <div className="text-sm font-medium">{selectedIds.size} Selected</div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {viewMode === "active" ? (
                <Button size="sm" variant="destructive" onClick={handleBulkArchive} className="whitespace-nowrap">
                  Archive Selected
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={handleBulkRestore} className="whitespace-nowrap text-black">
                  Restore Selected
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-slate-300 hover:text-white">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-white overflow-x-auto w-full">
          <div className="px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex bg-slate-100 p-1 rounded-md">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${viewMode === "active" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => { setViewMode("active"); setSelectedIds(new Set()); }}
              >
                Active
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${viewMode === "archived" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => { setViewMode("archived"); setSelectedIds(new Set()); }}
              >
                Deleted (Archived)
              </button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 px-3 py-1.5 rounded-md border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search description or SKU..."
                className="bg-transparent outline-none text-sm flex-1 min-w-[200px]"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {products.length === 0
                ? "No products yet. Add one to get started."
                : "No matches for your search."}
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm min-w-[550px]">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 h-4 w-4"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filtered.map((p) => p.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium">SKU</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium">Description</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium text-right">Total Stock</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium text-center">Status</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className={[
                      "border-b last:border-0 hover:bg-muted/40 transition-colors",
                      !p.active ? "opacity-50" : "",
                      selectedIds.has(p.id) ? "bg-muted/60" : "",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2.5 sm:px-5 sm:py-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 h-4 w-4"
                        checked={selectedIds.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-3 font-mono text-xs break-all">{p.sku || "—"}</td>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium break-words">{p.description}</td>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProductStock(p.id) <= 0 ? "bg-red-100 text-red-800" : getProductStock(p.id) < 10 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}
                      >
                        {getProductStock(p.id)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-center whitespace-nowrap">
                      <Badge
                        variant={p.active ? "default" : "secondary"}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewStock?.(p.sku || "")}
                          title="View Stock in Ledger"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const dummyBatch = { id: p.id, quantity: getProductStock(p.id) } as InventoryStock;
                            printProductLabel(dummyBatch, p, "Product Master", "N/A", undefined);
                          }}
                          title="Print Product Label"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => {
                            const dummyBatch = { id: p.id, quantity: getProductStock(p.id) } as InventoryStock;
                            downloadProductLabel(dummyBatch, p, "Product Master", "N/A", undefined);
                          }}
                          title="Download Product Label PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.active !== false ? (
                          <Button variant="ghost" size="sm" onClick={() => handlePermanentDelete(p)} title="Permanently Delete Product (only if unused in invoices)">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleRestore(p)} title="Restore Product">
                            <RotateCcw className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">SKU / Product Code *</Label>
                  <Input
                    value={editing.sku}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sku: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                      })
                    }
                    placeholder="e.g. BOLT-M10-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Item Type *</Label>
                  <Input
                    list="item-types"
                    value={editing.itemType}
                    onChange={(e) => setEditing({ ...editing, itemType: e.target.value })}
                    placeholder="Select or type..."
                  />
                  <datalist id="item-types">
                    <option value="bolt" />
                    <option value="nut" />
                    <option value="bolt- nut" />
                    <option value="spring washer" />
                    <option value="plate washer" />
                    <option value="bolt- nut spring washer" />
                    <option value="bolt- nut plate washer" />
                    <option value="bolt - nut one spring washer - one plate washer" />
                    <option value="bolt - nut one spring washer 2 plate washer" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Product Description *</Label>
                  <Input
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="e.g. Hex Bolt M10x50 SS"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">HSN / SAC Code</Label>
                  <Input
                    list="hsn-codes"
                    value={editing.hsn}
                    onChange={(e) => setEditing({ ...editing, hsn: e.target.value })}
                    placeholder="e.g. 7318"
                  />
                  <datalist id="hsn-codes">
                    <option value="7318">7318 (Screws/Bolts/Nuts)</option>
                    <option value="7204">7204 (Ferrous Waste/Scrap)</option>
                    <option value="7314">7314 (Cloth/Grill/Netting)</option>
                    <option value="7315">7315 (Chain/Parts)</option>
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <select
                    value={editing.active ? "active" : "inactive"}
                    onChange={(e) => setEditing({ ...editing, active: e.target.value === "active" })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
