import { create } from "zustand";
import type {
  Customer,
  Invoice,
  Quotation,
  Settings,
  ProductMasterEntry,
  InventoryStock,
  InventoryTransaction,
  Warehouse,
  Location,
} from "./types";
import { defaultSettings } from "./default-settings";
import { cloud } from "./cloud";
import { toast } from "sonner";

interface AppState {
  settings: Settings;
  customers: Customer[];
  invoices: Invoice[];
  quotations: Quotation[];
  inventoryStock: InventoryStock[];
  inventoryTransactions: InventoryTransaction[];
  warehouses: Warehouse[];
  readNotificationIds: string[];
  dismissedNotificationIds: string[];
  hydrated: boolean;
  updateCompany: (patch: Partial<Settings["company"]>) => void;
  updateBank: (patch: Partial<Settings["bank"]>) => void;
  replaceSettings: (next: Settings) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  upsertProductMaster: (entry: Partial<ProductMasterEntry> & { description: string }) => void;
  saveInvoice: (inv: Invoice, oldInv?: Invoice) => void;
  deleteInvoice: (id: string) => void;
  nextInvoiceNumber: () => string;
  consumeInvoiceNumber: () => string;
  saveQuotation: (q: Quotation) => void;
  deleteQuotation: (id: string) => void;
  nextQuotationNumber: () => string;
  consumeQuotationNumber: () => string;
  hydrate: (data: {
    settings: Settings;
    customers: Customer[];
    invoices: Invoice[];
    quotations: Quotation[];
    inventoryStock: InventoryStock[];
    inventoryTransactions: InventoryTransaction[];
    warehouses: Warehouse[];
    readNotificationIds: string[];
    dismissedNotificationIds: string[];
  }) => void;
  reset: () => void;
  markNotificationsRead: (ids: string[]) => void;
  dismissNotification: (id: string) => void;
  clearReadNotifications: () => void;
  upsertInventoryStock: (stock: InventoryStock) => void;
  deleteInventoryStock: (id: string) => void;
  insertInventoryTransaction: (txn: InventoryTransaction) => void;
  upsertWarehouse: (wh: Warehouse) => void;
  deleteWarehouse: (id: string) => void;
  upsertLocation: (loc: Location) => void;
  deleteLocation: (warehouseId: string, locationId: string) => void;

  // Pagination & Realtime Local-only Mutations
  setInvoices: (invoices: Invoice[]) => void;
  appendInvoices: (invoices: Invoice[]) => void;
  setQuotations: (quotations: Quotation[]) => void;
  appendQuotations: (quotations: Quotation[]) => void;

  upsertInvoiceLocal: (inv: Invoice) => void;
  removeInvoiceLocal: (id: string) => void;
  upsertQuotationLocal: (q: Quotation) => void;
  removeQuotationLocal: (id: string) => void;
  upsertCustomerLocal: (c: Customer) => void;
  removeCustomerLocal: (id: string) => void;
  upsertProductLocal: (p: ProductMasterEntry) => void;
  setSettingsLocal: (s: Settings) => void;
}

function bg(promise: Promise<unknown>, errorPrefix: string) {
  promise.catch((err) => {
    console.error(`[cloud sync] ${errorPrefix}`, err);
    if (err && err.message) {
      console.error(
        `[cloud sync details] ${errorPrefix}: ${err.message}`,
        err.details,
        err.hint,
        err.code,
      );
      toast.error(`${errorPrefix}: ${err.message}`);
    } else {
      toast.error(`${errorPrefix}: Sync failed`);
    }
  });
}

export const useApp = create<AppState>()((set, get) => ({
  settings: defaultSettings,
  customers: [],
  invoices: [],
  quotations: [],
  inventoryStock: [],
  inventoryTransactions: [],
  warehouses: [],
  readNotificationIds: [],
  dismissedNotificationIds: [],
  hydrated: false,
  hydrate: (data) =>
    set({
      settings: data.settings,
      customers: data.customers,
      invoices: data.invoices,
      quotations: data.quotations,
      inventoryStock: data.inventoryStock,
      inventoryTransactions: data.inventoryTransactions,
      warehouses: data.warehouses,
      readNotificationIds: data.readNotificationIds,
      dismissedNotificationIds: data.dismissedNotificationIds,
      hydrated: true,
    }),
  reset: () =>
    set({
      settings: defaultSettings,
      customers: [],
      invoices: [],
      quotations: [],
      inventoryStock: [],
      inventoryTransactions: [],
      warehouses: [],
      readNotificationIds: [],
      dismissedNotificationIds: [],
      hydrated: false,
    }),
  updateCompany: (patch) =>
    set((s) => {
      const next: Settings = {
        ...s.settings,
        company: { ...s.settings.company, ...patch },
      };
      bg(cloud.upsertSettings(next), "Save company info");
      return { settings: next };
    }),
  updateBank: (patch) =>
    set((s) => {
      const next: Settings = {
        ...s.settings,
        bank: { ...s.settings.bank, ...patch },
      };
      bg(cloud.upsertSettings(next), "Save bank info");
      return { settings: next };
    }),
  replaceSettings: (next) =>
    set((s) => {
      const merged: Settings = {
        ...s.settings,
        ...next,
        company: { ...s.settings.company, ...next.company },
        bank: { ...s.settings.bank, ...next.bank },
      };
      bg(cloud.upsertSettings(merged), "Save settings");
      return { settings: merged };
    }),
  addCustomer: (c) =>
    set((s) => {
      bg(cloud.upsertCustomer(c), "Add customer");
      return { customers: [...s.customers, c] };
    }),
  updateCustomer: (c) =>
    set((s) => {
      bg(cloud.upsertCustomer(c), "Update customer");
      return { customers: s.customers.map((x) => (x.id === c.id ? c : x)) };
    }),
  deleteCustomer: (id) =>
    set((s) => {
      bg(cloud.deleteCustomer(id), "Delete customer");
      return { customers: s.customers.filter((x) => x.id !== id) };
    }),
  upsertProductMaster: (entry) =>
    set((s) => {
      const desc = entry.description.trim();
      if (!desc) return s;
      const list = s.settings.productMaster;
      const idx = list.findIndex(
        (x) => (entry.id && x.id === entry.id) || x.description.trim().toLowerCase() === desc.toLowerCase(),
      );
      let saved: ProductMasterEntry;
      if (idx === -1) {
        saved = {
          id: entry.id || newId(),
          sku: entry.sku || "SKU-" + newId().slice(0, 8),
          description: desc,
          hsn: entry.hsn,
          brandName: entry.brandName,
          barcodeValue: entry.barcodeValue || entry.sku || "",
          qrValue: entry.qrValue || entry.sku || "",
          active: entry.active ?? true,
          itemType: entry.itemType,
          size: entry.size,
          finish: entry.finish,
          grade: entry.grade,
          threadType: entry.threadType,
          threadLength: entry.threadLength,
        };
        bg(cloud.upsertProduct(saved), "Save product");
        return {
          settings: {
            ...s.settings,
            productMaster: [...list, saved],
          },
        };
      }
      const updated: ProductMasterEntry = {
        ...list[idx],
        ...entry,
        description: desc,
        sku: entry.sku !== undefined ? entry.sku : list[idx].sku,
        barcodeValue: entry.barcodeValue !== undefined ? entry.barcodeValue : list[idx].barcodeValue,
        qrValue: entry.qrValue !== undefined ? entry.qrValue : list[idx].qrValue,
        itemType: entry.itemType !== undefined ? entry.itemType : list[idx].itemType,
        size: entry.size !== undefined ? entry.size : list[idx].size,
        finish: entry.finish !== undefined ? entry.finish : list[idx].finish,
        grade: entry.grade !== undefined ? entry.grade : list[idx].grade,
        threadType: entry.threadType !== undefined ? entry.threadType : list[idx].threadType,
        threadLength: entry.threadLength !== undefined ? entry.threadLength : list[idx].threadLength,
      };
      bg(cloud.upsertProduct(updated), "Update product");
      const next = [...list];
      next[idx] = updated;
      return { settings: { ...s.settings, productMaster: next } };
    }),
  saveInvoice: (inv, oldInv) =>
    set((s) => {
      const idx = s.invoices.findIndex((x) => x.id === inv.id);
      const invoices =
        idx === -1 ? [inv, ...s.invoices] : s.invoices.map((x) => (x.id === inv.id ? inv : x));

      bg(cloud.upsertInvoice(inv), "Save invoice");

      const nextStock = [...s.inventoryStock];
      const nextTxns = [...s.inventoryTransactions];
      const now = new Date().toISOString();

      // Helper to adjust stock
      const applyStockChange = (
        description: string,
        qtyChange: number,
        whId?: string,
        locId?: string,
        refType?: string,
      ) => {
        if (!whId || !locId || !qtyChange) return;
        const p = s.settings.productMaster.find(
          (x) => x.description.trim().toLowerCase() === description.trim().toLowerCase(),
        );
        if (!p) return; // not a tracked product

        const existingStock = nextStock.find(
          (x) => x.productId === p.id && x.warehouseId === whId && x.locationId === locId,
        );
        const currentQty = existingStock ? existingStock.quantity : 0;
        const newQty = currentQty + qtyChange;

        const newStock: InventoryStock = existingStock
          ? { ...existingStock, quantity: newQty, updatedAt: now }
          : {
              id: newId(),
              productId: p.id,
              warehouseId: whId,
              locationId: locId,
              quantity: newQty,
              updatedAt: now,
            };

        const stockIdx = nextStock.findIndex((x) => x.id === newStock.id);
        if (stockIdx === -1) nextStock.push(newStock);
        else nextStock[stockIdx] = newStock;

        bg(cloud.upsertInventoryStock(newStock), "Save stock update");

        const txn: InventoryTransaction = {
          id: newId(),
          productId: p.id,
          warehouseId: whId,
          locationId: locId,
          quantityChange: qtyChange,
          transactionType: qtyChange < 0 ? "OUT" : "IN",
          referenceType: refType,
          referenceId: inv.id,
          createdAt: now,
        };
        nextTxns.push(txn);
        bg(cloud.insertInventoryTransaction(txn), "Save transaction");
      };

      // Revert old invoice if it existed
      if (oldInv && !oldInv.isDraft && oldInv.dispatchWarehouseId && oldInv.dispatchLocationId) {
        for (const item of oldInv.items) {
          if (item.quantity)
            applyStockChange(
              item.description,
              item.quantity,
              oldInv.dispatchWarehouseId,
              oldInv.dispatchLocationId,
              "INVOICE_EDIT_REVERT",
            );
        }
      }

      // Apply new invoice deductions
      if (!inv.isDraft && inv.dispatchWarehouseId && inv.dispatchLocationId) {
        for (const item of inv.items) {
          if (item.quantity)
            applyStockChange(
              item.description,
              -item.quantity,
              inv.dispatchWarehouseId,
              inv.dispatchLocationId,
              "INVOICE_SALE",
            );
        }
      }

      return { invoices, inventoryStock: nextStock, inventoryTransactions: nextTxns };
    }),
  deleteInvoice: (id) =>
    set((s) => {
      const inv = s.invoices.find((x) => x.id === id);
      bg(cloud.deleteInvoice(id), "Delete invoice");

      const nextStock = [...s.inventoryStock];
      const nextTxns = [...s.inventoryTransactions];
      const now = new Date().toISOString();

      if (inv && !inv.isDraft && inv.dispatchWarehouseId && inv.dispatchLocationId) {
        for (const item of inv.items) {
          if (!item.quantity) continue;
          const p = s.settings.productMaster.find(
            (x) => x.description.trim().toLowerCase() === item.description.trim().toLowerCase(),
          );
          if (!p) continue;

          const existingStock = nextStock.find(
            (x) =>
              x.productId === p.id &&
              x.warehouseId === inv.dispatchWarehouseId &&
              x.locationId === inv.dispatchLocationId,
          );
          const currentQty = existingStock ? existingStock.quantity : 0;
          const newQty = currentQty + item.quantity; // REVERT OUT

          const newStock: InventoryStock = existingStock
            ? { ...existingStock, quantity: newQty, updatedAt: now }
            : {
                id: newId(),
                productId: p.id,
                warehouseId: inv.dispatchWarehouseId,
                locationId: inv.dispatchLocationId,
                quantity: newQty,
                updatedAt: now,
              };

          const stockIdx = nextStock.findIndex((x) => x.id === newStock.id);
          if (stockIdx === -1) nextStock.push(newStock);
          else nextStock[stockIdx] = newStock;

          bg(cloud.upsertInventoryStock(newStock), "Save stock update");

          const txn: InventoryTransaction = {
            id: newId(),
            productId: p.id,
            warehouseId: inv.dispatchWarehouseId,
            locationId: inv.dispatchLocationId,
            quantityChange: item.quantity,
            transactionType: "IN",
            referenceType: "INVOICE_DELETE_REVERT",
            referenceId: id,
            createdAt: now,
          };
          nextTxns.push(txn);
          bg(cloud.insertInventoryTransaction(txn), "Save transaction");
        }
      }

      return {
        invoices: s.invoices.filter((x) => x.id !== id),
        inventoryStock: nextStock,
        inventoryTransactions: nextTxns,
      };
    }),
  nextInvoiceNumber: () => {
    const { invoicePrefix, nextInvoiceNumber, invoiceDigits } = get().settings;
    return `${invoicePrefix}-${String(nextInvoiceNumber).padStart(invoiceDigits || 4, "0")}`;
  },
  consumeInvoiceNumber: () => {
    const { invoicePrefix, nextInvoiceNumber, invoiceDigits } = get().settings;
    const number = `${invoicePrefix}-${String(nextInvoiceNumber).padStart(invoiceDigits || 4, "0")}`;
    set((s) => {
      const next: Settings = {
        ...s.settings,
        nextInvoiceNumber: s.settings.nextInvoiceNumber + 1,
      };
      bg(cloud.upsertSettings(next), "Update invoice counter");
      return { settings: next };
    });
    return number;
  },
  saveQuotation: (q) =>
    set((s) => {
      const idx = s.quotations.findIndex((x) => x.id === q.id);
      const quotations =
        idx === -1 ? [q, ...s.quotations] : s.quotations.map((x) => (x.id === q.id ? q : x));
      bg(cloud.upsertQuotation(q), "Save quotation");
      return { quotations };
    }),
  deleteQuotation: (id) =>
    set((s) => {
      bg(cloud.deleteQuotation(id), "Delete quotation");
      return { quotations: s.quotations.filter((x) => x.id !== id) };
    }),
  nextQuotationNumber: () => {
    const { quotationPrefix, nextQuotationNumber, quotationDigits } = get().settings;
    return `${quotationPrefix}-${String(nextQuotationNumber).padStart(quotationDigits || 4, "0")}`;
  },
  consumeQuotationNumber: () => {
    const { quotationPrefix, nextQuotationNumber, quotationDigits } = get().settings;
    const number = `${quotationPrefix}-${String(nextQuotationNumber).padStart(quotationDigits || 4, "0")}`;
    set((s) => {
      const next: Settings = {
        ...s.settings,
        nextQuotationNumber: s.settings.nextQuotationNumber + 1,
      };
      bg(cloud.upsertSettings(next), "Update quotation counter");
      return { settings: next };
    });
    return number;
  },
  markNotificationsRead: (ids) =>
    set((s) => {
      const readNotificationIds = Array.from(new Set([...s.readNotificationIds, ...ids]));
      bg(
        cloud.saveUserState({
          readNotificationIds,
          dismissedNotificationIds: s.dismissedNotificationIds,
        }),
        "Save notification state",
      );
      return { readNotificationIds };
    }),
  dismissNotification: (id) =>
    set((s) => {
      const dismissedNotificationIds = Array.from(new Set([...s.dismissedNotificationIds, id]));
      bg(
        cloud.saveUserState({
          readNotificationIds: s.readNotificationIds,
          dismissedNotificationIds,
        }),
        "Dismiss notification",
      );
      return { dismissedNotificationIds };
    }),
  clearReadNotifications: () =>
    set(() => {
      bg(
        cloud.saveUserState({
          readNotificationIds: [],
          dismissedNotificationIds: [],
        }),
        "Clear notifications",
      );
      return { readNotificationIds: [], dismissedNotificationIds: [] };
    }),
  upsertInventoryStock: (stock) =>
    set((s) => {
      const idx = s.inventoryStock.findIndex((x) => x.id === stock.id);
      const inventoryStock =
        idx === -1
          ? [...s.inventoryStock, stock]
          : s.inventoryStock.map((x) => (x.id === stock.id ? stock : x));
      bg(cloud.upsertInventoryStock(stock), "Save inventory stock");
      return { inventoryStock };
    }),
  deleteInventoryStock: (id) =>
    set((state) => {
      bg(cloud.deleteInventoryStock(id), "Delete inventory stock");
      return {
        inventoryStock: state.inventoryStock.filter((s) => s.id !== id),
      };
    }),
  insertInventoryTransaction: (txn) =>
    set((s) => {
      bg(cloud.insertInventoryTransaction(txn), "Save inventory transaction");
      return { inventoryTransactions: [txn, ...s.inventoryTransactions] };
    }),
  upsertWarehouse: (wh) =>
    set((s) => {
      const idx = s.warehouses.findIndex((w) => w.id === wh.id);
      const warehouses =
        idx === -1 ? [...s.warehouses, wh] : s.warehouses.map((w) => (w.id === wh.id ? wh : w));
      bg(cloud.upsertWarehouse(wh), "Save warehouse");
      return { warehouses };
    }),
  deleteWarehouse: (id) =>
    set((s) => {
      bg(cloud.deleteWarehouse(id), "Delete warehouse");
      return { warehouses: s.warehouses.filter((w) => w.id !== id) };
    }),
  upsertLocation: (loc) =>
    set((s) => {
      const wIdx = s.warehouses.findIndex((w) => w.id === loc.warehouseId);
      if (wIdx === -1) return s;
      const wh = s.warehouses[wIdx];
      const lIdx = wh.locations.findIndex((l) => l.id === loc.id);
      const newLocs =
        lIdx === -1 ? [...wh.locations, loc] : wh.locations.map((l) => (l.id === loc.id ? loc : l));
      const newWh = { ...wh, locations: newLocs };
      const warehouses = s.warehouses.map((w) => (w.id === wh.id ? newWh : w));
      bg(cloud.upsertLocation(loc), "Save location");
      return { warehouses };
    }),
  deleteLocation: (warehouseId, locationId) =>
    set((s) => {
      const wIdx = s.warehouses.findIndex((w) => w.id === warehouseId);
      if (wIdx === -1) return s;
      const wh = s.warehouses[wIdx];
      const newWh = { ...wh, locations: wh.locations.filter((l) => l.id !== locationId) };
      const warehouses = s.warehouses.map((w) => (w.id === wh.id ? newWh : w));
      bg(cloud.deleteLocation(locationId), "Delete location");
      return { warehouses };
    }),

  // --- Local-only Actions for Realtime & Pagination ---
  setInvoices: (invoices) => set({ invoices }),
  appendInvoices: (newInvs) =>
    set((s) => {
      const existingIds = new Set(s.invoices.map((i) => i.id));
      const toAdd = newInvs.filter((i) => !existingIds.has(i.id));
      return { invoices: [...s.invoices, ...toAdd] };
    }),
  setQuotations: (quotations) => set({ quotations }),
  appendQuotations: (newQuos) =>
    set((s) => {
      const existingIds = new Set(s.quotations.map((q) => q.id));
      const toAdd = newQuos.filter((q) => !existingIds.has(q.id));
      return { quotations: [...s.quotations, ...toAdd] };
    }),

  upsertInvoiceLocal: (inv) =>
    set((s) => {
      const idx = s.invoices.findIndex((x) => x.id === inv.id);
      if (idx === -1) {
        return { invoices: [inv, ...s.invoices] };
      }
      return { invoices: s.invoices.map((x) => (x.id === inv.id ? inv : x)) };
    }),
  removeInvoiceLocal: (id) =>
    set((s) => ({ invoices: s.invoices.filter((x) => x.id !== id) })),

  upsertQuotationLocal: (q) =>
    set((s) => {
      const idx = s.quotations.findIndex((x) => x.id === q.id);
      if (idx === -1) {
        return { quotations: [q, ...s.quotations] };
      }
      return { quotations: s.quotations.map((x) => (x.id === q.id ? q : x)) };
    }),
  removeQuotationLocal: (id) =>
    set((s) => ({ quotations: s.quotations.filter((x) => x.id !== id) })),

  upsertCustomerLocal: (c) =>
    set((s) => {
      const idx = s.customers.findIndex((x) => x.id === c.id);
      if (idx === -1) {
        return { customers: [...s.customers, c].sort((a, b) => a.name.localeCompare(b.name)) };
      }
      return { customers: s.customers.map((x) => (x.id === c.id ? c : x)) };
    }),
  removeCustomerLocal: (id) =>
    set((s) => ({ customers: s.customers.filter((x) => x.id !== id) })),

  upsertProductLocal: (p) =>
    set((s) => {
      const list = s.settings.productMaster;
      const idx = list.findIndex((x) => x.id === p.id);
      if (idx === -1) {
        return { settings: { ...s.settings, productMaster: [...list, p] } };
      }
      const nextList = [...list];
      nextList[idx] = p;
      return { settings: { ...s.settings, productMaster: nextList } };
    }),

  setSettingsLocal: (settings) => set({ settings }),
}));

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  const rnd = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-${((Math.random() * 4) | 8).toString(16)}${rnd(3)}-${rnd(12)}`;
}
