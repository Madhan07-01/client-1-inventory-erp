export type InvoiceLifecycle = "ACTIVE" | "CANCELLED";

export type QuotationStatus = "draft" | "expired" | "converted" | "cancelled";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  gstin: string;
  address: string;
  state?: string;
  pincode?: string;
  contactPerson?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  phone2?: string;
  email?: string;
  gstin: string;
  state: string;
  companyTagline: string;
  logoDataUrl?: string;
  signatureDataUrl?: string;
  watermarkDataUrl?: string;
  /** Proprietor / head of company — stored for future use, not displayed in app UI */
  head?: string;
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
}

export interface InvoiceDispatchFrom {
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface InvoiceShipTo {
  city: string;
  state: string;
  pincode: string;
}

/**
 * Product Master — catalogue identity only.
 * Inventory-specific details (size, grade, finish, lot, supplier, etc.)
 * now belong to InventoryStock (Warehouse Ledger Adjustment).
 */
export interface ProductMasterEntry {
  id: string;
  description: string;
  active?: boolean;
  sku?: string;
  barcodeValue?: string;
  qrValue?: string;
  // Hardware specifications
  itemType?: string;
  brandName?: string;
  // Legacy fields — kept for backward compatibility with existing stored data.
  hsn?: string;
  gstPercent?: number;
  defaultRate?: number;
  lotNo?: string;
  goodsFrom?: string;
}

export type SupplyType = "WITHIN_STATE" | "OTHER_STATE";

export interface Settings {
  company: CompanyInfo;
  bank: BankInfo;
  invoicePrefix: string;
  invoiceDigits: number;
  defaultGstPercent: number;
  nextInvoiceNumber: number;
  gstMode: GstMode;
  productMaster: ProductMasterEntry[];
  quotationPrefix: string;
  quotationDigits: number;
  nextQuotationNumber: number;
  quotationDefaultValidityDays: number;
  quotationDefaultTerms: string;
  quotationDefaultNotes: string;
  /** legacy — kept for backward compatibility with older stored data */
  cgstEnabled?: boolean;
  sgstEnabled?: boolean;
  igstEnabled?: boolean;
}

export type GstMode = "CGST_SGST" | "IGST";

export interface InvoiceItem {
  id: string;
  description: string;
  condition: string;
  hsn: string;
  quantity: number | null;
  unit: string;
  price: number | null;
  gstPercent: number | null;
  /** Reference to the inventory batch (InventoryStock.id) used when dispatching */
  stockBatchId?: string;
  /** Permanent snapshot fields for traceability even if the inventory stock is deleted */
  productId?: string;
  warehouseId?: string;
  warehouseName?: string;
  lotNumber?: string;
  allocationTimestamp?: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string; // ISO yyyy-mm-dd
  lifecycle: InvoiceLifecycle;
  customer: Customer;
  company: CompanyInfo;
  bank: BankInfo;
  items: InvoiceItem[];
  notes?: string;
  createdAt: string;
  /** snapshot of state for GST split logic */
  placeOfSupply: string;
  gstMode: GstMode;
  isDraft?: boolean;
  ewayBillNumber?: string;
  transportMode?: string;
  packages?: number;
  weight?: string;
  dispatchFrom?: InvoiceDispatchFrom;
  dispatchWarehouseId?: string;
  dispatchLocationId?: string;
  multiWarehouseDispatch?: boolean;
  manualDispatchOverride?: boolean;
  shipTo?: InvoiceShipTo;
  supplyType?: SupplyType;
  supplyTypeManual?: boolean;
  /** Legacy — kept for backward compat with historical invoices. Not editable via UI on new invoices. */
  taxOverride?: boolean;
  cgstPercent?: number;
  sgstPercent?: number;
  igstPercent?: number;
  cgstAmountOverride?: number;
  sgstAmountOverride?: number;
  igstAmountOverride?: number;
  /** bi-directional linking: when this invoice was created from a quotation */
  sourceQuotationId?: string;
  sourceQuotationNumber?: string;
  sourceQuotationVersion?: number;
}

export interface Quotation {
  id: string;
  number: string;
  date: string;
  validityDate?: string;
  status: QuotationStatus;
  customer: Customer;
  company: CompanyInfo;
  bank: BankInfo;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  salesPerson?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  customerReference?: string;
  placeOfSupply: string;
  gstMode: GstMode;
  supplyType?: SupplyType;
  supplyTypeManual?: boolean;
  taxOverride?: boolean;
  cgstPercent?: number;
  sgstPercent?: number;
  igstPercent?: number;
  cgstAmountOverride?: number;
  sgstAmountOverride?: number;
  igstAmountOverride?: number;
  ewayBillNumber?: string;
  transportMode?: string;
  packages?: number;
  weight?: string;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  convertedAt?: string;
  customerViewedAt?: string;
  isDraft?: boolean;
  lifecycle: InvoiceLifecycle;
  createdAt: string;
}

/**
 * InventoryStock — one record per product + warehouse + location + batch.
 * This is the authoritative source for variants, purchase details, and stock quantities.
 */
export interface InventoryStock {
  id?: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: number;
  updatedAt?: string;
  // --- Batch / variant fields (Warehouse Ledger Adjustment) ---
  lotNo?: string;
  brandName?: string;
  supplier?: string;
  goodsFrom?: string;
  purchaseDate?: string;
  purchaseRate?: number;
  purchaseRef?: string;
  size?: string;
  grade?: string;
  thread?: string;
  threadType?: string;
  finish?: string;
  remarks?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  /** Available-for-sale qty (may differ from quantity if some are reserved) */
  availableQty?: number;
  /** Category of the stock entry — affects label layout */
  category?: "New" | "Acid";
}

export interface InventoryTransaction {
  id?: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  quantityChange: number;
  transactionType: "IN" | "OUT" | "ADJUST";
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  remarks?: string;
  brandName?: string;
  supplier?: string;
  goodsFrom?: string;
  lotNo?: string;
  threadType?: string;
  createdAt?: string;
}

export interface Location {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  locations: Location[];
}
