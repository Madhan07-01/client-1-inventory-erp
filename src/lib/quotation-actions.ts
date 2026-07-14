import type { Invoice, Quotation, QuotationStatus } from "./types";
import { newId } from "./store";

/** Snapshot of just the store slices this module needs, to keep it testable. */
export interface QuotationActionsCtx {
  settings: {
    quotationPrefix: string;
    quotationDigits: number;
    nextQuotationNumber: number;
    quotationDefaultValidityDays: number;
    invoicePrefix: string;
    invoiceDigits: number;
    nextInvoiceNumber: number;
  };
  consumeQuotationNumber: () => string;
  consumeInvoiceNumber: () => string;
}

/**
 * Convert a quotation into an Invoice. Consumes the next invoice number and
 * returns the (still-unsaved) invoice + updated quotation ready to persist.
 */
export function convertQuotationToInvoice(
  q: Quotation,
  ctx: QuotationActionsCtx,
): { invoice: Invoice; quotation: Quotation } {
  if (q.status === "converted" || q.convertedInvoiceId) {
    throw new Error(`Already converted — invoice ${q.convertedInvoiceNumber ?? ""}`);
  }
  if (q.status === "cancelled") {
    throw new Error("Cancelled quotations cannot be converted.");
  }
  if (isExpired(q)) {
    throw new Error("Expired quotations cannot be converted.");
  }
  const invoiceNumber = ctx.consumeInvoiceNumber();
  const today = new Date().toISOString().slice(0, 10);
  const invoiceId = newId();

  const invoice: Invoice = {
    id: invoiceId,
    number: invoiceNumber,
    date: today,
    lifecycle: "ACTIVE",
    customer: q.customer,
    company: q.company,
    bank: q.bank,
    items: q.items,
    notes: q.notes ?? "",
    createdAt: new Date().toISOString(),
    placeOfSupply: q.placeOfSupply,
    gstMode: q.gstMode,
    isDraft: false,
    ewayBillNumber: q.ewayBillNumber,
    transportMode: q.transportMode,
    packages: q.packages,
    weight: q.weight,
    supplyType: q.supplyType,
    supplyTypeManual: q.supplyTypeManual,
    taxOverride: q.taxOverride,
    cgstPercent: q.cgstPercent,
    sgstPercent: q.sgstPercent,
    igstPercent: q.igstPercent,
    cgstAmountOverride: q.cgstAmountOverride,
    sgstAmountOverride: q.sgstAmountOverride,
    igstAmountOverride: q.igstAmountOverride,
    sourceQuotationId: q.id,
    sourceQuotationNumber: q.number,
  };

  const quotation: Quotation = {
    ...q,
    status: "converted",
    convertedInvoiceId: invoiceId,
    convertedInvoiceNumber: invoiceNumber,
    convertedAt: new Date().toISOString(),
  };

  return { invoice, quotation };
}

function isExpired(q: Quotation): boolean {
  if (!q.validityDate) return false;
  if (q.status !== "draft") return false;
  const today = new Date().toISOString().slice(0, 10);
  return q.validityDate < today;
}

/**
 * Derive display status. A draft quotation past its validity date shows as
 * "expired" without necessarily mutating the stored status.
 */
export function effectiveStatus(q: Quotation): QuotationStatus {
  if (isExpired(q)) return "expired";
  return q.status;
}

/**
 * If a draft quotation is past its validity, return a persisted "expired"
 * copy; otherwise return null. Callers persist the returned value.
 */
export function maybeExpireQuotation(q: Quotation): Quotation | null {
  if (!isExpired(q)) return null;
  return { ...q, status: "expired" };
}

export interface QuotationStatusMeta {
  label: string;
  className: string;
}

export function quotationStatusMeta(status: QuotationStatus): QuotationStatusMeta {
  switch (status) {
    case "draft":
      return { label: "Draft", className: "bg-slate-200 text-slate-800 hover:bg-slate-200" };
    case "expired":
      return { label: "Expired", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" };
    case "converted":
      return { label: "Converted", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-neutral-200 text-neutral-700 hover:bg-neutral-200",
      };
    default:
      return { label: status, className: "bg-slate-200 text-slate-800 hover:bg-slate-200" };
  }
}
