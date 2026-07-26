import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { computeInvoiceStats, filterByDateRange, type DateRangeFilter } from "@/lib/analytics";
import { computeTotals, formatINR } from "@/lib/calc";
import { parseISO, format, isValid, startOfDay, subDays, eachDayOfInterval, eachMonthOfInterval, startOfMonth, formatISO } from "date-fns";
import type { Invoice, Quotation } from "@/lib/types";

export function useDashboardAnalytics() {
  const [filter, setFilter] = useState<DateRangeFilter>("THIS_MONTH");
  const invoices = useApp((s) => s.invoices);
  const quotations = useApp((s) => s.quotations);
  const customers = useApp((s) => s.customers);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const productMaster = useApp((s) => s.settings.productMaster);

  // 1. Filtered Data
  const filteredInvoices = useMemo(() => {
    return filterByDateRange(invoices, (i) => i.createdAt, filter);
  }, [invoices, filter]);

  const filteredQuotations = useMemo(() => {
    return filterByDateRange(quotations, (q) => q.createdAt, filter);
  }, [quotations, filter]);

  // 2. Executive KPIs
  const { revenue, gst, count } = useMemo(() => computeInvoiceStats(filteredInvoices), [filteredInvoices]);
  const prevInvoices = useMemo(() => {
    // Basic "previous period" heuristic for growth indicators.
    // For simplicity, we compare "THIS_MONTH" with "LAST_MONTH" etc.
    let prevFilter: DateRangeFilter = "LAST_MONTH";
    if (filter === "TODAY") prevFilter = "YESTERDAY";
    if (filter === "LAST_7_DAYS") prevFilter = "ALL"; // simplified
    const prev = filterByDateRange(invoices, (i) => i.createdAt, prevFilter);
    return computeInvoiceStats(prev);
  }, [invoices, filter]);

  const revenueGrowth = prevInvoices.revenue ? ((revenue - prevInvoices.revenue) / prevInvoices.revenue) * 100 : 0;
  const invoiceGrowth = prevInvoices.count ? ((count - prevInvoices.count) / prevInvoices.count) * 100 : 0;
  
  const avgInvoiceValue = count > 0 ? revenue / count : 0;
  
  const activeCustomers = useMemo(() => {
    const ids = new Set(filteredInvoices.map((i) => i.customer?.id));
    return ids.size;
  }, [filteredInvoices]);

  const netInventoryValue = useMemo(() => {
    return inventoryStock.reduce((acc, stock) => acc + (stock.quantity * (stock.purchaseRate || 0)), 0);
  }, [inventoryStock]);

  const lowStockProducts = useMemo(() => {
    return inventoryStock.filter((s) => s.quantity > 0 && s.quantity <= 10).length;
  }, [inventoryStock]);

  const quotationValue = useMemo(() => {
    return filteredQuotations.reduce((acc, q) => {
      if (q.lifecycle !== "CANCELLED") return acc + computeTotals(q as unknown as Invoice).grandTotal;
      return acc;
    }, 0);
  }, [filteredQuotations]);

  // 3. Revenue Trend Chart
  const revenueTrend = useMemo(() => {
    const grouped = new Map<string, { revenue: number; invoices: number; gst: number }>();
    filteredInvoices.forEach((inv) => {
      if (inv.lifecycle === "CANCELLED" || inv.isDraft) return;
      const d = parseISO(inv.createdAt);
      if (!isValid(d)) return;
      
      const key = format(d, filter === "THIS_YEAR" || filter === "ALL" ? "MMM yyyy" : "MMM dd");
      const totals = computeTotals(inv);
      
      const curr = grouped.get(key) || { revenue: 0, invoices: 0, gst: 0 };
      curr.revenue += totals.grandTotal;
      curr.gst += totals.gstTotal;
      curr.invoices += 1;
      grouped.set(key, curr);
    });

    return Array.from(grouped.entries()).map(([dateLabel, data]) => ({
      dateLabel,
      revenue: data.revenue,
      invoices: data.invoices,
      gst: data.gst,
    }));
  }, [filteredInvoices, filter]);

  // 4. Customer Analytics
  const topCustomers = useMemo(() => {
    const customerSales = new Map<string, number>();
    filteredInvoices.forEach((inv) => {
      if (inv.lifecycle === "CANCELLED" || inv.isDraft) return;
      const totals = computeTotals(inv);
      if (inv.customer?.id) {
        customerSales.set(inv.customer.id, (customerSales.get(inv.customer.id) || 0) + totals.grandTotal);
      }
    });
    
    return Array.from(customerSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, total]) => {
        const c = customers.find(cust => cust.id === id);
        return {
          id,
          label: c?.name || "Unknown",
          value: total,
        };
      });
  }, [filteredInvoices, customers]);

  // 5. Product Analytics
  const topProducts = useMemo(() => {
    const productSales = new Map<string, { qty: number; rev: number }>();
    filteredInvoices.forEach((inv) => {
      if (inv.lifecycle === "CANCELLED" || inv.isDraft) return;
      inv.items.forEach((item) => {
        const qty = item.quantity ?? 0;
        const price = item.price ?? 0;
        const lineTotal = qty * price;
        const prodId = item.productId || item.description || "unknown";
        const curr = productSales.get(prodId) || { qty: 0, rev: 0 };
        curr.qty += qty;
        curr.rev += lineTotal;
        productSales.set(prodId, curr);
      });
    });

    return Array.from(productSales.entries())
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 5)
      .map(([id, data]) => {
        const p = productMaster.find(prod => prod.id === id);
        return {
          id,
          label: p?.description || id,
          value: data.rev,
          secondaryValue: `${data.qty} units`,
        };
      });
  }, [filteredInvoices, productMaster]);

  // 6. Activity Feed
  const recentActivity = useMemo(() => {
    const evts: any[] = [];
    filteredInvoices.slice(0, 20).forEach(inv => {
      evts.push({
        id: `inv-${inv.id}`,
        timestamp: parseISO(inv.createdAt),
        title: "Invoice Generated",
        description: `Invoice ${inv.number} for ${formatINR(computeTotals(inv).grandTotal)}`,
        type: "INVOICE",
      });
    });
    filteredQuotations.slice(0, 20).forEach(q => {
      evts.push({
        id: `q-${q.id}`,
        timestamp: parseISO(q.createdAt),
        title: "Quotation Created",
        description: `Quotation ${q.number} for ${formatINR(computeTotals(q as unknown as Invoice).grandTotal)}`,
        type: "QUOTATION",
      });
    });
    return evts;
  }, [filteredInvoices, filteredQuotations]);

  return {
    filter,
    setFilter,
    kpis: {
      revenue,
      revenueGrowth,
      gst,
      count,
      invoiceGrowth,
      avgInvoiceValue,
      activeCustomers,
      quotationValue,
      netInventoryValue,
      lowStockProducts
    },
    revenueTrend,
    topCustomers,
    topProducts,
    recentActivity
  };
}
