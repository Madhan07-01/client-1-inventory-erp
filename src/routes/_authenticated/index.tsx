import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { computeTotals, formatINR, formatDate } from "@/lib/calc";
import { FileText, IndianRupee, Receipt, FileClock, TrendingUp } from "lucide-react";
import type { Invoice } from "@/lib/types";
import { effectiveStatus } from "@/lib/quotation-actions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard · FastenerERP Billing" },
      { name: "description", content: "Overview of invoices, revenue and pending payments." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const allInvoices = useApp((s) => s.invoices);
  const allQuotations = useApp((s) => s.quotations);
  const invoices = allInvoices.filter((i) => i.lifecycle !== "CANCELLED" && !i.isDraft);
  const quotations = allQuotations.filter((q) => q.lifecycle !== "CANCELLED");

  let revenue = 0;
  let gstCollected = 0;
  for (const inv of invoices) {
    const t = computeTotals(inv);
    revenue += t.grandTotal;
    gstCollected += t.gstTotal;
  }

  let quotationValue = 0;
  let draftCount = 0;
  let convertedCount = 0;
  let expiredCount = 0;
  let cancelledCount = 0;
  for (const q of quotations) {
    const t = computeTotals(q as unknown as Invoice);
    quotationValue += t.grandTotal;
    const s = effectiveStatus(q);
    if (s === "draft") draftCount++;
    else if (s === "converted") convertedCount++;
    else if (s === "expired") expiredCount++;
    else if (s === "cancelled") cancelledCount++;
  }
  const totalForRate = draftCount + convertedCount + expiredCount;
  const conversionRate = totalForRate > 0 ? Math.round((convertedCount / totalForRate) * 100) : 0;

  const recent = [...invoices].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 8);

  const cards = [
    {
      label: "Total Invoices",
      value: invoices.length.toString(),
      icon: FileText,
      tint: "var(--surface-header)",
    },
    {
      label: "Total Revenue",
      value: formatINR(revenue),
      icon: IndianRupee,
      tint: "var(--surface-summary)",
    },
    {
      label: "GST Collected",
      value: formatINR(gstCollected),
      icon: Receipt,
      tint: "var(--surface-invoice)",
    },
    {
      label: "Total Quotations",
      value: quotations.length.toString(),
      icon: FileClock,
      tint: "var(--surface-customer)",
    },
    {
      label: "Quotation Value",
      value: formatINR(quotationValue),
      icon: IndianRupee,
      tint: "var(--surface-header)",
    },
    {
      label: `Conversion Rate (${convertedCount}/${totalForRate})`,
      value: `${conversionRate}%`,
      icon: TrendingUp,
      tint: "var(--surface-summary)",
    },
  ];
  void expiredCount;
  void cancelledCount;

  return (
    <AppShell>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Snapshot of your billing activity.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-lg border bg-white p-5">
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center mb-4"
                  style={{ background: c.tint }}
                >
                  <Icon className="h-5 w-5 text-foreground/70" />
                </div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </div>
                <div className="text-2xl font-bold mt-1">{c.value}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-lg border bg-white">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Recent Invoices</h2>
              <Link to="/invoices" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No invoices yet. Click "New Invoice" to create one.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-5 py-3 font-medium">Invoice #</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((inv) => {
                    const t = computeTotals(inv);
                    return (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <Link
                            to="/invoices/$id"
                            params={{ id: inv.id }}
                            className="font-medium hover:underline"
                          >
                            {inv.number}
                          </Link>
                        </td>
                        <td className="px-5 py-3">{inv.customer.name}</td>
                        <td className="px-5 py-3">{formatDate(inv.date)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatINR(t.grandTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
