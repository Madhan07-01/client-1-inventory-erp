import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { computeTotals, formatINR, formatDate } from "@/lib/calc";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Search, Printer, Pencil, FileDown, RefreshCw, User, Globe, Layers } from "lucide-react";
import { toast } from "sonner";
import { printInvoicePdf } from "@/components/InvoicePdf";
import type { Invoice, Customer } from "@/lib/types";
import { LotNumberReport } from "@/components/reports/LotNumberReport";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

// ── Period helpers ─────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  "Today",
  "This Week",
  "Last Week",
  "This Month",
  "Last Month",
  "This Quarter",
  "This Financial Year",
  "This Calendar Year",
  "Custom Date Range",
] as const;

export function getDateRange(period: string): { from: string; to: string } {
  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = toISO(today);
  if (period === "Today") return { from: todayStr, to: todayStr };
  if (period === "This Week") {
    const day = today.getDay();
    const diffToMon = (day + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - diffToMon);
    return { from: toISO(mon), to: todayStr };
  }
  if (period === "Last Week") {
    const day = today.getDay();
    const diffToMon = (day + 6) % 7;
    const thisMon = new Date(today);
    thisMon.setDate(today.getDate() - diffToMon);
    const lastMon = new Date(thisMon);
    lastMon.setDate(thisMon.getDate() - 7);
    const lastSun = new Date(thisMon);
    lastSun.setDate(thisMon.getDate() - 1);
    return { from: toISO(lastMon), to: toISO(lastSun) };
  }
  if (period === "This Month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(first), to: todayStr };
  }
  if (period === "Last Month") {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toISO(first), to: toISO(last) };
  }
  if (period === "This Quarter") {
    const q = Math.floor(today.getMonth() / 3);
    const first = new Date(today.getFullYear(), q * 3, 1);
    return { from: toISO(first), to: todayStr };
  }
  if (period === "This Financial Year") {
    const yr = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
  }
  if (period === "This Calendar Year") {
    return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` };
  }
  return { from: todayStr, to: todayStr };
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatusBadge({ inv }: { inv: Invoice }) {
  if (inv.isDraft) return <Badge variant="secondary">DRAFT</Badge>;
  if (inv.lifecycle === "CANCELLED") return <Badge variant="destructive">CANCELLED</Badge>;
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">ACTIVE</Badge>;
}

export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function EmptyPromptState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <BarChart2 className="h-10 w-10 opacity-30" />
      <p className="text-sm font-medium">
        {message ?? "Select filters and click Generate Report."}
      </p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
      <RefreshCw className="h-5 w-5 animate-spin" />
      <span className="text-sm">Generating report…</span>
    </div>
  );
}

// Shared period filter UI
export function PeriodFilterRow({
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  dateError,
  setDateError,
  resolvedRange,
}: {
  period: string;
  setPeriod: (p: string) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  dateError: string;
  setDateError: (e: string) => void;
  resolvedRange: { from: string; to: string };
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Period
        </label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setDateError("");
          }}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {period === "Custom Date Range" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-full">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              From Date
            </label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setDateError("");
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              To Date
            </label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setDateError("");
              }}
            />
          </div>
          {dateError && <p className="sm:col-span-2 text-xs text-destructive">{dateError}</p>}
        </div>
      )}

      {period !== "Custom Date Range" && resolvedRange.from && (
        <p className="text-xs text-muted-foreground col-span-full">
          Date range:{" "}
          <span className="font-medium text-foreground">{formatDate(resolvedRange.from)}</span> →{" "}
          <span className="font-medium text-foreground">{formatDate(resolvedRange.to)}</span>
        </p>
      )}
    </>
  );
}

// ── Tab 1: Customer Invoice Report ────────────────────────────────────────────

function CustomerInvoiceReport() {
  const navigate = useNavigate();
  const allInvoices = useApp((s) => s.invoices);
  const customers = useApp((s) => s.customers);

  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [period, setPeriod] = useState("This Month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateError, setDateError] = useState("");

  const [reportInvoices, setReportInvoices] = useState<Invoice[] | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 20);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.gstin && c.gstin.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [customers, customerQuery]);

  const resolvedRange = useMemo(() => {
    if (period === "Custom Date Range") return { from: customFrom, to: customTo };
    return getDateRange(period);
  }, [period, customFrom, customTo]);

  function handleGenerateReport() {
    setDateError("");
    if (!selectedCustomer) {
      toast.error("Please select a customer first.");
      return;
    }
    let fromDate: string;
    let toDate: string;
    if (period === "Custom Date Range") {
      if (!customFrom || !customTo) {
        setDateError("Both From and To dates are required.");
        return;
      }
      if (customTo < customFrom) {
        setDateError("The end date must be the same as or later than the start date.");
        return;
      }
      fromDate = customFrom;
      toDate = customTo;
    } else {
      const range = getDateRange(period);
      fromDate = range.from;
      toDate = range.to;
    }
    setLoading(true);
    setTimeout(() => {
      const filtered = allInvoices.filter(
        (inv) =>
          !inv.isDraft &&
          inv.customer.name === selectedCustomer.name &&
          inv.date >= fromDate &&
          inv.date <= toDate,
      );
      filtered.sort((a, b) => b.date.localeCompare(a.date));
      setReportInvoices(filtered);
      setLoading(false);
      if (filtered.length === 0) toast.info("No invoices found.");
      else toast.success(`Found ${filtered.length} invoice${filtered.length > 1 ? "s" : ""}.`);
    }, 0);
  }

  function handleReset() {
    setCustomerQuery("");
    setSelectedCustomer(null);
    setShowDropdown(false);
    setPeriod("This Month");
    setCustomFrom("");
    setCustomTo("");
    setDateError("");
    setReportInvoices(null);
    setLoading(false);
  }

  function exportCSV() {
    if (!reportInvoices) return;
    const headers = [
      "Invoice #",
      "Date",
      "Customer",
      "Taxable",
      "CGST",
      "SGST",
      "IGST",
      "Grand Total",
      "Status",
    ];
    const rows = reportInvoices.map((inv) => {
      const t = computeTotals(inv);
      return [
        inv.number,
        inv.date,
        inv.customer.name,
        t.taxableAmount.toFixed(2),
        t.cgst.toFixed(2),
        t.sgst.toFixed(2),
        t.igst.toFixed(2),
        t.grandTotal.toFixed(2),
        inv.lifecycle,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-report-${selectedCustomer?.name ?? "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  }

  const activeInvs = reportInvoices?.filter((i) => i.lifecycle !== "CANCELLED") ?? [];
  const totalInvoices = activeInvs.length;
  const totalTaxable = activeInvs.reduce((s, i) => s + computeTotals(i).taxableAmount, 0);
  const totalGST = activeInvs.reduce((s, i) => s + computeTotals(i).gstTotal, 0);
  const totalValue = activeInvs.reduce((s, i) => s + computeTotals(i).grandTotal, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-base">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer search */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="h-3 w-3" /> Customer
            </label>
            <div className="relative">
              <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder="Search and select customer…"
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setShowDropdown(true);
                    if (selectedCustomer && e.target.value !== selectedCustomer.name)
                      setSelectedCustomer(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                {selectedCustomer && (
                  <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                )}
              </div>
              {showDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerQuery(c.name);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.phone}
                        {c.gstin && ` · ${c.gstin}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                ✓ {selectedCustomer.name}
                {selectedCustomer.gstin && (
                  <span className="text-muted-foreground font-normal">
                    · {selectedCustomer.gstin}
                  </span>
                )}
              </p>
            )}
          </div>

          <PeriodFilterRow
            period={period}
            setPeriod={setPeriod}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
            dateError={dateError}
            setDateError={setDateError}
            resolvedRange={resolvedRange}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleGenerateReport} className="gap-2" disabled={loading}>
            <BarChart2 className="h-4 w-4" /> Generate Report
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reset Filters
          </Button>
        </div>
      </div>

      {loading && <LoadingState />}

      {!loading && reportInvoices !== null && (
        <>
          {/* Customer summary */}
          <div className="bg-white border rounded-lg p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base">{selectedCustomer?.name}</div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                {selectedCustomer?.phone && <span>{selectedCustomer.phone}</span>}
                {selectedCustomer?.gstin && (
                  <span className="font-mono text-xs">{selectedCustomer.gstin}</span>
                )}
                {selectedCustomer?.address && (
                  <span className="truncate max-w-xs">{selectedCustomer.address}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Report period: <span className="font-medium text-foreground">{period}</span>
                {" · "}
                {formatDate(resolvedRange.from)} → {formatDate(resolvedRange.to)}
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Invoices" value={String(totalInvoices)} />
            <KpiCard label="Taxable Amount" value={formatINR(totalTaxable)} />
            <KpiCard label="Total GST" value={formatINR(totalGST)} />
            <KpiCard label="Grand Total" value={formatINR(totalValue)} />
          </div>

          <InvoiceTable
            invoices={reportInvoices}
            filename={`customer-report-${selectedCustomer?.name ?? "all"}`}
            onExportCSV={exportCSV}
            navigate={navigate}
          />
        </>
      )}

      {!loading && reportInvoices === null && (
        <EmptyPromptState message="Select a customer and period, then click Generate Report." />
      )}
    </div>
  );
}

// ── Tab 2: Overall Invoice Report ──────────────────────────────────────────────

function OverallInvoiceReport() {
  const navigate = useNavigate();
  const allInvoices = useApp((s) => s.invoices);

  const [period, setPeriod] = useState("This Month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateError, setDateError] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);

  const [reportInvoices, setReportInvoices] = useState<Invoice[] | null>(null);
  const [loading, setLoading] = useState(false);

  const resolvedRange = useMemo(() => {
    if (period === "Custom Date Range") return { from: customFrom, to: customTo };
    return getDateRange(period);
  }, [period, customFrom, customTo]);

  function handleGenerateReport() {
    setDateError("");
    let fromDate: string;
    let toDate: string;
    if (period === "Custom Date Range") {
      if (!customFrom || !customTo) {
        setDateError("Both From and To dates are required.");
        return;
      }
      if (customTo < customFrom) {
        setDateError("The end date must be the same as or later than the start date.");
        return;
      }
      fromDate = customFrom;
      toDate = customTo;
    } else {
      const range = getDateRange(period);
      fromDate = range.from;
      toDate = range.to;
    }
    setLoading(true);
    setTimeout(() => {
      const filtered = allInvoices.filter(
        (inv) =>
          !inv.isDraft &&
          inv.date >= fromDate &&
          inv.date <= toDate &&
          (includeCancelled ? true : inv.lifecycle !== "CANCELLED"),
      );
      filtered.sort((a, b) => b.date.localeCompare(a.date));
      setReportInvoices(filtered);
      setLoading(false);
      if (filtered.length === 0) toast.info("No invoices found.");
      else toast.success(`Found ${filtered.length} invoice${filtered.length > 1 ? "s" : ""}.`);
    }, 0);
  }

  function handleReset() {
    setPeriod("This Month");
    setCustomFrom("");
    setCustomTo("");
    setDateError("");
    setIncludeCancelled(false);
    setReportInvoices(null);
    setLoading(false);
  }

  function exportCSV() {
    if (!reportInvoices) return;
    const headers = [
      "Invoice #",
      "Date",
      "Customer",
      "Customer Phone",
      "Customer GSTIN",
      "Taxable",
      "CGST",
      "SGST",
      "IGST",
      "Grand Total",
      "Status",
    ];
    const rows = reportInvoices.map((inv) => {
      const t = computeTotals(inv);
      return [
        inv.number,
        inv.date,
        `"${inv.customer.name}"`,
        inv.customer.phone,
        inv.customer.gstin ?? "",
        t.taxableAmount.toFixed(2),
        t.cgst.toFixed(2),
        t.sgst.toFixed(2),
        t.igst.toFixed(2),
        t.grandTotal.toFixed(2),
        inv.lifecycle,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overall-invoice-report-${resolvedRange.from}-to-${resolvedRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  }

  const activeInvs = reportInvoices?.filter((i) => i.lifecycle !== "CANCELLED") ?? [];
  const totalInvoices = activeInvs.length;
  const totalTaxable = activeInvs.reduce((s, i) => s + computeTotals(i).taxableAmount, 0);
  const totalCGST = activeInvs.reduce((s, i) => s + computeTotals(i).cgst, 0);
  const totalSGST = activeInvs.reduce((s, i) => s + computeTotals(i).sgst, 0);
  const totalIGST = activeInvs.reduce((s, i) => s + computeTotals(i).igst, 0);
  const totalGST = activeInvs.reduce((s, i) => s + computeTotals(i).gstTotal, 0);
  const totalValue = activeInvs.reduce((s, i) => s + computeTotals(i).grandTotal, 0);

  // Unique customers in report
  const uniqueCustomers = useMemo(() => {
    const names = new Set(activeInvs.map((i) => i.customer.name));
    return names.size;
  }, [activeInvs]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-base">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PeriodFilterRow
            period={period}
            setPeriod={setPeriod}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
            dateError={dateError}
            setDateError={setDateError}
            resolvedRange={resolvedRange}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeCancelled}
            onChange={(e) => setIncludeCancelled(e.target.checked)}
            className="rounded"
          />
          Include cancelled invoices
        </label>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleGenerateReport} className="gap-2" disabled={loading}>
            <BarChart2 className="h-4 w-4" /> Generate Report
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reset Filters
          </Button>
        </div>
      </div>

      {loading && <LoadingState />}

      {!loading && reportInvoices !== null && (
        <>
          {/* Summary header */}
          <div className="bg-white border rounded-lg p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-base">Overall Invoice Report</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                All customers · {uniqueCustomers} customer{uniqueCustomers !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Report period: <span className="font-medium text-foreground">{period}</span>
                {" · "}
                {formatDate(resolvedRange.from)} → {formatDate(resolvedRange.to)}
              </div>
            </div>
          </div>

          {/* KPI cards — 3 columns on small, 6 on large */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              label="Total Invoices"
              value={String(totalInvoices)}
              sub={`${uniqueCustomers} customers`}
            />
            <KpiCard label="Taxable Amount" value={formatINR(totalTaxable)} />
            <KpiCard label="CGST" value={formatINR(totalCGST)} />
            <KpiCard label="SGST" value={formatINR(totalSGST)} />
            <KpiCard label="IGST" value={formatINR(totalIGST)} />
            <KpiCard
              label="Grand Total"
              value={formatINR(totalValue)}
              sub={`GST: ${formatINR(totalGST)}`}
            />
          </div>

          <InvoiceTable
            invoices={reportInvoices}
            filename={`overall-report-${resolvedRange.from}-to-${resolvedRange.to}`}
            onExportCSV={exportCSV}
            navigate={navigate}
            showCustomer
          />
        </>
      )}

      {!loading && reportInvoices === null && (
        <EmptyPromptState message="Select a date period and click Generate Report to see all invoices." />
      )}
    </div>
  );
}

// ── Shared Invoice Table ───────────────────────────────────────────────────────

export function InvoiceTable({
  invoices,
  filename,
  onExportCSV,
  navigate,
  showCustomer = false,
}: {
  invoices: Invoice[];
  filename: string;
  onExportCSV: () => void;
  navigate: ReturnType<typeof useNavigate>;
  showCustomer?: boolean;
}) {
  void filename;
  const activeCount = invoices.filter((i) => i.lifecycle !== "CANCELLED").length;
  const cancelledCount = invoices.length - activeCount;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-sm">Invoices</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {invoices.length} total
            {cancelledCount > 0 && ` · ${cancelledCount} cancelled`}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onExportCSV}
          disabled={invoices.length === 0}
        >
          <FileDown className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No invoices found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Sl. No.</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Invoice #</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                {showCustomer && (
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Customer</th>
                )}
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Taxable</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">CGST</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">SGST</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">IGST</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Grand Total</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => {
                const t = computeTotals(inv);
                return (
                  <tr
                    key={inv.id}
                    className={[
                      "border-b last:border-0 hover:bg-muted/30 transition-colors",
                      inv.lifecycle === "CANCELLED" ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium font-mono text-xs">{inv.number}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(inv.date)}</td>
                    {showCustomer && (
                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="font-medium truncate">{inv.customer.name}</div>
                        {inv.customer.gstin && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {inv.customer.gstin}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatINR(t.taxableAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(t.cgst)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(t.sgst)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(t.igst)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatINR(t.grandTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge inv={inv} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Print invoice"
                          onClick={() => printInvoicePdf(inv)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit invoice"
                          onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id } })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
  );
}

// ── Root Page ──────────────────────────────────────────────────────────────────

type Tab = "customer" | "overall" | "lot";

function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("customer");

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer Invoice Report and Overall Invoice Report.
          </p>
        </div>

        {/* Tab bar */}
        <div className="border-b flex gap-0 overflow-x-auto">
          {(
            [
              { id: "customer" as Tab, label: "Customer Invoice Report", icon: User },
              { id: "overall" as Tab, label: "Overall Invoice Report", icon: Globe },
              { id: "lot" as Tab, label: "Lot Number Reports", icon: Layers },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                "flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "customer" ? (
          <CustomerInvoiceReport />
        ) : activeTab === "overall" ? (
          <OverallInvoiceReport />
        ) : (
          <LotNumberReport />
        )}
      </div>
    </AppShell>
  );
}
