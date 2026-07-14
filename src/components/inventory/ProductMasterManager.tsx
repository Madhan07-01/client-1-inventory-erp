import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { ProductMasterEntry } from "@/lib/types";
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
import { Plus, Pencil, Trash2, Search, Printer } from "lucide-react";
import { toast } from "sonner";
import { cloud } from "@/lib/cloud";
import { printProductLabel } from "@/components/ProductLabelPdf";
import { useScanner } from "@/hooks/useScanner";

type EditableProduct = {
  id: string;
  sku: string;
  description: string;
  hsn: string;
  gstPercent: number;
  defaultRate: number | undefined;
  active: boolean;
  lotNo?: string;
  goodsFrom?: string;
  size?: string;
  tread?: string;
  grade?: string;
  finish?: string;
  head?: string;
};

function emptyProduct(): EditableProduct {
  return {
    id: "",
    sku: "",
    description: "",
    hsn: "",
    gstPercent: 18,
    defaultRate: undefined,
    active: true,
    lotNo: "",
    goodsFrom: "",
    size: "",
    tread: "",
    grade: "",
    finish: "",
    head: "",
  };
}

export function ProductMasterManager() {
  const products = useApp((s) => s.settings.productMaster);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const company = useApp((s) => s.settings.company);
  const upsertProduct = useApp((s) => s.upsertProductMaster);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditableProduct | null>(null);

  useScanner({
    onScan: (barcode) => {
      setQuery(barcode);
      toast.info(`Searched for barcode: ${barcode}`);
    },
    // We do want to ignore when focused on an input so they can type freely,
    // but the scanner hook handles that by default.
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.description, p.sku, p.hsn].join(" ").toLowerCase().includes(q),
    );
  }, [products, query]);

  function openEdit(p: ProductMasterEntry) {
    setEditing({
      id: p.id,
      sku: p.sku ?? "",
      description: p.description,
      hsn: p.hsn,
      gstPercent: p.gstPercent,
      defaultRate: p.defaultRate,
      active: p.active ?? true,
      lotNo: p.lotNo ?? "",
      goodsFrom: p.goodsFrom ?? "",
      size: p.size ?? "",
      tread: p.tread ?? "",
      grade: p.grade ?? "",
      finish: p.finish ?? "",
      head: p.head ?? "",
    });
  }

  function handleSave() {
    if (!editing) return;
    if (!editing.description.trim()) {
      toast.error("Product description is required");
      return;
    }
    const sku = editing.sku.trim() || undefined;
    upsertProduct({
      sku,
      description: editing.description.trim(),
      hsn: editing.hsn.trim(),
      gstPercent: editing.gstPercent,
      defaultRate: editing.defaultRate,
      barcodeValue: sku,
      qrValue: sku,
      lotNo: editing.lotNo?.trim() || undefined,
      goodsFrom: editing.goodsFrom?.trim() || undefined,
      size: editing.size?.trim() || undefined,
      tread: editing.tread?.trim() || undefined,
      grade: editing.grade?.trim() || undefined,
      finish: editing.finish?.trim() || undefined,
      head: editing.head?.trim() || undefined,
    });
    toast.success(editing.id ? "Product updated" : "Product added");
    setEditing(null);
  }

  async function handleDelete(p: ProductMasterEntry) {
    if (!confirm(`Delete "${p.description}"?`)) return;
    try {
      // Soft-delete by setting active = false and syncing
      const updated = { ...p, active: false };
      await cloud.upsertProduct(updated);
      // Also update local store
      upsertProduct({
        sku: updated.sku,
        description: updated.description,
        hsn: updated.hsn,
        gstPercent: updated.gstPercent,
        defaultRate: updated.defaultRate,
        barcodeValue: updated.barcodeValue,
        qrValue: updated.qrValue,
        lotNo: updated.lotNo,
        goodsFrom: updated.goodsFrom,
        size: updated.size,
        tread: updated.tread,
        grade: updated.grade,
        finish: updated.finish,
        head: updated.head,
      });
      toast.success("Product deactivated");
    } catch {
      toast.error("Failed to delete product");
    }
  }

  function handleToggleActive(p: ProductMasterEntry) {
    const updated = { ...p, active: !p.active };
    cloud.upsertProduct(updated).catch(() => toast.error("Sync failed"));
    upsertProduct({
      sku: updated.sku,
      description: updated.description,
      hsn: updated.hsn,
      gstPercent: updated.gstPercent,
      defaultRate: updated.defaultRate,
      barcodeValue: updated.barcodeValue,
      qrValue: updated.qrValue,
      lotNo: updated.lotNo,
      goodsFrom: updated.goodsFrom,
      size: updated.size,
      tread: updated.tread,
      grade: updated.grade,
      finish: updated.finish,
      head: updated.head,
    });
    toast.success(updated.active ? "Product activated" : "Product deactivated");
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
              Manage your product master catalog.
            </p>
          </div>
          <Button onClick={() => setEditing(emptyProduct())} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by description, SKU, or HSN..."
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
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">HSN</th>
                  <th className="px-5 py-3 font-medium">GST %</th>
                  <th className="px-5 py-3 font-medium">Rate</th>
                  <th className="px-5 py-3 font-medium text-right">Stock</th>
                  <th className="px-5 py-3 font-medium text-center">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className={[
                      "border-b last:border-0 hover:bg-muted/40",
                      !p.active ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-5 py-3 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-5 py-3 font-medium">{p.description}</td>
                    <td className="px-5 py-3 font-mono text-xs">{p.hsn || "—"}</td>
                    <td className="px-5 py-3">{p.gstPercent}%</td>
                    <td className="px-5 py-3">
                      {p.defaultRate != null ? `₹${p.defaultRate}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProductStock(p.id) < 10 ? (getProductStock(p.id) <= 0 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800") : "bg-green-100 text-green-800"}`}
                      >
                        {getProductStock(p.id)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button type="button" onClick={() => handleToggleActive(p)}>
                        <Badge
                          variant={p.active ? "default" : "secondary"}
                          className="cursor-pointer"
                        >
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => printProductLabel(p, company)}
                          title="Print Label"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="SKU / Product Code">
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
              </Field>
              <Field label="Description">
                <Input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="e.g. Hex Bolt M10x50 SS"
                />
              </Field>
              <Field label="HSN Code">
                <Input
                  value={editing.hsn}
                  onChange={(e) => setEditing({ ...editing, hsn: e.target.value })}
                  placeholder="e.g. 7318"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="GST %">
                  <Input
                    type="number"
                    value={editing.gstPercent}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        gstPercent: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Default Rate (₹)">
                  <Input
                    type="number"
                    value={editing.defaultRate ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        defaultRate: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="Optional"
                  />
                </Field>
              </div>

              <div className="pt-4 mt-4 border-t border-dashed">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                  Admin Details (Optional)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lot No">
                    <Input
                      value={editing.lotNo}
                      onChange={(e) => setEditing({ ...editing, lotNo: e.target.value })}
                    />
                  </Field>
                  <Field label="Goods From">
                    <Input
                      value={editing.goodsFrom}
                      onChange={(e) => setEditing({ ...editing, goodsFrom: e.target.value })}
                    />
                  </Field>
                  <Field label="Size">
                    <Input
                      value={editing.size}
                      onChange={(e) => setEditing({ ...editing, size: e.target.value })}
                    />
                  </Field>
                  <Field label="Tread (half/full/long)">
                    <Input
                      value={editing.tread}
                      onChange={(e) => setEditing({ ...editing, tread: e.target.value })}
                    />
                  </Field>
                  <Field label="Grade">
                    <Input
                      value={editing.grade}
                      onChange={(e) => setEditing({ ...editing, grade: e.target.value })}
                    />
                  </Field>
                  <Field label="Finish (HDG)">
                    <Input
                      value={editing.finish}
                      onChange={(e) => setEditing({ ...editing, finish: e.target.value })}
                    />
                  </Field>
                  <Field label="Head">
                    <Input
                      value={editing.head}
                      onChange={(e) => setEditing({ ...editing, head: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              {editing.sku && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div>
                    Barcode (Code 128):{" "}
                    <span className="font-mono font-medium text-foreground">{editing.sku}</span>
                  </div>
                  <div>
                    QR Code:{" "}
                    <span className="font-mono font-medium text-foreground">{editing.sku}</span>
                  </div>
                </div>
              )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
