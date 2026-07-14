import type { Invoice } from "./types";
import { computeTotals, formatINR } from "./calc";

export type NotificationKind = "warning" | "info" | "success";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string; // ISO
  link?: string;
}

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export function deriveNotifications(invoices: Invoice[]): AppNotification[] {
  const out: AppNotification[] = [];

  for (const inv of invoices) {
    if (inv.lifecycle === "CANCELLED") continue;
    const created = inv.createdAt || inv.date;
    const age = daysSince(created);
    const totals = computeTotals(inv);

    if (inv.isDraft) {
      out.push({
        id: `draft:${inv.id}`,
        kind: "info",
        title: `Draft invoice ${inv.number}`,
        message: `${inv.customer?.name || "Customer"} — saved as draft`,
        createdAt: created,
        link: `/invoices/${inv.id}`,
      });
      continue;
    }

    if (age <= 1) {
      out.push({
        id: `new:${inv.id}`,
        kind: "success",
        title: `New invoice ${inv.number}`,
        message: `${inv.customer?.name || "Customer"} — ${formatINR(totals.grandTotal)}`,
        createdAt: created,
        link: `/invoices/${inv.id}`,
      });
    }
  }

  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
