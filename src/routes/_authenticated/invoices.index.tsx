import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { computeTotals, formatINR, formatDate } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Plus, Search, Trash2, Pencil, Printer, Ban } from "lucide-react";
import { toast } from "sonner";
import { printInvoicePdf } from "@/components/InvoicePdf";
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

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({ meta: [{ title: "Invoices · FastenerERP Billing" }] }),
  component: InvoicesList,
});

function InvoicesList() {
  const invoices = useApp((s) => s.invoices);
  const deleteInvoice = useApp((s) => s.deleteInvoice);
  const saveInvoice = useApp((s) => s.saveInvoice);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices
      .filter((inv) => (showCancelled ? true : inv.lifecycle !== "CANCELLED"))
      .filter((inv) => (showDrafts ? true : !inv.isDraft))
      .filter((inv) =>
        q ? [inv.number, inv.customer.name].join(" ").toLowerCase().includes(q) : true,
      )
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [invoices, query, showCancelled, showDrafts]);

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

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate, review, and export your bills.
            </p>
          </div>
          <Button onClick={() => navigate({ to: "/invoices/new" })} className="gap-2">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
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

          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
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
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3">{inv.customer.name}</td>
                      <td className="px-5 py-3">{formatDate(inv.date)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatINR(t.grandTotal)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1">
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
        </div>
      </div>
    </AppShell>
  );
}
