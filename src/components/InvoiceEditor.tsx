import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, FileDown, Save, Printer, FileText, Check, Layers, AlertTriangle } from "lucide-react";
import { useApp, newId } from "@/lib/store";
import type { Invoice, InvoiceItem, InventoryStock, SupplyType } from "@/lib/types";
import { cloud } from "@/lib/cloud";
import { computeTotals, formatINR, lineTotal, lineSubtotal, numberToIndianWords } from "@/lib/calc";
import { downloadInvoicePdf, printInvoicePdf } from "@/components/InvoicePdf";
import { toast } from "sonner";
import { CameraScannerDialog } from "@/components/CameraScannerDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function blankItem(): InvoiceItem {
  return {
    id: newId(),
    description: "",
    condition: "",
    hsn: "",
    quantity: null,
    unit: "",
    price: null,
    gstPercent: null,
  };
}

/**
 * Extract a valid GSTIN state code (first two chars) or return null.
 * Requires 15-char GSTIN with a numeric state code in 01–38.
 */
function extractGstStateCode(gstin: string | undefined | null): string | null {
  if (!gstin || gstin.length !== 15) return null;
  const code = gstin.slice(0, 2);
  if (!/^\d{2}$/.test(code)) return null;
  const n = parseInt(code, 10);
  if (n < 1 || n > 38) return null;
  return code;
}

export function buildBlankInvoice(args: {
  number: string;
  company: Invoice["company"];
  bank: Invoice["bank"];
  defaultGst: number;
  gstMode: Invoice["gstMode"];
}): Invoice {
  return {
    id: newId(),
    number: args.number,
    date: new Date().toISOString().slice(0, 10),
    lifecycle: "ACTIVE",
    customer: {
      id: "",
      name: "",
      phone: "",
      gstin: "",
      address: "",
      state: "",
    },
    company: args.company,
    bank: args.bank,
    items: [blankItem()],
    notes: "",
    placeOfSupply: args.company.state,
    gstMode: args.gstMode,
    supplyType: args.gstMode === "IGST" ? "OTHER_STATE" : "WITHIN_STATE",
    supplyTypeManual: false,
    createdAt: new Date().toISOString(),
    ewayBillNumber: "",
    transportMode: "",
    dispatchFrom: { address: "", city: "", state: "", pincode: "" },
    shipTo: { city: "", state: "", pincode: "" },
    packages: undefined,
    weight: "",
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: args.defaultGst || 18,
    taxOverride: false,
  };
}

export function InvoiceEditor({ initial, mode }: { initial: Invoice; mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const settings = useApp((s) => s.settings);
  const customers = useApp((s) => s.customers);
  const invoices = useApp((s) => s.invoices);
  const saveInvoice = useApp((s) => s.saveInvoice);
  const consumeInvoiceNumber = useApp((s) => s.consumeInvoiceNumber);
  const addCustomer = useApp((s) => s.addCustomer);
  const upsertProductMaster = useApp((s) => s.upsertProductMaster);

  const [inv, setInv] = useState<Invoice>(initial);
  const [saveAsCustomer, setSaveAsCustomer] = useState(true);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const warehouses = useApp((s) => s.warehouses);
  const inventoryStock = useApp((s) => s.inventoryStock);

  useEffect(() => {
    setInv(initial);
  }, [initial.id]);

  const totals = useMemo(() => computeTotals(inv), [inv]);
  const activeProducts = settings.productMaster.filter((p) => p.active);

  // --- Batch picker state ---
  const [batchPickerItemId, setBatchPickerItemId] = useState<string | null>(null);
  const [batchPickerProductId, setBatchPickerProductId] = useState<string | null>(null);

  // Build HSN history (unique, from all invoices, no duplicates)
  const hsnHistory = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const inv of invoices) {
      for (const it of inv.items) {
        if (it.hsn && !seen.has(it.hsn)) {
          seen.add(it.hsn);
          list.push(it.hsn);
        }
      }
    }
    return list;
  }, [invoices]);

  // Get batches for a given product across warehouses
  function getBatchesForProduct(productId: string): InventoryStock[] {
    return inventoryStock.filter(
      (s) =>
        s.productId === productId &&
        s.quantity > 0 &&
        (inv.dispatchWarehouseId ? s.warehouseId === inv.dispatchWarehouseId : true) &&
        (inv.dispatchLocationId ? s.locationId === inv.dispatchLocationId : true),
    );
  }

  function getOldestBatchIdForProduct(productId: string): string | undefined {
    const batches = getBatchesForProduct(productId);
    if (batches.length === 0) return undefined;
    const sorted = [...batches].sort((a, b) => {
      const dateA = a.purchaseDate || "9999-12-31";
      const dateB = b.purchaseDate || "9999-12-31";
      return dateA.localeCompare(dateB);
    });
    return sorted[0].id;
  }

  // Format a batch label
  function batchLabel(batch: InventoryStock): string {
    const wh = warehouses.find((w) => w.id === batch.warehouseId);
    const loc = wh?.locations?.find((l) => l.id === batch.locationId);
    const parts: string[] = [];
    if (batch.size) parts.push(`Size: ${batch.size}`);
    if (batch.grade) parts.push(`Grade: ${batch.grade}`);
    if (batch.finish) parts.push(`Finish: ${batch.finish}`);
    if (batch.thread) parts.push(`Thread: ${batch.thread}`);
    if (batch.lotNo) parts.push(`Lot: ${batch.lotNo}`);
    if (wh) parts.push(`WH: ${wh.name}`);
    if (loc) parts.push(`Loc: ${loc.name}`);
    return `${parts.join(" · ")} | Qty: ${batch.quantity}`;
  }

  const getAvailableStock = (description: string) => {
    const p = activeProducts.find(
      (x) => x.description.trim().toLowerCase() === description.trim().toLowerCase(),
    );
    if (!p) return null;
    let relevantStock = inventoryStock.filter((s) => s.productId === p.id);
    if (inv.dispatchWarehouseId) {
      relevantStock = relevantStock.filter((s) => s.warehouseId === inv.dispatchWarehouseId);
    }
    if (inv.dispatchLocationId) {
      relevantStock = relevantStock.filter((s) => s.locationId === inv.dispatchLocationId);
    }
    return relevantStock.reduce((acc, s) => acc + s.quantity, 0);
  };

  const hasInvalidStock = useMemo(() => {
    return inv.items.some((it) => {
      if (!it.description || it.quantity === null) return false;
      const avail = getAvailableStock(it.description);
      return avail !== null && it.quantity > avail;
    });
  }, [inv.items, activeProducts, inventoryStock, inv.dispatchWarehouseId, inv.dispatchLocationId]);

  const sortedActiveProducts = useMemo(() => {
    return activeProducts.map(p => {
       const avail = getAvailableStock(p.description) || 0;
       return { p, avail };
    }).sort((a, b) => {
       if (a.avail > 0 && b.avail <= 0) return -1;
       if (a.avail <= 0 && b.avail > 0) return 1;
       return a.p.description.localeCompare(b.p.description);
    });
  }, [activeProducts, inventoryStock, inv.dispatchWarehouseId, inv.dispatchLocationId]);

  // Apply a specific inventory batch to an invoice item
  function applyBatchToItem(itemId: string, batch: InventoryStock) {
    const wh = warehouses.find(w => w.id === batch.warehouseId);
    updateItem(itemId, {
      stockBatchId: batch.id,
      productId: batch.productId,
      warehouseId: batch.warehouseId,
      warehouseName: wh?.name,
      lotNumber: batch.lotNo,
      allocationTimestamp: Date.now()
    });
    setBatchPickerItemId(null);
    setBatchPickerProductId(null);
    toast.success("Batch selected");
  }

  // Handle successful camera scan
  const handleCameraScan = (barcode: string) => {
    // 1. Check if it's a Warehouse Ledger ID (Batch)
    const batchMatch = inventoryStock.find((s) => s.id === barcode);
    let match = null;
    let allocatedBatchId: string | undefined = undefined;

    if (batchMatch) {
      match = activeProducts.find((p) => p.id === batchMatch.productId) || null;
      allocatedBatchId = batchMatch.id;
    } else {
      // 2. Check if it's a Product QR/Barcode
      match = activeProducts.find(
        (p) => p.sku === barcode || p.barcodeValue === barcode || p.qrValue === barcode,
      ) || null;
      if (match) {
        allocatedBatchId = getOldestBatchIdForProduct(match.id);
      }
    }

    if (match) {
      const available = getAvailableStock(match.description);
      if (available !== null && available <= 0) {
        toast.error(`❌ Product Out of Stock: ${match.description}`);
        return;
      }

      setInv((s) => {
        // Find existing row with SAME batch (if applicable) and same product
        const existing = s.items.find(
          (it) => it.description === match.description && it.hsn === match.hsn && it.stockBatchId === allocatedBatchId,
        );

        if (existing) {
          toast.success(`Incremented quantity for ${match.description}`);
          return {
            ...s,
            items: s.items.map((it) =>
              it.id === existing.id
                ? { ...it, quantity: (it.quantity || 0) + 1 }
                : it
            ),
          };
        } else {
          toast.success(`Added ${match.description} to invoice`);
          const allocatedBatch = inventoryStock.find(s => s.id === allocatedBatchId);
          const wh = warehouses.find(w => w.id === allocatedBatch?.warehouseId);
          
          const newItem: InvoiceItem = {
            ...blankItem(),
            description: match.description,
            hsn: match.hsn ?? "",
            price: match.defaultRate ?? null,
            gstPercent: match.gstPercent ?? 0,
            quantity: 1,
            stockBatchId: allocatedBatchId,
            productId: match.id,
            warehouseId: allocatedBatch?.warehouseId,
            warehouseName: wh?.name,
            lotNumber: allocatedBatch?.lotNo,
            allocationTimestamp: allocatedBatch ? Date.now() : undefined,
          };
          
          const lastItem = s.items[s.items.length - 1];
          const isEmpty =
            lastItem &&
            !lastItem.description &&
            !lastItem.hsn &&
            !lastItem.quantity &&
            !lastItem.price;

          const items = isEmpty ? [...s.items.slice(0, -1), newItem] : [...s.items, newItem];
          return { ...s, items };
        }
      });
    } else {
      toast.error(`No product/batch found for barcode: ${barcode}`);
    }
  };

  // Auto-detect dispatch warehouse based on item stock allocations
  useEffect(() => {
    if (inv.manualDispatchOverride) return;

    const allocatedWarehouses = new Set<string>();
    for (const it of inv.items) {
      if (it.warehouseId) {
        allocatedWarehouses.add(it.warehouseId);
      }
    }

    if (allocatedWarehouses.size > 1) {
      // Multi-warehouse dispatch detected
      if (!inv.multiWarehouseDispatch || inv.dispatchWarehouseId !== "") {
        setInv(prev => ({
          ...prev,
          multiWarehouseDispatch: true,
          dispatchWarehouseId: "",
          dispatchLocationId: ""
        }));
      }
    } else if (allocatedWarehouses.size === 1) {
      // Single warehouse dispatch
      const singleWhId = Array.from(allocatedWarehouses)[0];
      const batchId = inv.items.find(i => i.warehouseId === singleWhId)?.stockBatchId;
      const singleLocId = inventoryStock.find(s => s.id === batchId)?.locationId || "";
      
      if (inv.multiWarehouseDispatch || inv.dispatchWarehouseId !== singleWhId || inv.dispatchLocationId !== singleLocId) {
        setInv(prev => ({
          ...prev,
          multiWarehouseDispatch: false,
          dispatchWarehouseId: singleWhId,
          dispatchLocationId: singleLocId
        }));
      }
    } else {
      // No warehouses allocated
      if (inv.multiWarehouseDispatch) {
        setInv(prev => ({ ...prev, multiWarehouseDispatch: false }));
      }
    }
  }, [
    inv.items, 
    inv.manualDispatchOverride, 
    inv.multiWarehouseDispatch, 
    inv.dispatchWarehouseId, 
    inv.dispatchLocationId, 
    inventoryStock
  ]);

  // Auto-detect supply type from customer GSTIN state code vs company GSTIN state code.
  useEffect(() => {
    if (inv.supplyTypeManual) return;
    const customerCode = extractGstStateCode(inv.customer.gstin);
    const companyCode = extractGstStateCode(inv.company.gstin);
    if (customerCode === null || companyCode === null) return;
    const next: SupplyType = customerCode === companyCode ? "WITHIN_STATE" : "OTHER_STATE";
    if (next !== inv.supplyType) {
      setInv((s) => ({
        ...s,
        supplyType: next,
        gstMode: next === "OTHER_STATE" ? "IGST" : "CGST_SGST",
      }));
    }
  }, [inv.supplyTypeManual, inv.customer.gstin, inv.company.gstin, inv.supplyType]);

  function patch(p: Partial<Invoice>) {
    setInv((s) => ({ ...s, ...p }));
  }
  function patchCustomer(p: Partial<Invoice["customer"]>) {
    setInv((s) => ({ ...s, customer: { ...s.customer, ...p } }));
  }
  function updateItem(id: string, p: Partial<InvoiceItem>) {
    setInv((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, ...p } : it)),
    }));
  }
  function addRow() {
    setInv((s) => ({ ...s, items: [...s.items, blankItem()] }));
  }
  function deleteRow(id: string) {
    setInv((s) => ({
      ...s,
      items: s.items.length > 1 ? s.items.filter((it) => it.id !== id) : s.items,
    }));
  }

  function patchDispatch(p: Partial<NonNullable<Invoice["dispatchFrom"]>>) {
    setInv((s) => ({
      ...s,
      dispatchFrom: {
        address: "",
        city: "",
        state: "",
        pincode: "",
        ...(s.dispatchFrom ?? {}),
        ...p,
      },
    }));
  }
  function patchShipTo(p: Partial<NonNullable<Invoice["shipTo"]>>) {
    setInv((s) => ({
      ...s,
      shipTo: { city: "", state: "", pincode: "", ...(s.shipTo ?? {}), ...p },
    }));
  }
  function applyProductByDescription(itemId: string, desc: string) {
    const match = activeProducts.find(
      (p) => p.description.trim().toLowerCase() === desc.trim().toLowerCase(),
    );
    if (!match) return;

    const available = getAvailableStock(match.description);
    if (available !== null && available <= 0) {
       toast.error(`❌ Product Out of Stock: ${match.description}`);
       updateItem(itemId, blankItem()); // Clear the row
       return;
    }

    const autoAllocatedBatchId = getOldestBatchIdForProduct(match.id);
    const batch = inventoryStock.find(s => s.id === autoAllocatedBatchId);
    const wh = warehouses.find(w => w.id === batch?.warehouseId);
    
    updateItem(itemId, { 
      description: match.description,
      stockBatchId: autoAllocatedBatchId,
      productId: match.id,
      warehouseId: batch?.warehouseId,
      warehouseName: wh?.name,
      lotNumber: batch?.lotNo,
      allocationTimestamp: batch ? Date.now() : undefined,
      hsn: match.hsn ?? "",
      price: match.defaultRate ?? null,
      gstPercent: match.gstPercent ?? 0
    });

    // Auto-selection of dispatch warehouse is now handled by the multi-warehouse useEffect watcher
  }
  function ensureSaved(extra?: Partial<Invoice>): Invoice {
    let final = inv;
    if (extra) final = { ...final, ...extra };
    // Filter out empty rows
    let cleanedItems = final.items.filter(
      (it) =>
        it.description.trim() !== "" ||
        it.hsn.trim() !== "" ||
        it.quantity !== null ||
        it.price !== null,
    );
    if (cleanedItems.length === 0) {
      cleanedItems = [blankItem()];
    }
    final = { ...final, items: cleanedItems };
    // Note: products are no longer auto-saved to product master from invoices.
    // Products are managed via the Product Master tab in Inventory.
    if (mode === "create" && (!final.number || final.number === initial.number)) {
      // consume official number only on save (already preassigned via initial)
    }
    if (saveAsCustomer && final.customer.name.trim()) {
      const existing = customers.find((c) => 
        c.name.trim().toLowerCase() === final.customer.name.trim().toLowerCase() &&
        (c.phone || "") === (final.customer.phone || "")
      );
      if (existing) {
        final = { ...final, customer: existing };
      } else {
        const id = newId();
        const c = { ...final.customer, id };
        addCustomer(c);
        final = { ...final, customer: c };
      }
      setSaveAsCustomer(false);
    }
    saveInvoice(final, mode === "edit" ? initial : undefined);
    return final;
  }

  async function validateStockNetwork(): Promise<boolean> {
    for (const item of inv.items) {
      if (!item.quantity || !item.description) continue;
      const p = activeProducts.find(
        (x) => x.description.trim().toLowerCase() === item.description.trim().toLowerCase(),
      );
      if (!p) continue;
      
      try {
        const latestStock = await cloud.fetchStockForProduct(p.id, inv.dispatchWarehouseId || undefined, inv.dispatchLocationId || undefined);
        if (latestStock < item.quantity) {
           toast.error(`❌ Concurrent modification: Not enough stock for ${item.description}. Available: ${latestStock}`);
           return false;
        }
      } catch (err) {
        console.error("Error fetching stock:", err);
        toast.error("Failed to validate stock with server. Please check your connection.");
        return false;
      }
    }
    return true;
  }

  async function handleSave(asDraft = false) {
    if (!inv.customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (hasInvalidStock) {
      toast.error("Please fix invalid stock quantities before saving.");
      return;
    }
    if (!asDraft) {
      const isValid = await validateStockNetwork();
      if (!isValid) return;
    }
    
    if (mode === "create") {
      // bump counter only first time we save a new invoice number
      const current = settings.nextInvoiceNumber;
      const initialNum = `${settings.invoicePrefix}-${String(current).padStart(settings.invoiceDigits || 4, "0")}`;
      if (inv.number === initialNum) consumeInvoiceNumber();
    }
    const final = ensureSaved({ isDraft: asDraft });
    if (asDraft) {
      setDraftSavedAt(Date.now());
    } else {
      toast.success("Invoice saved");
    }
    navigate({ to: "/invoices" });
  }

  useEffect(() => {
    if (draftSavedAt == null) return;
    const t = window.setTimeout(() => setDraftSavedAt(null), 2500);
    return () => window.clearTimeout(t);
  }, [draftSavedAt]);

  async function handleExport() {
    if (!inv.customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (hasInvalidStock) {
      toast.error("Please fix invalid stock quantities before exporting.");
      return;
    }
    const isValid = await validateStockNetwork();
    if (!isValid) return;

    if (mode === "create") {
      const current = settings.nextInvoiceNumber;
      const initialNum = `${settings.invoicePrefix}-${String(current).padStart(settings.invoiceDigits || 4, "0")}`;
      if (inv.number === initialNum) consumeInvoiceNumber();
    }
    const final = ensureSaved({ isDraft: false });
    await downloadInvoicePdf(final);
    if (mode === "create") {
      navigate({ to: "/invoices/$id", params: { id: final.id } });
    }
  }

  async function handlePrint() {
    if (!inv.customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (hasInvalidStock) {
      toast.error("Please fix invalid stock quantities before printing.");
      return;
    }
    const isValid = await validateStockNetwork();
    if (!isValid) return;

    if (mode === "create") {
      const current = settings.nextInvoiceNumber;
      const initialNum = `${settings.invoicePrefix}-${String(current).padStart(settings.invoiceDigits || 4, "0")}`;
      if (inv.number === initialNum) consumeInvoiceNumber();
    }
    const final = ensureSaved({ isDraft: false });
    await printInvoicePdf(final);
    if (mode === "create") {
      navigate({ to: "/invoices/$id", params: { id: final.id } });
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        handleSave(e.shiftKey);
      } else if (k === "p") {
        e.preventDefault();
        handlePrint();
      } else if (k === "n") {
        e.preventDefault();
        navigate({ to: "/invoices/new" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv]);

  return (
    <div className="p-8 space-y-8 max-w-[1100px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === "create" ? "New Invoice" : `Edit ${inv.number}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live totals · auto-saved on this device.
          </p>
          {inv.sourceQuotationId && inv.sourceQuotationNumber && (
            <div className="mt-2 text-sm px-3 py-2 rounded-md border border-purple-300 bg-purple-50 text-purple-900 inline-flex items-center gap-2">
              Source Quotation:
              <Link
                to="/quotations/$id"
                params={{ id: inv.sourceQuotationId }}
                className="font-semibold underline"
              >
                {inv.sourceQuotationNumber}
                {inv.sourceQuotationVersion && inv.sourceQuotationVersion > 1
                  ? ` · v${inv.sourceQuotationVersion}`
                  : ""}
              </Link>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => handleSave(true)}
              className="gap-2"
              title="Ctrl+Shift+S"
            >
              <FileText className="h-4 w-4" />
              Save Draft
            </Button>
            {draftSavedAt != null && (
              <span
                key={draftSavedAt}
                className="flex items-center gap-1 text-sm font-medium text-emerald-600 animate-scale-in"
                aria-live="polite"
              >
                <Check className="h-4 w-4" />
                Draft Saved
              </span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            className="gap-2"
            title="Ctrl+S"
            disabled={hasInvalidStock}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2" title="Ctrl+P" disabled={hasInvalidStock}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleExport} className="gap-2" disabled={hasInvalidStock}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Company + Customer + Invoice info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Section title="Company" tint="var(--surface-header)">
          <div className="text-sm">
            <div className="font-semibold">{inv.company.name}</div>
            <div className="text-muted-foreground">{inv.company.address}</div>
            <div className="text-muted-foreground">Ph: {inv.company.phone}</div>
            <div className="text-muted-foreground">GSTIN: {inv.company.gstin}</div>
          </div>
        </Section>
        <Section title="Customer" tint="var(--surface-customer)">
          <div className="space-y-2">
            <select
              className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
              value={inv.customer.id}
              onChange={(e) => {
                if (e.target.value === "__new") {
                  patchCustomer({
                    id: "",
                    name: "",
                    phone: "",
                    gstin: "",
                    address: "",
                    state: "",
                  });
                  return;
                }
                const c = customers.find((x) => x.id === e.target.value);
                if (c) patch({ customer: { ...c }, placeOfSupply: c.state || inv.placeOfSupply });
              }}
            >
              <option value="__new">— Enter manually —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Customer name"
              value={inv.customer.name}
              onChange={(e) => patchCustomer({ name: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={inv.customer.phone}
              onChange={(e) => patchCustomer({ phone: e.target.value })}
            />
            <Input
              placeholder="GSTIN"
              value={inv.customer.gstin}
              onChange={(e) => patchCustomer({ gstin: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="State (place of supply)"
              value={inv.customer.state ?? ""}
              onChange={(e) => {
                patchCustomer({ state: e.target.value });
                patch({ placeOfSupply: e.target.value });
              }}
            />
            <textarea
              placeholder="Address"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={inv.customer.address}
              onChange={(e) => patchCustomer({ address: e.target.value })}
            />
            {!inv.customer.id && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={saveAsCustomer}
                  onChange={(e) => setSaveAsCustomer(e.target.checked)}
                />
                Save as new customer
              </label>
            )}
          </div>
        </Section>
        <Section title="Invoice" tint="var(--surface-invoice)">
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Invoice #</Label>
              <Input value={inv.number} onChange={(e) => patch({ number: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={inv.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">E-way Bill #</Label>
              <Input
                value={inv.ewayBillNumber ?? ""}
                onChange={(e) => patch({ ewayBillNumber: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mode of Transport</Label>
              <Input
                placeholder="e.g. Self, VRL Logistics, Blue Dart"
                value={inv.transportMode ?? ""}
                onChange={(e) => patch({ transportMode: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Supply Type</Label>
              <div className="flex items-center gap-2">
                <select
                  value={inv.supplyType ?? "WITHIN_STATE"}
                  onChange={(e) =>
                    patch({
                      supplyType: e.target.value as SupplyType,
                      supplyTypeManual: true,
                      gstMode: e.target.value === "OTHER_STATE" ? "IGST" : "CGST_SGST",
                    })
                  }
                  className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-white"
                >
                  <option value="WITHIN_STATE">Within State</option>
                  <option value="OTHER_STATE">Other State</option>
                </select>
                <label className="text-xs flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!inv.supplyTypeManual}
                    onChange={(e) => patch({ supplyTypeManual: !e.target.checked })}
                  />
                  Auto
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                GST Type:{" "}
                {(inv.supplyType ?? "WITHIN_STATE") === "WITHIN_STATE"
                  ? "Intra-State"
                  : "Inter-State"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Packages</Label>
                <Input
                  type="number"
                  value={inv.packages ?? ""}
                  placeholder="Enter packages"
                  onChange={(e) =>
                    patch({ packages: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Weight</Label>
                <Input
                  placeholder="Enter weight"
                  value={inv.weight ?? ""}
                  onChange={(e) => patch({ weight: e.target.value })}
                />
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Dispatch From + Ship To */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Dispatch From" tint="var(--surface-header)">
          <div className="space-y-2">
            {!inv.manualDispatchOverride && inv.multiWarehouseDispatch ? (
              <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center text-amber-800 gap-2 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Multi-Warehouse Dispatch
                </div>
                <p className="text-xs text-amber-700">
                  Products in this invoice will be dispatched from multiple warehouse locations based on their stock allocations.
                </p>
                <div className="mt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => patch({ manualDispatchOverride: true })}
                  >
                    Override Primary Warehouse
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <select
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
                    value={inv.dispatchWarehouseId ?? ""}
                    onChange={(e) => {
                      const whId = e.target.value;
                      const wh = warehouses.find((w) => w.id === whId);
                      patch({
                        dispatchWarehouseId: whId,
                        dispatchLocationId: wh?.locations?.[0]?.id ?? "",
                        manualDispatchOverride: true
                      });
                    }}
                  >
                    <option value="">— Select Warehouse —</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-white"
                    value={inv.dispatchLocationId ?? ""}
                    onChange={(e) => patch({ dispatchLocationId: e.target.value, manualDispatchOverride: true })}
                    disabled={!inv.dispatchWarehouseId}
                  >
                    <option value="">— Select Location —</option>
                    {warehouses
                      .find((w) => w.id === inv.dispatchWarehouseId)
                      ?.locations?.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
            
            {inv.manualDispatchOverride && inv.multiWarehouseDispatch && (
               <div className="text-[10px] text-amber-600 flex items-center justify-between">
                 <span>Manual override active.</span>
                 <button 
                   className="underline text-blue-600 hover:text-blue-800"
                   onClick={() => patch({ manualDispatchOverride: false })}
                 >
                   Clear Override
                 </button>
               </div>
            )}

            <textarea
              placeholder="Address"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={inv.dispatchFrom?.address ?? ""}
              onChange={(e) => patchDispatch({ address: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={inv.dispatchFrom?.city ?? ""}
                onChange={(e) => patchDispatch({ city: e.target.value })}
              />
              <Input
                placeholder="State"
                value={inv.dispatchFrom?.state ?? ""}
                onChange={(e) => patchDispatch({ state: e.target.value })}
              />
              <Input
                placeholder="Pincode"
                value={inv.dispatchFrom?.pincode ?? ""}
                onChange={(e) => patchDispatch({ pincode: e.target.value })}
              />
            </div>
          </div>
        </Section>
        <Section title="Ship To" tint="var(--surface-customer)">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={inv.shipTo?.city ?? ""}
              onChange={(e) => patchShipTo({ city: e.target.value })}
            />
            <Input
              placeholder="State"
              value={inv.shipTo?.state ?? ""}
              onChange={(e) => patchShipTo({ state: e.target.value })}
            />
            <Input
              placeholder="Pincode"
              value={inv.shipTo?.pincode ?? ""}
              onChange={(e) => patchShipTo({ pincode: e.target.value })}
            />
          </div>
        </Section>
      </div>

      {/* Product table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b flex justify-between items-center bg-[var(--surface-summary)]">
          <h2 className="font-semibold text-lg">Items</h2>
          <div className="flex items-center gap-2">
            <CameraScannerDialog onScan={handleCameraScan} />
            <Button size="sm" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-summary)] text-left">
              <tr>
                <th className="px-3 py-2 font-medium w-10">#</th>
                <th className="px-3 py-2 font-medium min-w-[200px]">Description</th>
                <th className="px-3 py-2 font-medium min-w-[120px]">HSN CODE</th>
                <th className="px-3 py-2 font-medium min-w-[100px] text-right">KGS</th>
                <th className="px-3 py-2 font-medium min-w-[100px] text-right">Price</th>
                <th className="px-3 py-2 font-medium min-w-[120px] text-right">Amount</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1">
                    <Select
                      value={it.description || undefined}
                      onValueChange={(val) => {
                        updateItem(it.id, { description: val });
                        applyProductByDescription(it.id, val);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedActiveProducts.map(({ p, avail }) => (
                           <SelectItem key={p.id} value={p.description}>
                             {p.description} {p.sku ? `(${p.sku})` : ""} {avail > 0 ? `- Stock: ${avail}` : `- Out of stock`}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(() => {
                      if (!it.description) return null;
                      const avail = getAvailableStock(it.description);
                      if (avail === null) return null;
                      const isOutOfStock = avail <= 0;
                      
                      let batchInfo = null;
                      if (it.stockBatchId) {
                         const b = inventoryStock.find(s => s.id === it.stockBatchId);
                         if (b) {
                           batchInfo = <span className="text-muted-foreground ml-2">(Allocated: {b.lotNo ? `Lot ${b.lotNo}` : b.warehouseId}) <button type="button" onClick={() => { setBatchPickerItemId(it.id); setBatchPickerProductId(b.productId); }} className="text-blue-500 hover:underline ml-1">Change Variant</button></span>;
                         }
                      } else if (!isOutOfStock) {
                         const match = activeProducts.find(p => p.description === it.description);
                         if (match) {
                            batchInfo = <button type="button" onClick={() => { setBatchPickerItemId(it.id); setBatchPickerProductId(match.id); }} className="text-blue-500 hover:underline ml-2">Select Variant</button>;
                         }
                      }

                      return (
                        <div className={`text-[10px] mt-1 font-medium ${isOutOfStock ? "text-destructive" : "text-emerald-600"} flex items-center`}>
                          <span>Available: {avail} Units</span>
                          {batchInfo}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      list="hsn-history-list"
                      placeholder="7318"
                      value={it.hsn || ""}
                      onChange={(e) => updateItem(it.id, { hsn: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1 w-28">
                    <Input
                      type="number"
                      className={`text-right ${
                        (() => {
                          if (!it.description || it.quantity === null) return "";
                          const avail = getAvailableStock(it.description);
                          if (avail !== null && it.quantity > avail) return "border-destructive ring-1 ring-destructive focus-visible:ring-destructive";
                          return "";
                        })()
                      }`}
                      value={it.quantity ?? ""}
                      placeholder="0"
                      onChange={(e) => {
                        let val = e.target.value === "" ? null : Number(e.target.value);
                        if (val !== null && it.description) {
                           const avail = getAvailableStock(it.description);
                           if (avail !== null && val > avail) {
                              toast.error(`Cannot exceed available stock (${avail})`);
                              val = avail; // Cap at available
                           }
                        }
                        updateItem(it.id, { quantity: val });
                      }}
                    />
                    {(() => {
                      if (!it.description || it.quantity === null) return null;
                      const avail = getAvailableStock(it.description);
                      if (avail !== null && it.quantity > avail) {
                        return <div className="text-[10px] text-destructive mt-1 leading-tight text-right">Exceeds stock</div>;
                      }
                      return null;
                    })()}
                  </td>
                  <td className="px-2 py-1 w-28">
                    <Input
                      type="number"
                      className="text-right"
                      value={it.price ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        updateItem(it.id, {
                          price: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatINR(lineSubtotal(it))}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRow(it.id)}
                        disabled={inv.items.length === 1}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="product-master-list">
            {activeProducts
              .map((p) => {
                const avail = getAvailableStock(p.description) ?? 0;
                const latestDate = inventoryStock
                  .filter(s => s.productId === p.id && s.quantity > 0)
                  .reduce((max, b) => (b.purchaseDate || "") > max ? (b.purchaseDate || "") : max, "");
                return { p, avail, latestDate };
              })
              .sort((a, b) => {
                if (a.avail > 0 && b.avail <= 0) return -1;
                if (a.avail <= 0 && b.avail > 0) return 1;
                if (a.avail > 0 && b.avail > 0) {
                  return b.latestDate.localeCompare(a.latestDate);
                }
                return a.p.description.localeCompare(b.p.description);
              })
              .map(({ p, avail }) => (
                <option key={p.id} value={p.description}>
                  {avail > 0 ? `(Avail: ${avail}) ${p.description}` : p.description}
                </option>
              ))}
          </datalist>
          <datalist id="hsn-history-list">
            {hsnHistory.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Batch Picker Dialog */}
      <Dialog open={!!batchPickerItemId} onOpenChange={(open) => { if (!open) { setBatchPickerItemId(null); setBatchPickerProductId(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Select Inventory Batch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose which stock batch to dispatch for this line item:</p>
            {batchPickerProductId && getBatchesForProduct(batchPickerProductId).length === 0 ? (
              <p className="text-sm text-destructive">No available batches found for this product.</p>
            ) : (
              <div className="divide-y border rounded-md overflow-hidden">
                {batchPickerProductId && getBatchesForProduct(batchPickerProductId).map((batch) => (
                  <button
                    key={batch.id}
                    className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors text-sm"
                    onClick={() => batchPickerItemId && applyBatchToItem(batchPickerItemId, batch)}
                  >
                    <div className="font-medium">{batchLabel(batch)}</div>
                    {(batch.supplier || batch.purchaseRate || batch.purchaseDate) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {batch.supplier && `Supplier: ${batch.supplier}`}
                        {batch.purchaseRate && ` · Rate: ₹${batch.purchaseRate}`}
                        {batch.purchaseDate && ` · Date: ${batch.purchaseDate}`}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setBatchPickerItemId(null); setBatchPickerProductId(null); }}>Skip (no batch)</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      {/* Tax Details (between Items and Summary) */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold bg-[var(--surface-summary)] flex items-center justify-between">
          <span>Tax Details</span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Taxable Amount</Label>
            <Input value={formatINR(totals.taxableAmount)} readOnly className="bg-muted/40" />
          </div>
          {totals.isInterState ? (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">IGST %</Label>
                <Input
                  type="number"
                  value={inv.igstPercent ?? 18}
                  onChange={(e) => patch({ igstPercent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IGST Amount</Label>
                <Input
                  type="number"
                  value={inv.igstAmountOverride ?? Number(totals.igst.toFixed(2))}
                  onChange={(e) => patch({ igstAmountOverride: Number(e.target.value) || 0 })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">CGST %</Label>
                <Input
                  type="number"
                  value={inv.cgstPercent ?? 9}
                  onChange={(e) => patch({ cgstPercent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">CGST Amount</Label>
                <Input
                  type="number"
                  value={inv.cgstAmountOverride ?? Number(totals.cgst.toFixed(2))}
                  onChange={(e) => patch({ cgstAmountOverride: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SGST %</Label>
                <Input
                  type="number"
                  value={inv.sgstPercent ?? 9}
                  onChange={(e) => patch({ sgstPercent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SGST Amount</Label>
                <Input
                  type="number"
                  value={inv.sgstAmountOverride ?? Number(totals.sgst.toFixed(2))}
                  onChange={(e) => patch({ sgstAmountOverride: Number(e.target.value) || 0 })}
                />
              </div>
            </>
          )}
          <div className="md:col-start-3">
            <Label className="text-xs text-muted-foreground">Total GST</Label>
            <Input
              value={formatINR(totals.gstTotal)}
              readOnly
              className="bg-muted/40 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Bank + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Bank Details" tint="white">
          <div className="text-sm">
            <div className="font-semibold">{inv.bank.bankName}</div>
            <div>Acc: {inv.bank.accountNumber}</div>
            <div>IFSC: {inv.bank.ifsc}</div>
            {inv.bank.branch && <div>{inv.bank.branch}</div>}
          </div>
        </Section>
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold bg-[var(--surface-summary)]">
            Summary
          </div>
          <div className="p-5 space-y-2 text-sm">
            <Row label="Subtotal" value={formatINR(totals.subtotal)} />
            {totals.gstTotal > 0 && (
              <>
                {totals.isInterState ? (
                  <Row label={`IGST @ ${totals.igstPercent}%`} value={formatINR(totals.igst)} />
                ) : (
                  <>
                    <Row label={`CGST @ ${totals.cgstPercent}%`} value={formatINR(totals.cgst)} />
                    <Row label={`SGST @ ${totals.sgstPercent}%`} value={formatINR(totals.sgst)} />
                  </>
                )}
                <Row label="GST Total" value={formatINR(totals.gstTotal)} />
              </>
            )}
            {Math.abs(totals.roundedOff) > 0.001 && (
              <Row label="Rounded Off" value={formatINR(totals.roundedOff)} />
            )}
            <div className="h-px bg-border my-2" />
            <Row label="Grand Total" value={formatINR(totals.roundedTotal)} bold />
            <div className="text-xs text-muted-foreground italic">
              {numberToIndianWords(totals.roundedTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  tint,
  children,
}: {
  title: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="px-5 py-3 border-b font-semibold" style={{ background: tint }}>
        {title}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-bold text-base" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
