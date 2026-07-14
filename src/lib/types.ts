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

export interface ProductMasterEntry {
  id: string;
  description: string;
  hsn: string;
  gstPercent: number;
  defaultRate?: number;
  active?: boolean;
  sku?: string;
  barcodeValue?: string;
  qrValue?: string;
  lotNo?: string;
  goodsFrom?: string;
  size?: string;
  tread?: string;
  grade?: string;
  finish?: string;
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
  shipTo?: InvoiceShipTo;
  supplyType?: SupplyType;
  supplyTypeManual?: boolean;
  /** when true, cgstAmountOverride/sgstAmountOverride/igstAmountOverride are respected */
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

export interface InventoryStock {
  id?: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: number;
  updatedAt?: string;
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
