import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useApp, newId } from "@/lib/store";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  index: number;
  raw: any;
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: number;
  type: "IN" | "OUT";
  category: "New" | "Acid";
  isValid: boolean;
  error?: string;
}

export function StockImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const productMaster = useApp((s) => s.settings.productMaster);
  const warehouses = useApp((s) => s.warehouses);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const upsertInventoryStock = useApp((s) => s.upsertInventoryStock);
  const insertInventoryTransaction = useApp((s) => s.insertInventoryTransaction);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        parseData(data);
      } catch (err) {
        console.error("Error reading excel:", err);
        toast.error("Failed to parse Excel file.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function parseData(data: any[]) {
    const parsed: ParsedRow[] = data.map((row, index) => {
      const p: ParsedRow = {
        index,
        raw: row,
        productId: "",
        warehouseId: "",
        locationId: "",
        quantity: 0,
        type: "IN",
        category: "Acid",
        isValid: false,
      };

      try {
        // Find Product (Case Insensitive)
        const skuStr = String(row["Product SKU / Size"] || row["SKU"] || row["Product"] || "").trim().toLowerCase();
        if (!skuStr) throw new Error("Missing Product SKU / Size");
        
        const product = productMaster.find(p => p.sku.toLowerCase() === skuStr || p.name.toLowerCase() === skuStr);
        if (!product) throw new Error(`Product not found: "${skuStr}"`);
        p.productId = product.id;

        // Find Warehouse (Case Insensitive)
        const whStr = String(row["Warehouse"] || "").trim().toLowerCase();
        if (!whStr) throw new Error("Missing Warehouse");
        
        const warehouse = warehouses.find(w => w.name.toLowerCase() === whStr);
        if (!warehouse) throw new Error(`Warehouse not found: "${whStr}"`);
        p.warehouseId = warehouse.id;

        // Find Location (Case Insensitive)
        const locStr = String(row["Location / Rack"] || row["Location"] || "").trim().toLowerCase();
        if (locStr) {
          const location = warehouse.locations?.find(l => l.name.toLowerCase() === locStr);
          if (!location) throw new Error(`Location not found: "${locStr}" in ${warehouse.name}`);
          p.locationId = location.id;
        }

        // Validate Quantity
        const qty = Number(row["Quantity"]);
        if (isNaN(qty) || qty <= 0) throw new Error("Invalid or missing Quantity (must be > 0)");
        p.quantity = qty;

        // Type
        const typeStr = String(row["Type"] || "IN").trim().toUpperCase();
        if (typeStr !== "IN" && typeStr !== "OUT") throw new Error("Type must be IN or OUT");
        p.type = typeStr as "IN" | "OUT";

        // Category
        const catStr = String(row["Category"] || "Acid").trim().toLowerCase();
        p.category = catStr === "new" ? "New" : "Acid";

        p.isValid = true;
      } catch (err: any) {
        p.isValid = false;
        p.error = err.message;
      }

      return p;
    });

    setRows(parsed);
  }

  async function handleImport() {
    setIsProcessing(true);
    const validRows = rows.filter(r => r.isValid);
    let imported = 0;

    for (const row of validRows) {
      try {
        const r = row.raw;
        const change = row.type === "IN" ? row.quantity : -row.quantity;
        const now = new Date().toISOString();

        // Check if existing stock matching criteria
        const lotNo = String(r["Lot Number"] || "");
        const size = String(r["Size"] || "");
        const grade = String(r["Grade"] || "");
        const thread = String(r["Thread"] || "");
        const finish = String(r["Finish"] || "");
        const category = row.category;
        
        const existingStock = inventoryStock.find(
          (s) =>
            s.productId === row.productId &&
            s.warehouseId === row.warehouseId &&
            s.locationId === row.locationId &&
            (s.lotNo || "") === lotNo &&
            (s.size || "") === size &&
            (s.grade || "") === grade &&
            (s.thread || "") === thread &&
            (s.finish || "") === finish &&
            (s.category || "Acid") === category
        );

        const newQty = (existingStock?.quantity ?? 0) + change;
        
        const custom1 = String(r["Custom Spec 1"] || "");
        const hide1 = String(r["Hide Spec 1"] || "").toLowerCase() === "yes";

        const newStock = existingStock
          ? {
              ...existingStock,
              quantity: newQty,
              updatedAt: now,
            }
          : {
              id: newId(),
              productId: row.productId,
              warehouseId: row.warehouseId,
              locationId: row.locationId,
              quantity: newQty,
              updatedAt: now,
              lotNo: lotNo || undefined,
              brandName: String(r["Brand"] || "") || undefined,
              supplier: String(r["Goods From"] || r["Supplier"] || "") || undefined,
              goodsFrom: String(r["Goods From"] || r["Supplier"] || "") || undefined,
              size: size || undefined,
              grade: grade || undefined,
              thread: thread || undefined,
              threadType: thread || undefined,
              finish: finish || undefined,
              remarks: String(r["Remarks"] || "") || undefined,
              category: category,
              customField1: custom1 || undefined,
              hideCustomField1: hide1,
            };

        const txn = {
          id: newId(),
          productId: row.productId,
          warehouseId: row.warehouseId,
          locationId: row.locationId,
          quantityChange: change,
          transactionType: row.type,
          referenceType: "IMPORT_EXCEL",
          notes: String(r["Remarks"] || "") || undefined,
          remarks: String(r["Remarks"] || "") || undefined,
          lotNo: lotNo || undefined,
          createdAt: now,
        };

        upsertInventoryStock(newStock);
        insertInventoryTransaction(txn as any);
        imported++;
      } catch (e) {
        console.error("Error importing row:", e);
      }
    }

    toast.success(`Successfully imported ${imported} valid rows!`);
    setIsProcessing(false);
    onSuccess();
    onOpenChange(false);
  }

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Stock Ledger</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFile}
          />
          <Button onClick={() => fileInputRef.current?.click()} className="gap-2 bg-slate-800 text-white hover:bg-slate-700">
            <Upload className="w-4 h-4" />
            Select Excel File
          </Button>
          <a href="/Book1- inventory.xlsx" download="Book1- inventory.xlsx" tabIndex={-1}>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Sample
            </Button>
          </a>
        </div>

        {rows.length > 0 && (
          <div className="flex-1 overflow-auto border rounded-md min-h-[300px]">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Product / SKU</th>
                  <th className="px-3 py-2 font-medium">Warehouse</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Error Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={i} className={r.isValid ? "hover:bg-slate-50" : "bg-red-50 hover:bg-red-100/50"}>
                    <td className="px-3 py-2">
                      {r.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{i + 2}</td>
                    <td className="px-3 py-2">{String(r.raw["Product SKU / Size"] || r.raw["SKU"] || "-")}</td>
                    <td className="px-3 py-2">{String(r.raw["Warehouse"] || "-")}</td>
                    <td className="px-3 py-2">{String(r.raw["Location / Rack"] || r.raw["Location"] || "-")}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.type === "IN" ? "default" : "secondary"} className="text-[10px]">
                        {r.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-medium">{r.raw["Quantity"] || "-"}</td>
                    <td className="px-3 py-2 text-xs text-red-600 font-medium">
                      {!r.isValid && (
                        <span>
                          {r.error}. <br/>
                          <span className="text-slate-600 font-normal">Try correcting the spelling or add manually.</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <div className="text-sm">
              <span className="font-semibold text-green-700">{validCount} valid</span>,{" "}
              <span className="font-semibold text-red-600">{invalidCount} errors</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setRows([])}>Clear</Button>
              <Button 
                onClick={handleImport} 
                disabled={isProcessing || validCount === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Import {validCount} Valid Rows
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
