import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp, newId } from "@/lib/store";
import { cloud } from "@/lib/cloud";
import type { Warehouse, InventoryStock, InventoryTransaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, ScanBarcode, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { useScanner } from "@/hooks/useScanner";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductMasterManager } from "@/components/inventory/ProductMasterManager";
import { WarehouseManager } from "@/components/inventory/WarehouseManager";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const settings = useApp((s) => s.settings);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const upsertInventoryStock = useApp((s) => s.upsertInventoryStock);
  const insertInventoryTransaction = useApp((s) => s.insertInventoryTransaction);
  const warehouses = useApp((s) => s.warehouses);

  const [isAdjusting, setIsAdjusting] = useState(false);

  const [adjustData, setAdjustData] = useState({
    productId: "",
    warehouseId: "",
    locationId: "",
    type: "IN" as "IN" | "OUT",
    qty: "",
    notes: "",
  });

  const activeProducts = settings.productMaster.filter((p) => p.active);

  useScanner({
    onScan: (barcode) => {
      if (!isAdjusting) return;
      const match = activeProducts.find(
        (p) => p.sku === barcode || p.barcodeValue === barcode || p.qrValue === barcode,
      );
      if (match) {
        setAdjustData((s) => ({ ...s, productId: match.id }));
        toast.success(`Scanned: ${match.description}`);
      } else {
        toast.error(`Product not found for barcode: ${barcode}`);
      }
    },
  });

  function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !adjustData.productId ||
      !adjustData.warehouseId ||
      !adjustData.locationId ||
      !adjustData.qty
    ) {
      toast.error("Please fill all fields");
      return;
    }

    const qty = Number(adjustData.qty);
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const existingStock = inventoryStock.find(
      (s) =>
        s.productId === adjustData.productId &&
        s.warehouseId === adjustData.warehouseId &&
        s.locationId === adjustData.locationId,
    );

    const currentQty = existingStock?.quantity ?? 0;
    const change = adjustData.type === "IN" ? qty : -qty;
    const newQty = currentQty + change;

    const now = new Date().toISOString();

    const newStock: InventoryStock = existingStock
      ? { ...existingStock, quantity: newQty, updatedAt: now }
      : {
          id: newId(),
          productId: adjustData.productId,
          warehouseId: adjustData.warehouseId,
          locationId: adjustData.locationId,
          quantity: newQty,
          updatedAt: now,
        };

    const txn: InventoryTransaction = {
      id: newId(),
      productId: adjustData.productId,
      warehouseId: adjustData.warehouseId,
      locationId: adjustData.locationId,
      quantityChange: change,
      transactionType: adjustData.type,
      referenceType: "MANUAL_ADJUSTMENT",
      notes: adjustData.notes,
      createdAt: now,
    };

    upsertInventoryStock(newStock);
    insertInventoryTransaction(txn);

    toast.success("Stock adjusted successfully!");
    setIsAdjusting(false);
    setAdjustData({
      productId: "",
      warehouseId: "",
      locationId: "",
      type: "IN",
      qty: "",
      notes: "",
    });
  }

  // Build a nice flattened view
  const stockView = inventoryStock.map((stock) => {
    const product = activeProducts.find((p) => p.id === stock.productId);
    const wh = warehouses.find((w) => w.id === stock.warehouseId);
    const loc = wh?.locations?.find((l) => l.id === stock.locationId);
    return {
      id: stock.id,
      productName: product?.description || "Unknown Product",
      sku: product?.sku || "-",
      warehouseName: wh?.name || "Unknown WH",
      locationName: loc?.name || "Unknown Loc",
      quantity: stock.quantity,
    };
  });

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Tabs defaultValue="ledger">
          <TabsList className="mb-6">
            <TabsTrigger value="ledger">Stock Ledger</TabsTrigger>
            <TabsTrigger value="products">Product Master</TabsTrigger>
            <TabsTrigger value="warehouses">Warehouses & Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Inventory Ledger</h1>
                <p className="text-muted-foreground text-sm">
                  Track physical stock across warehouses.
                </p>
              </div>
              <Button onClick={() => setIsAdjusting(true)} className="gap-2">
                <ScanBarcode className="w-4 h-4" />
                Adjust Stock
              </Button>
            </div>

            {isAdjusting && (
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <ArrowDownUp className="w-5 h-5 text-muted-foreground" />
                  Manual Stock Adjustment
                </h2>
                <form onSubmit={handleAdjustSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Product (Scan or Select)</Label>
                      <select
                        className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-white"
                        value={adjustData.productId}
                        onChange={(e) =>
                          setAdjustData((s) => ({ ...s, productId: e.target.value }))
                        }
                      >
                        <option value="">— Select Product —</option>
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.description} {p.sku ? `(${p.sku})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Warehouse</Label>
                      <select
                        className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-white"
                        value={adjustData.warehouseId}
                        onChange={(e) => {
                          const wh = warehouses.find((w) => w.id === e.target.value);
                          setAdjustData((s) => ({
                            ...s,
                            warehouseId: e.target.value,
                            locationId: wh?.locations?.[0]?.id ?? "",
                          }));
                        }}
                      >
                        <option value="">— Select Warehouse —</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Location</Label>
                      <select
                        className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-white"
                        value={adjustData.locationId}
                        onChange={(e) =>
                          setAdjustData((s) => ({ ...s, locationId: e.target.value }))
                        }
                        disabled={!adjustData.warehouseId}
                      >
                        <option value="">— Select Location —</option>
                        {warehouses
                          .find((w) => w.id === adjustData.warehouseId)
                          ?.locations?.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Type</Label>
                        <select
                          className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-white"
                          value={adjustData.type}
                          onChange={(e) =>
                            setAdjustData((s) => ({ ...s, type: e.target.value as "IN" | "OUT" }))
                          }
                        >
                          <option value="IN">IN (Add Stock)</option>
                          <option value="OUT">OUT (Remove Stock)</option>
                        </select>
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          className="mt-1"
                          value={adjustData.qty}
                          onChange={(e) => setAdjustData((s) => ({ ...s, qty: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Label>Notes / Reason</Label>
                      <Input
                        className="mt-1"
                        placeholder="e.g. Initial stock, Damaged goods, Manual recount"
                        value={adjustData.notes}
                        onChange={(e) => setAdjustData((s) => ({ ...s, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAdjusting(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Adjustment</Button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Warehouse</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium text-right">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockView.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No stock records found. Click "Adjust Stock" to add inventory.
                      </td>
                    </tr>
                  ) : (
                    stockView.map((row, i) => (
                      <tr key={row.id || i} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{row.productName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.sku}</td>
                        <td className="px-4 py-3">{row.warehouseName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.locationName}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.quantity < 10 ? (row.quantity <= 0 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800") : "bg-green-100 text-green-800"}`}
                          >
                            {row.quantity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <ProductMasterManager />
          </TabsContent>

          <TabsContent value="warehouses">
            <WarehouseManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
