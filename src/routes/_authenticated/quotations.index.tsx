import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";
import { computeTotals, formatINR, formatDate } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Pencil, Printer, ArrowRightCircle, FileDown } from "lucide-react";
import { toast } from "sonner";
import { printQuotationPdf, downloadQuotationPdf } from "@/components/QuotationPdf";
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
import {
  convertQuotationToInvoice,
  effectiveStatus,
  quotationStatusMeta,
} from "@/lib/quotation-actions";
import type { Invoice, Quotation, QuotationStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/quotations/")({
  head: () => ({ meta: [{ title: "Quotations · Madeena Traders" }] }),
  component: QuotationsList,
});

const STATUS_FILTERS: Array<{ value: QuotationStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Converted" },
  { value: "cancelled", label: "Cancelled" },
];

function QuotationsList() {
  const quotations = useApp((s) => s.quotations);
  const deleteQuotation = useApp((s) => s.deleteQuotation);
  const saveQuotation = useApp((s) => s.saveQuotation);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotations
      .filter((quo) => (statusFilter === "all" ? true : effectiveStatus(quo) === statusFilter))
      .filter((quo) =>
        q
          ? [quo.number, quo.customer.name, quo.company.name].join(" ").toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [quotations, query, statusFilter]);

  async function handlePrint(id: string) {
    const src = quotations.find((q) => q.id === id);
    if (!src) return;
    await printQuotationPdf(src);
  }
  async function handleDownload(id: string) {
    const src = quotations.find((q) => q.id === id);
    if (!src) return;
    await downloadQuotationPdf(src);
  }

  async function handleConvert(q: Quotation, openInvoice: boolean) {
    try {
      const st = useApp.getState();
      const result: { invoice: Invoice; quotation: Quotation } = convertQuotationToInvoice(q, st);
      st.saveInvoice(result.invoice);
      st.saveQuotation(result.quotation);
      if (openInvoice) {
        toast.success(`Converted to ${result.invoice.number}`);
        navigate({ to: "/invoices/$id", params: { id: result.invoice.id } });
      } else {
        toast.success(`Invoice ${result.invoice.number} created`);
      }
    } catch (e) {
      const msg = (e as { message?: string })?.message || "Conversion failed";
      toast.error(msg);
    }
  }

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Quotations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create, revise, and convert pre-sales quotations.
            </p>
          </div>
          <Button onClick={() => navigate({ to: "/quotations/new" })} className="gap-2">
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search number, customer, company..."
                className="bg-transparent outline-none text-sm flex-1"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | "all")}
              className="text-sm border rounded-md px-2 py-1.5 bg-white"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No quotations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-5 py-3 font-medium">Quotation #</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Valid Until</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((quo) => {
                    const t = computeTotals(quo as unknown as Invoice);
                    const status = effectiveStatus(quo);
                    const meta = quotationStatusMeta(status);
                    const locked =
                      status === "converted" || status === "cancelled" || status === "expired";
                    return (
                      <tr key={quo.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <Link
                            to="/quotations/$id"
                            params={{ id: quo.id }}
                            className="font-medium hover:underline"
                          >
                            {quo.number}
                          </Link>
                        </td>
                        <td className="px-5 py-3">{quo.customer.name}</td>
                        <td className="px-5 py-3">{formatDate(quo.date)}</td>
                        <td className="px-5 py-3">
                          {quo.validityDate ? formatDate(quo.validityDate) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge className={meta.className}>{meta.label}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatINR(t.grandTotal)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate({ to: "/quotations/$id", params: { id: quo.id } })
                              }
                              title="View / Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrint(quo.id)}
                              title="Print"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(quo.id)}
                              title="Download PDF"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            {!locked && !quo.convertedInvoiceId && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" title="Convert to Invoice">
                                    <ArrowRightCircle className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Convert {quo.number}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      A new invoice will be created with all details from this
                                      quotation. The quotation becomes read-only.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <Button
                                      variant="outline"
                                      onClick={() => handleConvert(quo, false)}
                                    >
                                      Convert &amp; Keep Open
                                    </Button>
                                    <AlertDialogAction onClick={() => handleConvert(quo, true)}>
                                      Convert &amp; Open Invoice
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
                                  <AlertDialogTitle>Delete {quo.number}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently removes the quotation. This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      deleteQuotation(quo.id);
                                      toast.success("Quotation deleted");
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
