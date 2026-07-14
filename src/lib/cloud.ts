import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  Customer,
  Invoice,
  ProductMasterEntry,
  Quotation,
  Settings,
  InventoryStock,
  InventoryTransaction,
  Warehouse,
  Location,
} from "./types";
import logoAsset from "@/assets/madeena-logo.png.asset.json";
import watermarkAsset from "@/assets/madeena-watermark.png.asset.json";
import { defaultSettings } from "./default-settings";

// ---------- Mappers -----------------------------------------------------

type Row = Record<string, unknown>;

export function rowToCustomer(r: Row): Customer {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    phone: (r.phone as string) ?? "",
    gstin: (r.gstin as string) ?? "",
    address: (r.address as string) ?? "",
    state: (r.state as string) ?? "",
    pincode: (r.pincode as string) ?? undefined,
    contactPerson: (r.contact_person as string) ?? undefined,
  };
}

export function customerToRow(c: Customer, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    phone: c.phone,
    gstin: c.gstin,
    address: c.address,
    state: c.state ?? "",
    pincode: c.pincode ?? null,
    contact_person: c.contactPerson ?? null,
  };
}

export function rowToProduct(r: Row): ProductMasterEntry {
  return {
    id: r.id as string,
    sku: (r.sku as string) ?? undefined,
    description: (r.description as string) ?? "",
    hsn: (r.hsn as string) ?? "",
    gstPercent: Number(r.gst_percent ?? 0),
    defaultRate: r.default_rate == null ? undefined : Number(r.default_rate),
    barcodeValue: (r.barcode_value as string) ?? undefined,
    qrValue: (r.qr_value as string) ?? undefined,
    lotNo: (r.lot_no as string) ?? undefined,
    goodsFrom: (r.goods_from as string) ?? undefined,
    size: (r.size as string) ?? undefined,
    tread: (r.tread as string) ?? undefined,
    grade: (r.grade as string) ?? undefined,
    finish: (r.finish as string) ?? undefined,
    head: (r.head as string) ?? undefined,
    active: (r.active as boolean) ?? true,
  };
}

export function productToRow(p: ProductMasterEntry, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    sku: p.sku ?? null,
    description: p.description,
    hsn: p.hsn,
    gst_percent: p.gstPercent,
    default_rate: p.defaultRate ?? null,
    barcode_value: p.barcodeValue ?? null,
    qr_value: p.qrValue ?? null,
    lot_no: p.lotNo ?? null,
    goods_from: p.goodsFrom ?? null,
    size: p.size ?? null,
    tread: p.tread ?? null,
    grade: p.grade ?? null,
    finish: p.finish ?? null,
    head: p.head ?? null,
    active: p.active ?? true,
  };
}

export function rowToInvoice(r: Row): Invoice {
  return {
    id: r.id as string,
    number: r.number as string,
    date: r.date as string,
    lifecycle: ((r.lifecycle as string) ?? "ACTIVE") as Invoice["lifecycle"],
    customer: (r.customer as Invoice["customer"]) ?? ({} as Invoice["customer"]),
    company: (r.company as Invoice["company"]) ?? ({} as Invoice["company"]),
    bank: (r.bank as Invoice["bank"]) ?? ({} as Invoice["bank"]),
    items: (r.items as Invoice["items"]) ?? [],
    notes: (r.notes as string) ?? "",
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    placeOfSupply: (r.place_of_supply as string) ?? "",
    gstMode: ((r.gst_mode as string) ?? "CGST_SGST") as Invoice["gstMode"],
    isDraft: (r.is_draft as boolean) ?? false,
    ewayBillNumber: (r.eway_bill_number as string) ?? "",
    transportMode: (r.transport_mode as string) ?? "",
    packages: r.packages == null ? undefined : Number(r.packages),
    weight: (r.weight as string) ?? "",
    dispatchFrom: (r.dispatch_from as Invoice["dispatchFrom"]) ?? undefined,
    shipTo: (r.ship_to as Invoice["shipTo"]) ?? undefined,
    supplyType: (r.supply_type as Invoice["supplyType"]) ?? undefined,
    supplyTypeManual: (r.supply_type_manual as boolean) ?? false,
    taxOverride: (r.tax_override as boolean) ?? false,
    cgstPercent: r.cgst_percent == null ? undefined : Number(r.cgst_percent),
    sgstPercent: r.sgst_percent == null ? undefined : Number(r.sgst_percent),
    igstPercent: r.igst_percent == null ? undefined : Number(r.igst_percent),
    cgstAmountOverride: r.cgst_amount_override == null ? undefined : Number(r.cgst_amount_override),
    sgstAmountOverride: r.sgst_amount_override == null ? undefined : Number(r.sgst_amount_override),
    igstAmountOverride: r.igst_amount_override == null ? undefined : Number(r.igst_amount_override),
    sourceQuotationId: (r.source_quotation_id as string) ?? undefined,
    sourceQuotationNumber: (r.source_quotation_number as string) ?? undefined,
    sourceQuotationVersion:
      r.source_quotation_version == null ? undefined : Number(r.source_quotation_version),
  };
}

export function invoiceToRow(inv: Invoice, userId: string) {
  return {
    id: inv.id,
    user_id: userId,
    number: inv.number,
    date: inv.date,
    lifecycle: inv.lifecycle,
    customer: inv.customer as unknown as Json,
    company: inv.company as unknown as Json,
    bank: inv.bank as unknown as Json,
    items: inv.items as unknown as Json,
    notes: inv.notes ?? null,
    place_of_supply: inv.placeOfSupply,
    gst_mode: inv.gstMode,
    is_draft: inv.isDraft ?? false,
    eway_bill_number: inv.ewayBillNumber ?? null,
    transport_mode: inv.transportMode ?? null,
    packages: inv.packages ?? null,
    weight: inv.weight ?? null,
    dispatch_from: (inv.dispatchFrom as unknown as Json) ?? null,
    ship_to: (inv.shipTo as unknown as Json) ?? null,
    supply_type: inv.supplyType ?? null,
    supply_type_manual: inv.supplyTypeManual ?? false,
    tax_override: inv.taxOverride ?? false,
    cgst_percent: inv.cgstPercent ?? null,
    sgst_percent: inv.sgstPercent ?? null,
    igst_percent: inv.igstPercent ?? null,
    cgst_amount_override: inv.cgstAmountOverride ?? null,
    sgst_amount_override: inv.sgstAmountOverride ?? null,
    igst_amount_override: inv.igstAmountOverride ?? null,
    status: inv.isDraft ? "DRAFT" : "ACTIVE",
    source_quotation_id: inv.sourceQuotationId ?? null,
    source_quotation_number: inv.sourceQuotationNumber ?? null,
    source_quotation_version: inv.sourceQuotationVersion ?? null,
  };
}

export function rowToSettings(r: Row, products: ProductMasterEntry[]): Settings {
  const logo = (r.logo_data_url as string) || logoAsset.url;
  const watermark = (r.watermark_data_url as string) || watermarkAsset.url;
  return {
    company: {
      name: (r.name as string) ?? "",
      address: (r.address as string) ?? "",
      phone: (r.phone as string) ?? "",
      phone2: (r.phone2 as string) ?? "",
      email: (r.email as string) ?? "",
      gstin: (r.gstin as string) ?? "",
      state: (r.state as string) ?? "",
      companyTagline: (r.company_tagline as string) ?? "",
      logoDataUrl: logo,
      signatureDataUrl: (r.signature_data_url as string) ?? "",
      watermarkDataUrl: watermark,
    },
    bank: {
      bankName: (r.bank_name as string) ?? "",
      accountNumber: (r.account_number as string) ?? "",
      ifsc: (r.ifsc as string) ?? "",
      branch: (r.branch as string) ?? "",
    },
    invoicePrefix: (r.invoice_prefix as string) ?? "INV",
    invoiceDigits: Number(r.invoice_digits ?? 4),
    defaultGstPercent: Number(r.default_gst_percent ?? 18),
    nextInvoiceNumber: Number(r.next_invoice_number ?? 1),
    gstMode: ((r.gst_mode as string) ?? "CGST_SGST") as Settings["gstMode"],
    productMaster: products,
    quotationPrefix: (r.quotation_prefix as string) ?? "QT",
    quotationDigits: Number(r.quotation_digits ?? 4),
    nextQuotationNumber: Number(r.next_quotation_number ?? 1),
    quotationDefaultValidityDays: Number(r.quotation_default_validity_days ?? 15),
    quotationDefaultTerms: (r.quotation_default_terms as string) ?? "",
    quotationDefaultNotes: (r.quotation_default_notes as string) ?? "",
  };
}

export function settingsToRow(s: Settings, userId: string) {
  return {
    user_id: userId,
    name: s.company.name,
    address: s.company.address,
    phone: s.company.phone,
    phone2: s.company.phone2 ?? null,
    email: s.company.email ?? null,
    gstin: s.company.gstin,
    state: s.company.state,
    company_tagline: s.company.companyTagline,
    logo_data_url: s.company.logoDataUrl ?? null,
    signature_data_url: s.company.signatureDataUrl ?? null,
    watermark_data_url: s.company.watermarkDataUrl ?? null,
    bank_name: s.bank.bankName,
    account_number: s.bank.accountNumber,
    ifsc: s.bank.ifsc,
    branch: s.bank.branch,
    invoice_prefix: s.invoicePrefix,
    invoice_digits: s.invoiceDigits,
    default_gst_percent: s.defaultGstPercent,
    next_invoice_number: s.nextInvoiceNumber,
    gst_mode: s.gstMode,
    quotation_prefix: s.quotationPrefix,
    quotation_digits: s.quotationDigits,
    next_quotation_number: s.nextQuotationNumber,
    quotation_default_validity_days: s.quotationDefaultValidityDays,
    quotation_default_terms: s.quotationDefaultTerms,
    quotation_default_notes: s.quotationDefaultNotes,
  };
}

export function rowToQuotation(r: Row): Quotation {
  return {
    id: r.id as string,
    number: r.number as string,
    date: r.date as string,
    validityDate: (r.validity_date as string) ?? undefined,
    status: ((r.status as string) ?? "draft") as Quotation["status"],
    customer: (r.customer as Quotation["customer"]) ?? ({} as Quotation["customer"]),
    company: (r.company as Quotation["company"]) ?? ({} as Quotation["company"]),
    bank: (r.bank as Quotation["bank"]) ?? ({} as Quotation["bank"]),
    items: (r.items as Quotation["items"]) ?? [],
    notes: (r.notes as string) ?? "",
    terms: (r.terms as string) ?? "",
    salesPerson: (r.sales_person as string) ?? "",
    paymentTerms: (r.payment_terms as string) ?? "",
    deliveryTerms: (r.delivery_terms as string) ?? "",
    customerReference: (r.customer_reference as string) ?? "",
    placeOfSupply: (r.place_of_supply as string) ?? "",
    gstMode: ((r.gst_mode as string) ?? "CGST_SGST") as Quotation["gstMode"],
    supplyType: (r.supply_type as Quotation["supplyType"]) ?? undefined,
    supplyTypeManual: (r.supply_type_manual as boolean) ?? false,
    taxOverride: (r.tax_override as boolean) ?? false,
    cgstPercent: r.cgst_percent == null ? undefined : Number(r.cgst_percent),
    sgstPercent: r.sgst_percent == null ? undefined : Number(r.sgst_percent),
    igstPercent: r.igst_percent == null ? undefined : Number(r.igst_percent),
    cgstAmountOverride: r.cgst_amount_override == null ? undefined : Number(r.cgst_amount_override),
    sgstAmountOverride: r.sgst_amount_override == null ? undefined : Number(r.sgst_amount_override),
    igstAmountOverride: r.igst_amount_override == null ? undefined : Number(r.igst_amount_override),
    ewayBillNumber: (r.eway_bill_number as string) ?? "",
    transportMode: (r.transport_mode as string) ?? "",
    packages: r.packages == null ? undefined : Number(r.packages),
    weight: (r.weight as string) ?? "",
    convertedInvoiceId: (r.converted_invoice_id as string) ?? undefined,
    convertedInvoiceNumber: (r.converted_invoice_number as string) ?? undefined,
    convertedAt: (r.converted_at as string) ?? undefined,
    customerViewedAt: (r.customer_viewed_at as string) ?? undefined,
    isDraft: (r.is_draft as boolean) ?? false,
    lifecycle: ((r.lifecycle as string) ?? "ACTIVE") as Quotation["lifecycle"],
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

export function quotationToRow(q: Quotation, userId: string) {
  return {
    id: q.id,
    user_id: userId,
    number: q.number,
    version: 1,
    is_latest: true,
    parent_quotation_id: null,
    date: q.date,
    validity_date: q.validityDate ?? null,
    status: q.status,
    customer: q.customer as unknown as Json,
    company: q.company as unknown as Json,
    bank: q.bank as unknown as Json,
    items: q.items as unknown as Json,
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    reference_number: null,
    sales_person: q.salesPerson ?? null,
    payment_terms: q.paymentTerms ?? null,
    delivery_terms: q.deliveryTerms ?? null,
    customer_reference: q.customerReference ?? null,
    place_of_supply: q.placeOfSupply,
    gst_mode: q.gstMode,
    supply_type: q.supplyType ?? null,
    supply_type_manual: q.supplyTypeManual ?? false,
    tax_override: q.taxOverride ?? false,
    cgst_percent: q.cgstPercent ?? null,
    sgst_percent: q.sgstPercent ?? null,
    igst_percent: q.igstPercent ?? null,
    cgst_amount_override: q.cgstAmountOverride ?? null,
    sgst_amount_override: q.sgstAmountOverride ?? null,
    igst_amount_override: q.igstAmountOverride ?? null,
    dispatch_from: null,
    ship_to: null,
    eway_bill_number: q.ewayBillNumber ?? null,
    transport_mode: q.transportMode ?? null,
    packages: q.packages ?? null,
    weight: q.weight ?? null,
    converted_invoice_id: q.convertedInvoiceId ?? null,
    converted_invoice_number: q.convertedInvoiceNumber ?? null,
    converted_at: q.convertedAt ?? null,
    customer_viewed_at: q.customerViewedAt ?? null,
    is_draft: q.isDraft ?? false,
    lifecycle: q.lifecycle,
  };
}

export function rowToStock(r: Row): InventoryStock {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    warehouseId: r.warehouse_id as string,
    locationId: r.location_id as string,
    quantity: Number(r.quantity ?? 0),
    updatedAt: r.updated_at as string,
  };
}

export function stockToRow(s: InventoryStock, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    product_id: s.productId,
    warehouse_id: s.warehouseId,
    location_id: s.locationId,
    quantity: s.quantity,
  };
}

export function rowToTransaction(r: Row): InventoryTransaction {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    warehouseId: r.warehouse_id as string,
    locationId: r.location_id as string,
    quantityChange: Number(r.quantity ?? 0),
    transactionType: r.transaction_type as InventoryTransaction["transactionType"],
    referenceType: (r.reference_type as string) ?? undefined,
    referenceId: (r.reference_id as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: r.created_at as string,
  };
}

export function transactionToRow(t: InventoryTransaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    product_id: t.productId,
    warehouse_id: t.warehouseId,
    location_id: t.locationId,
    quantity: t.quantityChange,
    transaction_type: t.transactionType,
    reference_type: t.referenceType ?? null,
    reference_id: t.referenceId ?? null,
    notes: t.notes ?? null,
  };
}

// ---------- API ---------------------------------------------------------

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

export const cloud = {
  async fetchAll() {
    const userId = await currentUserId();

    const [csRes, cusRes, invRes, prodRes, notifRes, stateRes, stockRes, txnRes, whRes, locRes] =
      await Promise.all([
        supabase.from("company_settings").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("customers")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("name"),
        supabase
          .from("invoices")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("product_master").select("*").eq("user_id", userId).is("deleted_at", null),
        supabase.from("app_notifications").select("id, read").eq("user_id", userId),
        supabase.from("user_state").select("state").eq("user_id", userId).maybeSingle(),
        supabase.from("inventory_stock").select("*").eq("user_id", userId),
        supabase
          .from("inventory_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("warehouses").select("*").eq("user_id", userId),
        supabase.from("locations").select("*").eq("user_id", userId),
      ]);

    if (cusRes.error) throw cusRes.error;
    if (invRes.error) throw invRes.error;
    if (prodRes.error) throw prodRes.error;
    if (stockRes.error) throw stockRes.error;
    if (txnRes.error) throw txnRes.error;
    if (whRes.error) throw whRes.error;
    if (locRes.error) throw locRes.error;

    const products = (prodRes.data ?? []).map(rowToProduct);
    const customers = (cusRes.data ?? []).map(rowToCustomer);
    const invoices = (invRes.data ?? []).map(rowToInvoice);
    const inventoryStock = (stockRes.data ?? []).map(rowToStock);
    const inventoryTransactions = (txnRes.data ?? []).map(rowToTransaction);

    const locations: Location[] = (locRes.data || []).map((r) => ({
      id: r.id,
      warehouseId: r.warehouse_id,
      name: r.name,
      code: r.code,
      active: r.active ?? true,
    }));

    const warehouses: Warehouse[] = (whRes.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      address: r.address || "",
      locations: locations.filter((l) => l.warehouseId === r.id),
    }));

    const quoRes = await supabase
      .from("quotations")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const quotations = ((quoRes.data as unknown as Row[]) ?? []).map(rowToQuotation);

    let settings: Settings;
    if (csRes.data) {
      settings = rowToSettings(csRes.data as Row, products);
    } else {
      settings = { ...defaultSettings, productMaster: products };
      await supabase
        .from("company_settings")
        .upsert(settingsToRow(settings, userId), { onConflict: "user_id" });
    }

    const stateJson = (stateRes.data?.state ?? {}) as {
      readNotificationIds?: string[];
      dismissedNotificationIds?: string[];
    };

    return {
      userId,
      settings,
      customers,
      invoices,
      quotations,
      inventoryStock,
      inventoryTransactions,
      warehouses,
      readNotificationIds: stateJson.readNotificationIds ?? [],
      dismissedNotificationIds: stateJson.dismissedNotificationIds ?? [],
      cloudNotifications: (notifRes.data ?? []) as Array<{ id: string; read: boolean }>,
    };
  },

  async upsertCustomer(c: Customer) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("customers")
      .upsert(customerToRow(c, userId), { onConflict: "id" });
    if (error) throw error;
  },

  async deleteCustomer(id: string) {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
  },

  async upsertProduct(p: ProductMasterEntry) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("product_master")
      .upsert(productToRow(p, userId), { onConflict: "id" });
    if (error) throw error;
  },

  async upsertInvoice(inv: Invoice) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("invoices")
      .upsert(invoiceToRow(inv, userId), { onConflict: "id" });
    if (error) throw error;
  },

  async deleteInvoice(id: string) {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw error;
  },

  async upsertQuotation(q: Quotation) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("quotations")
      .upsert(quotationToRow(q, userId), { onConflict: "id" });
    if (error) throw error;
  },

  async deleteQuotation(id: string) {
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) throw error;
  },

  async upsertSettings(s: Settings) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("company_settings")
      .upsert(settingsToRow(s, userId), { onConflict: "user_id" });
    if (error) throw error;
  },

  async saveUserState(state: {
    readNotificationIds: string[];
    dismissedNotificationIds: string[];
  }) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("user_state")
      .upsert(
        { user_id: userId, state: state as unknown as Json, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw error;
  },

  async upsertInventoryStock(s: InventoryStock) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("inventory_stock")
      .upsert(stockToRow(s, userId), { onConflict: "id" });
    if (error) throw error;
  },

  async insertInventoryTransaction(t: InventoryTransaction) {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("inventory_transactions")
      .insert(transactionToRow(t, userId));
    if (error) throw error;
  },

  async fetchWarehouses(): Promise<Warehouse[]> {
    const userId = await currentUserId();
    const [whRes, locRes] = await Promise.all([
      supabase.from("warehouses").select("*").eq("user_id", userId),
      supabase.from("locations").select("*").eq("user_id", userId),
    ]);
    if (whRes.error) throw whRes.error;
    if (locRes.error) throw locRes.error;

    const locations: Location[] = (locRes.data || []).map((r) => ({
      id: r.id,
      warehouseId: r.warehouse_id,
      name: r.name,
      code: r.code,
      active: r.active ?? true,
    }));

    return (whRes.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      address: r.address || "",
      locations: locations.filter((l) => l.warehouseId === r.id),
    }));
  },

  async upsertWarehouse(wh: Warehouse) {
    const userId = await currentUserId();
    const { error } = await supabase.from("warehouses").upsert(
      {
        id: wh.id,
        user_id: userId,
        name: wh.name,
        code: wh.code,
        address: wh.address,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  },

  async deleteWarehouse(id: string) {
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) throw error;
  },

  async upsertLocation(loc: Location) {
    const userId = await currentUserId();
    const { error } = await supabase.from("locations").upsert(
      {
        id: loc.id,
        user_id: userId,
        warehouse_id: loc.warehouseId,
        name: loc.name,
        code: loc.code,
        active: loc.active,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  },

  async deleteLocation(id: string) {
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) throw error;
  },
};
