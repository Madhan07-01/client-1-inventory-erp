import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp, newId } from "@/lib/store";
import { cloud } from "@/lib/cloud";
import type { Warehouse, InventoryStock, InventoryTransaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ScanBarcode, ArrowDownUp, Download, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useScanner } from "@/hooks/useScanner";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductMasterManager } from "@/components/inventory/ProductMasterManager";
import { WarehouseManager } from "@/components/inventory/WarehouseManager";
import { Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

type AdjustData = {
  productId: string;
  warehouseId: string;
  locationId: string;
  type: "IN" | "OUT";
  qty: string;
  notes: string;
  remarks?: string;
  // Batch / variant fields
  lotNo: string;
  brandName: string;
  supplier: string;
  goodsFrom?: string;
  purchaseDate: string;
  purchaseRate: string;
  purchaseRef: string;
  size: string;
  grade: string;
  thread: string;
  threadType?: string;
  finish: string;
};

function emptyAdjust(): AdjustData {
  return {
    productId: "",
    warehouseId: "",
    locationId: "",
    type: "IN",
    qty: "",
    notes: "",
    remarks: "",
    lotNo: "",
    brandName: "",
    supplier: "",
    goodsFrom: "",
    purchaseDate: "",
    purchaseRate: "",
    purchaseRef: "",
    size: "",
    grade: "",
    thread: "",
    threadType: "",
    finish: "",
  };
}

function InventoryPage() {
  const settings = useApp((s) => s.settings);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const upsertInventoryStock = useApp((s) => s.upsertInventoryStock);
  const insertInventoryTransaction = useApp((s) => s.insertInventoryTransaction);
  const deleteInventoryStock = useApp((s) => s.deleteInventoryStock);
  const warehouses = useApp((s) => s.warehouses);

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<"PRODUCT_MASTER" | "FLAT_STOCK" | "PIVOT">("PIVOT");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [adjustData, setAdjustData] = useState<AdjustData>(emptyAdjust);

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

  function patch(p: Partial<AdjustData>) {
    setAdjustData((s) => ({ ...s, ...p }));
  }

  function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustData.productId || !adjustData.warehouseId || !adjustData.locationId || !adjustData.qty) {
      toast.error("Please fill Product, Warehouse, Location, and Quantity");
      return;
    }
    const qty = Number(adjustData.qty);
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const change = adjustData.type === "IN" ? qty : -qty;
    const now = new Date().toISOString();

    // For OUT: find an existing stock batch to decrement (match by product+warehouse+location+batch)
    const existingStock = inventoryStock.find(
      (s) =>
        s.productId === adjustData.productId &&
        s.warehouseId === adjustData.warehouseId &&
        s.locationId === adjustData.locationId &&
        (adjustData.lotNo ? s.lotNo === adjustData.lotNo : true),
    );

    const currentQty = existingStock?.quantity ?? 0;
    const newQty = currentQty + change;

    const newStock: InventoryStock = existingStock
      ? {
          ...existingStock,
          quantity: newQty,
          updatedAt: now,
          // Update batch fields if provided
          ...(adjustData.lotNo && { lotNo: adjustData.lotNo }),
          ...(adjustData.brandName && { brandName: adjustData.brandName }),
          ...((adjustData.goodsFrom || adjustData.supplier) && {
            supplier: adjustData.goodsFrom || adjustData.supplier,
            goodsFrom: adjustData.goodsFrom || adjustData.supplier,
          }),
          ...(adjustData.purchaseDate && { purchaseDate: adjustData.purchaseDate }),
          ...(adjustData.purchaseRate && { purchaseRate: Number(adjustData.purchaseRate) }),
          ...(adjustData.purchaseRef && { purchaseRef: adjustData.purchaseRef }),
          ...(adjustData.size && { size: adjustData.size }),
          ...(adjustData.grade && { grade: adjustData.grade }),
          ...((adjustData.threadType || adjustData.thread) && {
            thread: adjustData.threadType || adjustData.thread,
            threadType: adjustData.threadType || adjustData.thread,
          }),
          ...(adjustData.finish && { finish: adjustData.finish }),
          ...((adjustData.remarks || adjustData.notes) && {
            remarks: adjustData.remarks || adjustData.notes,
          }),
        }
      : {
          id: newId(),
          productId: adjustData.productId,
          warehouseId: adjustData.warehouseId,
          locationId: adjustData.locationId,
          quantity: newQty,
          updatedAt: now,
          lotNo: adjustData.lotNo || undefined,
          brandName: adjustData.brandName || undefined,
          supplier: adjustData.goodsFrom || adjustData.supplier || undefined,
          goodsFrom: adjustData.goodsFrom || adjustData.supplier || undefined,
          purchaseDate: adjustData.purchaseDate || undefined,
          purchaseRate: adjustData.purchaseRate ? Number(adjustData.purchaseRate) : undefined,
          purchaseRef: adjustData.purchaseRef || undefined,
          size: adjustData.size || undefined,
          grade: adjustData.grade || undefined,
          thread: adjustData.threadType || adjustData.thread || undefined,
          threadType: adjustData.threadType || adjustData.thread || undefined,
          finish: adjustData.finish || undefined,
          remarks: adjustData.remarks || adjustData.notes || undefined,
        };

    const txn: InventoryTransaction = {
      id: newId(),
      productId: adjustData.productId,
      warehouseId: adjustData.warehouseId,
      locationId: adjustData.locationId,
      quantityChange: change,
      transactionType: adjustData.type,
      referenceType: "MANUAL_ADJUSTMENT",
      notes: adjustData.remarks || adjustData.notes || undefined,
      remarks: adjustData.remarks || adjustData.notes || undefined,
      brandName: adjustData.brandName || undefined,
      goodsFrom: adjustData.goodsFrom || adjustData.supplier || undefined,
      supplier: adjustData.goodsFrom || adjustData.supplier || undefined,
      lotNo: adjustData.lotNo || undefined,
      threadType: adjustData.threadType || adjustData.thread || undefined,
      createdAt: now,
    };

    upsertInventoryStock(newStock);
    insertInventoryTransaction(txn);

    toast.success("Stock adjusted successfully!");
    setIsAdjusting(false);
    setAdjustData(emptyAdjust());
  }

  function handleExportCSV() {
    let csvStr = "";
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    if (exportType === "PRODUCT_MASTER") {
      const productTotals: Record<string, number> = {};
      inventoryStock.forEach((s) => {
        productTotals[s.productId] = (productTotals[s.productId] || 0) + s.quantity;
      });
      const headers = ["SKU", "Description", "Total Stock"];
      csvStr += headers.map(escapeCsv).join(",") + "\n";
      activeProducts.forEach((p) => {
        csvStr += [p.sku, p.description, productTotals[p.id] || 0].map(escapeCsv).join(",") + "\n";
      });
    } else if (exportType === "FLAT_STOCK") {
      const headers = ["Description", "SKU", "Warehouse", "Location", "Lot No", "Supplier", "Size", "Grade", "Thread", "Finish", "Purchase Rate", "Purchase Date", "Quantity"];
      csvStr += headers.map(escapeCsv).join(",") + "\n";
      stockView.forEach((s) => {
        const row = [s.productName, s.sku, s.warehouseName, s.locationName, s.lotNo, s.supplier, s.size, s.grade, s.thread, s.finish, s.purchaseRate, s.purchaseDate, s.quantity];
        csvStr += row.map(escapeCsv).join(",") + "\n";
      });
    } else if (exportType === "PIVOT") {
      const whNames = warehouses.map((w) => w.name);
      const headers = ["Description", "SKU", ...whNames, "Total Stock"];
      csvStr += headers.map(escapeCsv).join(",") + "\n";
      const pMap: Record<string, { desc: string; sku: string; whQty: Record<string, number>; total: number }> = {};
      activeProducts.forEach((p) => {
        pMap[p.id] = { desc: p.description, sku: p.sku || "", whQty: {}, total: 0 };
      });
      inventoryStock.forEach((s) => {
        const wh = warehouses.find((w) => w.id === s.warehouseId);
        if (!wh) return;
        const pRec = pMap[s.productId];
        if (pRec) {
          pRec.whQty[wh.name] = (pRec.whQty[wh.name] || 0) + s.quantity;
          pRec.total += s.quantity;
        }
      });
      Object.values(pMap).forEach((pRec) => {
        const row: (string | number)[] = [pRec.desc, pRec.sku];
        whNames.forEach((whName) => row.push(pRec.whQty[whName] || 0));
        row.push(pRec.total);
        csvStr += row.map(escapeCsv).join(",") + "\n";
      });
    }

    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Inventory_${exportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDialogOpen(false);
  }

  // Build a nice flattened view with batch details
  const stockView = inventoryStock.map((stock) => {
    const product = activeProducts.find((p) => p.id === stock.productId);
    const wh = warehouses.find((w) => w.id === stock.warehouseId);
    const loc = wh?.locations?.find((l) => l.id === stock.locationId);
    return {
      id: stock.id,
      productId: stock.productId,
      warehouseId: stock.warehouseId,
      locationId: stock.locationId,
      productName: product?.description || "Unknown Product",
      sku: product?.sku || "-",
      warehouseName: wh?.name || "Unknown WH",
      locationName: loc?.name || "Unknown Loc",
      quantity: stock.quantity,
      // Batch fields
      lotNo: stock.lotNo || "-",
      supplier: stock.supplier || "-",
      purchaseDate: stock.purchaseDate || "-",
      purchaseRate: stock.purchaseRate,
      purchaseRef: stock.purchaseRef || "-",
      size: stock.size || "-",
      grade: stock.grade || "-",
      thread: stock.thread || "-",
      finish: stock.finish || "-",
    };
  });

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppShell>
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        <Tabs defaultValue="ledger">
          <TabsList className="mb-6 flex overflow-x-auto whitespace-nowrap max-w-full justify-start gap-1 p-1">
            <TabsTrigger value="ledger" className="shrink-0">Stock Ledger</TabsTrigger>
            <TabsTrigger value="products" className="shrink-0">Product Master</TabsTrigger>
            <TabsTrigger value="warehouses" className="shrink-0">Warehouses & Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Inventory Ledger</h1>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Each row is one inventory batch (product + warehouse + lot).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setExportDialogOpen(true)} className="gap-2 w-full sm:w-auto">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
                <Button onClick={() => { setAdjustData(emptyAdjust()); setIsAdjusting(true); }} className="gap-2 w-full sm:w-auto">
                  <ScanBarcode className="w-4 h-4" />
                  Adjust Stock
                </Button>
              </div>
            </div>

            {isAdjusting && (
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <ArrowDownUp className="w-5 h-5 text-muted-foreground" />
                  Warehouse Ledger Adjustment
                </h2>
                <form onSubmit={handleAdjustSubmit} className="space-y-4">
                  {/* Core fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Product (Scan or Select)</Label>
                      <select
                        className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-white"
                        value={adjustData.productId}
                        onChange={(e) => patch({ productId: e.target.value })}
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
                          patch({ warehouseId: e.target.value, locationId: wh?.locations?.[0]?.id ?? "" });
                        }}
                      >
                        <option value="">— Select Warehouse —</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Location / Rack</Label>
                      <select
                        className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-white"
                        value={adjustData.locationId}
                        onChange={(e) => patch({ locationId: e.target.value })}
                        disabled={!adjustData.warehouseId}
                      >
                        <option value="">— Select Location —</option>
                        {warehouses
                          .find((w) => w.id === adjustData.warehouseId)
                          ?.locations?.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Type</Label>
                        <select
                          className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-white"
                          value={adjustData.type}
                          onChange={(e) => patch({ type: e.target.value as "IN" | "OUT" })}
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
                          onChange={(e) => patch({ qty: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Batch / Variant details */}
                  <div className="pt-4 border-t border-dashed">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Batch & Variant Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Lot Number</Label>
                        <Input className="mt-1" placeholder="e.g. LOT-2024-001" value={adjustData.lotNo} onChange={(e) => patch({ lotNo: e.target.value })} />
                      </div>
                      <div>
                        <Label>Brand Name</Label>
                        <Input className="mt-1" placeholder="e.g. TVS, Unbrako, LPS, Tata, ABC Fasteners" value={adjustData.brandName} onChange={(e) => patch({ brandName: e.target.value })} />
                      </div>
                      <div>
                        <Label>Goods From</Label>
                        <Input className="mt-1" placeholder="Supplier / Vendor name" value={adjustData.goodsFrom ?? adjustData.supplier} onChange={(e) => patch({ goodsFrom: e.target.value, supplier: e.target.value })} />
                      </div>
                      <div>
                        <Label>Purchase Date</Label>
                        <Input type="date" className="mt-1" value={adjustData.purchaseDate} onChange={(e) => patch({ purchaseDate: e.target.value })} />
                      </div>
                      <div>
                        <Label>Purchase Rate (₹)</Label>
                        <Input type="number" className="mt-1" placeholder="0.00" value={adjustData.purchaseRate} onChange={(e) => patch({ purchaseRate: e.target.value })} />
                      </div>
                      <div>
                        <Label>Purchase Reference</Label>
                        <Input className="mt-1" placeholder="Invoice / PO number" value={adjustData.purchaseRef} onChange={(e) => patch({ purchaseRef: e.target.value })} />
                      </div>
                      <div>
                        <Label>Size</Label>
                        <Input className="mt-1" placeholder="e.g. M10, M12" value={adjustData.size} onChange={(e) => patch({ size: e.target.value })} />
                      </div>
                      <div>
                        <Label>Grade</Label>
                        <Input className="mt-1" placeholder="e.g. 8.8, 10.9, SS304" value={adjustData.grade} onChange={(e) => patch({ grade: e.target.value })} />
                      </div>
                      <div>
                        <Label>Thread</Label>
                        <Select value={adjustData.threadType || adjustData.thread || ""} onValueChange={(val) => patch({ threadType: val, thread: val })}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select Thread" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full Thread">Full Thread</SelectItem>
                            <SelectItem value="Half Thread">Half Thread</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Finish</Label>
                        <Input className="mt-1" placeholder="e.g. HDG, Zinc, Black" value={adjustData.finish} onChange={(e) => patch({ finish: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label>Remarks</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Initial stock, Damaged goods, Manual recount"
                      value={adjustData.remarks ?? adjustData.notes}
                      onChange={(e) => patch({ remarks: e.target.value, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAdjusting(false)}>Cancel</Button>
                    <Button type="submit">Save Adjustment</Button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border rounded-lg overflow-x-auto w-full">
              <table className="w-full text-xs sm:text-sm min-w-[650px]">
                <thead className="bg-muted/50 text-left border-b">
                  <tr>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium w-8"></th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Product</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">SKU</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Warehouse</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Location</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Lot No</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Size</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium">Grade</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-right">Stock</th>
                    <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockView.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                        No stock records found. Click "Adjust Stock" to add inventory.
                      </td>
                    </tr>
                  ) : (
                    stockView.map((row, i) => {
                      const isExpanded = expandedRows.has(row.id || String(i));
                      const hasDetails = row.supplier !== "-" || row.finish !== "-" || row.thread !== "-" || row.purchaseRate;
                      return (
                        <>
                          <tr key={row.id || i} className="hover:bg-muted/20">
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-center">
                              {hasDetails && (
                                <button onClick={() => toggleRow(row.id || String(i))} className="text-muted-foreground hover:text-foreground">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium break-words max-w-[200px]">{row.productName}</td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-muted-foreground font-mono text-xs break-all">{row.sku}</td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">{row.warehouseName}</td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-muted-foreground whitespace-nowrap">{row.locationName}</td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-mono text-xs whitespace-nowrap">{row.lotNo}</td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">{row.size}</td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 whitespace-nowrap">{row.grade}</td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.quantity <= 0 ? "bg-red-100 text-red-800" : row.quantity < 10 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                                {row.quantity}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center justify-center gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Adjust Stock"
                                  onClick={() => {
                                    setAdjustData({
                                      ...emptyAdjust(),
                                      productId: row.productId,
                                      warehouseId: row.warehouseId,
                                      locationId: row.locationId,
                                      lotNo: row.lotNo !== "-" ? row.lotNo : "",
                                    });
                                    setIsAdjusting(true);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Delete Stock Record"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this ledger entry? This cannot be undone.")) {
                                      deleteInventoryStock(row.id as string);
                                      toast.success("Ledger entry deleted.");
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && hasDetails && (
                            <tr key={`${row.id}-detail`} className="bg-muted/10">
                              <td colSpan={10} className="px-4 py-3 sm:px-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                                  <div><span className="font-medium text-foreground">Supplier:</span> {row.supplier}</div>
                                  <div><span className="font-medium text-foreground">Purchase Date:</span> {row.purchaseDate}</div>
                                  <div><span className="font-medium text-foreground">Purchase Rate:</span> {row.purchaseRate ? `₹${row.purchaseRate}` : "-"}</div>
                                  <div><span className="font-medium text-foreground">Ref:</span> {row.purchaseRef}</div>
                                  <div><span className="font-medium text-foreground">Thread:</span> {row.thread}</div>
                                  <div><span className="font-medium text-foreground">Finish:</span> {row.finish}</div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
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

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Inventory Report</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={exportType} onValueChange={(v: any) => setExportType(v)}>
              <div className="flex items-start space-x-3 space-y-0 p-2">
                <RadioGroupItem value="PRODUCT_MASTER" id="r1" className="mt-1" />
                <div className="grid gap-1">
                  <Label htmlFor="r1" className="font-semibold">Product List (with Total Stock)</Label>
                  <p className="text-sm text-muted-foreground">All products and aggregated stock across all warehouses.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0 p-2">
                <RadioGroupItem value="FLAT_STOCK" id="r2" className="mt-1" />
                <div className="grid gap-1">
                  <Label htmlFor="r2" className="font-semibold">Flat Stock List (with Batch Details)</Label>
                  <p className="text-sm text-muted-foreground">Full ledger with lot, supplier, size, grade, finish, and purchase details per batch.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0 p-2">
                <RadioGroupItem value="PIVOT" id="r3" className="mt-1" />
                <div className="grid gap-1">
                  <Label htmlFor="r3" className="font-semibold">Warehouse Pivot Report</Label>
                  <p className="text-sm text-muted-foreground">One row per product with dedicated columns for each warehouse's stock.</p>
                </div>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
