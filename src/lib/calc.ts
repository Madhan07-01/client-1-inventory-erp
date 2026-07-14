import type { Invoice, InvoiceItem } from "./types";
import type { SupplyType } from "./types";

export function lineGstAmount(item: InvoiceItem): number {
  const q = item.quantity ?? 0;
  const p = item.price ?? 0;
  const g = item.gstPercent ?? 0;
  return (q * p * g) / 100;
}

export function lineSubtotal(item: InvoiceItem): number {
  return (item.quantity ?? 0) * (item.price ?? 0);
}

export function lineTotal(item: InvoiceItem): number {
  return lineSubtotal(item) + lineGstAmount(item);
}

export interface InvoiceTotals {
  subtotal: number;
  gstTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  roundedTotal: number;
  roundedOff: number;
  isInterState: boolean;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  taxableAmount: number;
}

export function computeTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = invoice.items.reduce((s, it) => s + lineSubtotal(it), 0);
  const itemsGst = invoice.items.reduce((s, it) => s + lineGstAmount(it), 0);
  const supplyType: SupplyType =
    invoice.supplyType ?? (invoice.gstMode === "IGST" ? "OTHER_STATE" : "WITHIN_STATE");
  const isInterState = supplyType === "OTHER_STATE";

  // Tax Details card percentages (defaults). Snapshot to whatever the invoice carries,
  // falling back to 9/9/18.
  const cgstPercent = invoice.cgstPercent ?? 9;
  const sgstPercent = invoice.sgstPercent ?? 9;
  const igstPercent = invoice.igstPercent ?? 18;

  let cgst: number;
  let sgst: number;
  let igst: number;

  if (invoice.taxOverride) {
    if (isInterState) {
      igst = invoice.igstAmountOverride ?? (subtotal * igstPercent) / 100;
      cgst = igst / 2;
      sgst = igst / 2;
    } else {
      cgst = invoice.cgstAmountOverride ?? (subtotal * cgstPercent) / 100;
      sgst = invoice.sgstAmountOverride ?? (subtotal * sgstPercent) / 100;
      igst = cgst + sgst;
    }
  } else {
    // Per-row GST split evenly. We populate all three breakdown values for
    // display (CGST + SGST always equals IGST), regardless of mode.
    cgst = itemsGst / 2;
    sgst = itemsGst / 2;
    igst = itemsGst;
  }
  // CGST + SGST = IGST. Only count one side.
  const gstTotal = igst;
  const grandTotal = subtotal + gstTotal;
  const roundedTotal = Math.round(grandTotal);
  const roundedOff = roundedTotal - grandTotal;
  return {
    subtotal,
    gstTotal,
    cgst,
    sgst,
    igst,
    grandTotal,
    roundedTotal,
    roundedOff,
    isInterState,
    cgstPercent,
    sgstPercent,
    igstPercent,
    taxableAmount: subtotal,
  };
}

export function deriveSupplyType(
  dispatchState: string | undefined,
  destState: string | undefined,
): SupplyType {
  const a = (dispatchState ?? "").trim().toLowerCase();
  const b = (destState ?? "").trim().toLowerCase();
  if (!a || !b) return "WITHIN_STATE";
  return a === b ? "WITHIN_STATE" : "OTHER_STATE";
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(isFinite(value) ? value : 0);
}

export function formatINRPlain(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(isFinite(value) ? value : 0);
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(ONES[h] + " Hundred");
  if (r) parts.push(twoDigits(r));
  return parts.join(" ");
}

export function numberToIndianWords(amount: number): string {
  if (!isFinite(amount)) return "";
  const sign = amount < 0 ? "Minus " : "";
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  function inWords(num: number): string {
    if (num === 0) return "Zero";
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const rest = num % 1000;
    const parts: string[] = [];
    if (crore) parts.push(twoDigits(crore) + " Crore");
    if (lakh) parts.push(twoDigits(lakh) + " Lakh");
    if (thousand) parts.push(twoDigits(thousand) + " Thousand");
    if (rest) parts.push(threeDigits(rest));
    return parts.join(" ").trim();
  }

  let s = sign + inWords(rupees) + " Rupees";
  if (paise) s += " and " + twoDigits(paise) + " Paise";
  return s + " Only";
}
