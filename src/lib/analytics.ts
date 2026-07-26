import {
  isToday,
  isYesterday,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  subMonths,
} from "date-fns";
import type { Invoice, Customer, InventoryStock } from "./types";
import { computeTotals } from "./calc";

export type DateRangeFilter =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "CUSTOM";

export function filterByDateRange<T>(
  items: T[],
  dateFieldExtractor: (item: T) => string,
  filter: DateRangeFilter,
  customRange?: { start: Date; end: Date }
): T[] {
  if (filter === "ALL") return items;

  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (filter) {
    case "TODAY":
      return items.filter((item) => {
        const itemDate = parseISO(dateFieldExtractor(item));
        return isToday(itemDate);
      });
    case "YESTERDAY":
      return items.filter((item) => {
        const itemDate = parseISO(dateFieldExtractor(item));
        return isYesterday(itemDate);
      });
    case "LAST_7_DAYS":
      start = subDays(now, 7);
      break;
    case "LAST_30_DAYS":
      start = subDays(now, 30);
      break;
    case "THIS_MONTH":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case "LAST_MONTH": {
      const prevMonth = subMonths(now, 1);
      start = startOfMonth(prevMonth);
      end = endOfMonth(prevMonth);
      break;
    }
    case "THIS_QUARTER":
      start = startOfQuarter(now);
      end = endOfQuarter(now);
      break;
    case "THIS_YEAR":
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    case "CUSTOM":
      if (!customRange) return items;
      start = customRange.start;
      end = customRange.end;
      break;
    default:
      return items;
  }

  return items.filter((item) => {
    const itemDate = parseISO(dateFieldExtractor(item));
    return isWithinInterval(itemDate, { start, end });
  });
}

// Compute basic stats for a set of invoices
export function computeInvoiceStats(invoices: Invoice[]) {
  let revenue = 0;
  let gst = 0;
  invoices.forEach((inv) => {
    if (inv.lifecycle === "CANCELLED" || inv.isDraft) return;
    const totals = computeTotals(inv);
    revenue += totals.grandTotal;
    gst += totals.gstTotal;
  });
  const count = invoices.filter((i) => i.lifecycle !== "CANCELLED" && !i.isDraft).length;
  return { revenue, gst, count };
}
