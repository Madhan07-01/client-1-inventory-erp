import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { computeTotals, formatINR, formatDate } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Plus, Search, Trash2, Pencil, Printer, Ban } from "lucide-react";
import { toast } from "sonner";
import { printInvoicePdf } from "@/components/InvoicePdf";
import { cloud } from "@/lib/cloud";
import { isToday, startOfMonth, parseISO, isAfter } from "date-fns";
import { TrendChart } from "@/components/analytics/TrendChart";
import { KpiCard } from "@/components/analytics/KpiCard";
import { IndianRupee, FileText, Receipt, TrendingUp, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Invoice } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({ meta: [{ title: "Invoices · FastenerERP Billing" }] }),
  component: InvoicesList,
});

function InvoicesList() {
  const invoices = useApp((s) => s.invoices);
  const deleteInvoice = useApp((s) => s.deleteInvoice);
  const saveInvoice = useApp((s) => s.saveInvoice);
  const appendInvoices = useApp((s) => s.appendInvoices);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Invoice[] | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch remote search results
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults(null);
      return;
    }
    let active = true;
    cloud.searchInvoices(debouncedQuery).then((res) => {
      if (active) setSearchResults(res);
    }).catch(console.error);
    return () => { active = false; };
  }, [debouncedQuery]);

  const sourceInvoices = searchResults ?? invoices;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = sourceInvoices
      .filter((inv) => (showCancelled ? true : inv.lifecycle !== "CANCELLED"))
      .filter((inv) => (showDrafts ? true : !inv.isDraft));

    if (q) {
      list = list.filter((inv) => [inv.number, inv.customer.name].join(" ").toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [sourceInvoices, query, showCancelled, showDrafts]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const offset = invoices.length;
      const more = await cloud.loadMoreInvoices(offset, 50);
      appendInvoices(more);
      if (more.length === 0) toast.info("No more invoices to load");
    } catch (e) {
      toast.error("Failed to load more invoices");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handlePrint(id: string) {
    const src = invoices.find((i) => i.id === id);
    if (!src) return;
    await printInvoicePdf(src);
  }

  function handleCancel(id: string) {
    const src = invoices.find((i) => i.id === id);
    if (!src) return;
    saveInvoice({ ...src, lifecycle: "CANCELLED" });
    toast.success("Invoice cancelled");
  }

  // Analytics
  const analytics = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);

    let thisMonthRevenue = 0;
    let thisMonthGst = 0;
    let thisMonthCount = 0;
    let todaysCount = 0;
    let highestInvoice = 0;
    let totalRevenue = 0;
    // Assuming no payment tracking yet, pending is N/A or simplified.

    invoices.forEach(inv => {
      if (inv.lifecycle === "CANCELLED" || inv.isDraft) return;
      const t = computeTotals(inv);
      const invDate = parseISO(inv.createdAt);
      
      totalRevenue += t.grandTotal;
      highestInvoice = Math.max(highestInvoice, t.grandTotal);

      if (isAfter(invDate, monthStart)) {
        thisMonthRevenue += t.grandTotal;
        thisMonthGst += t.gstTotal;
        thisMonthCount++;
      }
      if (isToday(invDate)) {
        todaysCount++;
      }
    });

    const activeCount = invoices.filter(i => i.lifecycle !== "CANCELLED" && !i.isDraft).length;
    const avgValue = activeCount > 0 ? totalRevenue / activeCount : 0;

    return {
      activeCount,
      thisMonthRevenue,
      thisMonthGst,
      thisMonthCount,
      todaysCount,
      highestInvoice,
      avgValue,
    };
  }, [invoices]);

  return (
    <AppShell>
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Invoices</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Generate, review, and export your bills.
            </p>
          </div>
          <Button onClick={() => navigate({ to: "/invoices/new" })} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>

        {/* Invoice KPIs */}
        <div className="flex overflow-x-auto gap-4 pb-2 snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <KpiCard className="min-w-[240px] snap-center shrink-0" label="This Month Revenue" value={formatINR(analytics.thisMonthRevenue)} icon={IndianRupee} tint="#3b82f6" />
          <KpiCard className="min-w-[240px] snap-center shrink-0" label="This Month GST" value={formatINR(analytics.thisMonthGst)} icon={Receipt} tint="#f59e0b" />
          <KpiCard className="min-w-[240px] snap-center shrink-0" label="Invoices This Month" value={analytics.thisMonthCount} icon={FileText} tint="#10b981" />
          <KpiCard className="min-w-[240px] snap-center shrink-0" label="Today's Invoices" value={analytics.todaysCount} icon={AlertCircle} tint="#8b5cf6" />
          <KpiCard className="min-w-[240px] snap-center shrink-0" label="Average Invoice" value={formatINR(analytics.avgValue)} icon={TrendingUp} tint="#0ea5e9" />
          <KpiCard className="min-w-[240px] snap-center shrink-0" label="Highest Invoice" value={formatINR(analytics.highestInvoice)} icon={TrendingUp} tint="#f43f5e" />
        </div>

        <div className="rounded-lg border bg-white overflow-x-auto w-full">
          <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice number or customer..."
                className="bg-transparent outline-none text-sm flex-1"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
              />
              Show cancelled
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showDrafts}
                onChange={(e) => setShowDrafts(e.target.checked)}
              />
              Show drafts
            </label>
          </div>

          <table className="w-full text-xs sm:text-sm min-w-[550px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium">Invoice #</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium">Customer</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium">Date</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium text-right">Total</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const t = computeTotals(inv);
                  return (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 whitespace-nowrap">
                        <Link
                          to="/invoices/$id"
                          params={{ id: inv.id }}
                          className="font-medium hover:underline"
                        >
                          {inv.number}
                        </Link>
                        {inv.isDraft && (
                          <span className="ml-2 inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 break-words max-w-[180px]">{inv.customer.name}</td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-right tabular-nums whitespace-nowrap">
                        {formatINR(t.grandTotal)}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate({ to: "/invoices/$id", params: { id: inv.id } })
                            }
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(inv.id)}
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {inv.lifecycle !== "CANCELLED" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Cancel invoice">
                                  <Ban className="h-4 w-4 text-amber-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel {inv.number}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cancelled invoices stay on record for audit but won't count
                                    toward revenue or pending balances.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep invoice</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancel(inv.id)}>
                                    Cancel invoice
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {inv.number}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes the invoice from your records. For
                                  audits, prefer Cancel instead.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteInvoice(inv.id);
                                    toast.success("Invoice deleted");
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {/* Pagination Load More */}
          {!query && (
            <div className="p-4 border-t flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleLoadMore} 
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load Older Invoices"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
