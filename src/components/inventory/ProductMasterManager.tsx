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
import { Plus, Pencil, Trash2, Search, Printer, Download, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cloud } from "@/lib/cloud";
import { printProductLabel, downloadProductLabel } from "@/components/ProductLabelPdf";

type EditableProduct = {
  id: string;
  sku: string;
  description: string;
  hsn: string;
  brandName: string;
  active: boolean;
  itemType: string;
};

function emptyProduct(): EditableProduct {
  return {
    id: "",
    sku: "",
    description: "",
    hsn: "",
    brandName: "",
    active: true,
    itemType: "Bolt Nut",
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

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditableProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ProductMasterEntry | null>(null);
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.description, p.sku, p.itemType, p.hsn, p.brandName].join(" ").toLowerCase().includes(q),
    );
  }, [products, query]);

  function openEdit(p: ProductMasterEntry) {
    setEditing({
      id: p.id,
      sku: p.sku ?? "",
      description: p.description,
      hsn: p.hsn ?? "",
      brandName: p.brandName ?? "",
      active: p.active ?? true,
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
    const itemType = editing.itemType || "Bolt Nut";
    const sku = editing.sku.trim();
    upsertProduct({
      id: editing.id || undefined,
      sku,
      description: editing.description.trim(),
      hsn: editing.hsn.trim() || undefined,
      brandName: editing.brandName.trim() || undefined,
      barcodeValue: sku,
      qrValue: sku,
      active: editing.active,
      itemType: itemType,
    });
    toast.success(editing.id ? "Product updated" : "Product added");
    setEditing(null);
  }

  function isProductReferenced(productId: string) {
    const inStock = inventoryStock.some((s) => s.productId === productId);
    const inInvoices = invoices.some((inv) => inv.items.some((item) => item.productId === productId));
    const inQuotations = quotations.some((q) => q.items.some((item) => item.productId === productId));
    return inStock || inInvoices || inQuotations;
  }

  function handleDeleteClick(p: ProductMasterEntry) {
    if (isProductReferenced(p.id)) {
      setDeleteBlockedMsg(`"${p.description}" is referenced in invoices, quotations, or stock records. It cannot be deleted. You can mark it as Inactive instead.`);
    } else {
      setDeleteTarget(p);
    }
  }

  function executeDelete() {
    if (!deleteTarget) return;
    deleteProductMaster(deleteTarget.id);
    toast.success("Product deleted successfully");
    setDeleteTarget(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
  }

  function handleBulkActivate() {
    selectedIds.forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (p && !p.active) {
        const updated = { ...p, active: true };
        cloud.upsertProduct(updated).catch(console.error);
        upsertProduct({ ...updated, active: true });
      }
    });
    toast.success(`${selectedIds.size} products activated`);
    setSelectedIds(new Set());
  }

  function handleBulkDeactivate() {
    selectedIds.forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (p && p.active) {
        const updated = { ...p, active: false };
        cloud.upsertProduct(updated).catch(console.error);
        upsertProduct({ ...updated, active: false });
      }
    });
    toast.success(`${selectedIds.size} products deactivated`);
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    let deletedCount = 0;
    let skippedCount = 0;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected products? Referenced products will be skipped.`)) return;

    selectedIds.forEach((id) => {
      if (isProductReferenced(id)) {
        skippedCount++;
      } else {
        deleteProductMaster(id);
        deletedCount++;
      }
    });

    if (skippedCount > 0) {
      toast.warning(`Deleted ${deletedCount} products. ${skippedCount} skipped (referenced).`);
    } else {
      toast.success(`Deleted ${deletedCount} products.`);
    }
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
              <Button size="sm" variant="secondary" onClick={handleBulkActivate} className="whitespace-nowrap">
                Activate
              </Button>
              <Button size="sm" variant="secondary" onClick={handleBulkDeactivate} className="whitespace-nowrap">
                Deactivate
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="whitespace-nowrap">
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-slate-300 hover:text-white">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-white overflow-x-auto w-full">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by description or SKU..."
              className="bg-transparent outline-none text-sm flex-1"
            />
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
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                  <select
                    value={editing.itemType}
                    onChange={(e) => setEditing({ ...editing, itemType: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select Item Type</option>
                    <option value="Bolt Nut">Bolt Nut</option>
                    <option value="Bolt Nut Washer Set">Bolt Nut Washer Set</option>
                    <option value="Only Bolt">Only Bolt</option>
                  </select>
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
                  <Select
                    value={editing.hsn || undefined}
                    onValueChange={(val) => setEditing({ ...editing, hsn: val === "other" ? "" : val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="e.g. 7318" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7318">7318 (Screws/Bolts/Nuts)</SelectItem>
                      <SelectItem value="7204">7204 (Ferrous Waste/Scrap)</SelectItem>
                      <SelectItem value="7314">7314 (Cloth/Grill/Netting)</SelectItem>
                      <SelectItem value="7315">7315 (Chain/Parts)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Brand Name</Label>
                  <Input
                    value={editing.brandName}
                    onChange={(e) => setEditing({ ...editing, brandName: e.target.value })}
                    placeholder="e.g. TVS"
                  />
                </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Product
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              Are you sure you want to delete <strong>{deleteTarget?.description}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Blocked Dialog */}
      <Dialog open={!!deleteBlockedMsg} onOpenChange={(o) => !o && setDeleteBlockedMsg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cannot Delete Product</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm">{deleteBlockedMsg}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setDeleteBlockedMsg(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
