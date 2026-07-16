import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { computeTotals, formatINR, formatDate } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart2, Search, RefreshCw, Layers, Package, FileDown, Clock, Box, ShieldCheck, Tag, TrendingUp, Users, Activity } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  KpiCard,
  InvoiceTable,
  PeriodFilterRow,
  LoadingState,
  EmptyPromptState,
  getDateRange,
} from "@/routes/_authenticated/reports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import type { Invoice, ProductMasterEntry, InventoryTransaction, InventoryStock } from "@/lib/types";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function LotNumberReport() {
  const navigate = useNavigate();
  const allInvoices = useApp((s) => s.invoices);
  const allProducts = useApp((s) => s.settings.productMaster);
  const inventoryStock = useApp((s) => s.inventoryStock);
  const inventoryTransactions = useApp((s) => s.inventoryTransactions);

  const [lotQuery, setLotQuery] = useState("");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [period, setPeriod] = useState("This Financial Year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(false);

  const [reportData, setReportData] = useState<{
    products: ProductMasterEntry[];
    stock: InventoryStock[];
    transactions: InventoryTransaction[];
    invoices: Invoice[];
  } | null>(null);

  const availableLots = useMemo(() => {
    const lots = new Set<string>();
    allProducts.forEach(p => { if (p.lotNo) lots.add(p.lotNo.trim()); });
    return Array.from(lots).sort();
  }, [allProducts]);

  const filteredLots = useMemo(() => {
    const q = lotQuery.toLowerCase().trim();
    if (!q) return availableLots.slice(0, 10);
    return availableLots.filter(l => l.toLowerCase().includes(q)).slice(0, 10);
  }, [availableLots, lotQuery]);

  const resolvedRange = useMemo(() => {
    if (period === "Custom Date Range") return { from: customFrom, to: customTo };
    return getDateRange(period);
  }, [period, customFrom, customTo]);

  function handleGenerateReport() {
    setDateError("");
    if (!selectedLot) {
      toast.error("Please select a Lot Number first.");
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
      const products = allProducts.filter(p => p.lotNo === selectedLot);
      const productIds = new Set(products.map(p => p.id));
      const productDescriptions = new Set(products.map(p => p.description.trim().toLowerCase()));

      const stock = inventoryStock.filter(s => productIds.has(s.productId));
      const transactions = inventoryTransactions.filter(t => 
        productIds.has(t.productId) && 
        (t.createdAt ? t.createdAt.slice(0, 10) >= fromDate && t.createdAt.slice(0, 10) <= toDate : true)
      );

      const invoices = allInvoices.filter(inv => 
        !inv.isDraft &&
        inv.date >= fromDate &&
        inv.date <= toDate &&
        inv.items.some(item => productDescriptions.has(item.description.trim().toLowerCase()))
      );

      invoices.sort((a, b) => b.date.localeCompare(a.date));
      transactions.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

      setReportData({
        products,
        stock,
        transactions,
        invoices
      });
      setLoading(false);
      toast.success(`Generated report for Lot ${selectedLot}`);
    }, 100);
  }

  function handleReset() {
    setLotQuery("");
    setSelectedLot(null);
    setPeriod("This Financial Year");
    setCustomFrom("");
    setCustomTo("");
    setDateError("");
    setReportData(null);
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filters */}
      <div className="bg-white border rounded-lg p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Lot Number Report Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Package className="h-3 w-3" /> Lot Number
            </label>
            <div className="relative">
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/20">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder="Search and select lot..."
                  value={lotQuery}
                  onChange={(e) => {
                    setLotQuery(e.target.value);
                    setShowDropdown(true);
                    if (selectedLot && e.target.value !== selectedLot) setSelectedLot(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {selectedLot && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}
              </div>
              {showDropdown && filteredLots.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredLots.map((lot) => (
                    <button
                      key={lot}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedLot(lot);
                        setLotQuery(lot);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="font-medium">{lot}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedLot && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                ✓ Lot Selected: {selectedLot}
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

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleGenerateReport} className="gap-2" disabled={loading}>
            <BarChart2 className="h-4 w-4" /> Generate Report
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      {!reportData && !loading && (
         <EmptyPromptState message="Select a lot and period, then click Generate Report." />
      )}

      {reportData && (
        <LotReportBody 
          lotNo={selectedLot!}
          period={period}
          resolvedRange={resolvedRange}
          data={reportData}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Sub-components for LotReportBody
// -------------------------------------------------------------------------

function LotReportBody({
  lotNo,
  period,
  resolvedRange,
  data,
  navigate
}: {
  lotNo: string;
  period: string;
  resolvedRange: { from: string; to: string };
  data: {
    products: ProductMasterEntry[];
    stock: InventoryStock[];
    transactions: InventoryTransaction[];
    invoices: Invoice[];
  };
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { products, stock, transactions, invoices } = data;

  const productDescriptions = new Set(products.map(p => p.description.trim().toLowerCase()));

  // 1. Calculate Quantities
  const totalPurchased = transactions.filter(t => t.transactionType === "IN").reduce((sum, t) => sum + t.quantityChange, 0);
  const totalAdjusted = transactions.filter(t => t.transactionType === "ADJUST").reduce((sum, t) => sum + t.quantityChange, 0);
  const currentAvailable = stock.reduce((sum, s) => sum + s.quantity, 0);
  
  // Sales quantity: sum of items in active invoices that belong to this lot
  const activeInvoices = invoices.filter(i => i.lifecycle !== "CANCELLED");
  const totalSold = activeInvoices.reduce((sum, inv) => {
    const lotItems = inv.items.filter(item => productDescriptions.has(item.description.trim().toLowerCase()));
    return sum + lotItems.reduce((s, it) => s + (it.quantity || 0), 0);
  }, 0);

  // Supplier
  const supplier = products.find(p => p.goodsFrom)?.goodsFrom || "Unknown / Multiple";

  // Financials
  const salesRevenue = activeInvoices.reduce((sum, inv) => {
    const lotItems = inv.items.filter(item => productDescriptions.has(item.description.trim().toLowerCase()));
    const itemTotal = lotItems.reduce((s, it) => s + ((it.quantity || 0) * (it.price || 0)), 0);
    return sum + itemTotal;
  }, 0);

  const avgSellingPrice = totalSold > 0 ? salesRevenue / totalSold : 0;
  
  // Approximate Purchase Value using defaultRate (since real purchase rate is not in schema)
  // Or fallback to Average Selling Rate / 1.5 as rough estimation if needed, but best to use a metric we have.
  // We'll compute "Est. Stock Value" using average selling price for now.
  const estStockValue = currentAvailable * avgSellingPrice;

  // 2. Customer Analysis
  const customerMap = new Map<string, { qty: number, revenue: number, count: number, lastDate: string }>();
  activeInvoices.forEach(inv => {
    const lotItems = inv.items.filter(item => productDescriptions.has(item.description.trim().toLowerCase()));
    const qty = lotItems.reduce((s, it) => s + (it.quantity || 0), 0);
    const rev = lotItems.reduce((s, it) => s + ((it.quantity || 0) * (it.price || 0)), 0);
    
    if (qty > 0 || rev > 0) {
      const c = customerMap.get(inv.customer.name) || { qty: 0, revenue: 0, count: 0, lastDate: "" };
      c.qty += qty;
      c.revenue += rev;
      c.count += 1;
      if (inv.date > c.lastDate) c.lastDate = inv.date;
      customerMap.set(inv.customer.name, c);
    }
  });

  const customerAnalysis = Array.from(customerMap.entries()).map(([name, data]) => ({
    name,
    ...data
  })).sort((a, b) => b.revenue - a.revenue);

  // 3. Sales by Month (Chart)
  const monthlyData = new Map<string, number>();
  activeInvoices.forEach(inv => {
    const month = inv.date.substring(0, 7); // YYYY-MM
    const lotItems = inv.items.filter(item => productDescriptions.has(item.description.trim().toLowerCase()));
    const qty = lotItems.reduce((s, it) => s + (it.quantity || 0), 0);
    monthlyData.set(month, (monthlyData.get(month) || 0) + qty);
  });
  const chartData = Array.from(monthlyData.entries()).map(([month, qty]) => ({ month, qty })).sort((a, b) => a.month.localeCompare(b.month));

  // 4. Product Distribution (Chart)
  const productSalesMap = new Map<string, number>();
  activeInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const desc = item.description.trim();
      if (productDescriptions.has(desc.toLowerCase())) {
        productSalesMap.set(desc, (productSalesMap.get(desc) || 0) + (item.quantity || 0));
      }
    });
  });
  const pieData = Array.from(productSalesMap.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-white border rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-l-4 border-l-primary">
        <div>
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
            <Package className="w-4 h-4" /> Lot Analysis
          </div>
          <h2 className="text-2xl font-bold">{lotNo}</h2>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Supplier: <span className="font-medium text-foreground">{supplier}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">
            Report period: <span className="font-medium text-foreground">{period}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatDate(resolvedRange.from)} → {formatDate(resolvedRange.to)}
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Received (IN)" value={String(totalPurchased)} sub="Units procured" />
        <KpiCard label="Total Sold (OUT)" value={String(totalSold)} sub="Units sold" />
        <KpiCard label="Current Available" value={String(currentAvailable)} sub="Units in stock" />
        <KpiCard label="Gross Revenue" value={formatINR(salesRevenue)} sub="From lot sales" />
        <KpiCard label="Avg Selling Rate" value={formatINR(avgSellingPrice)} sub="Per unit" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <div className="bg-white border rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Sales Trend (Qty)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="month" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <RechartsTooltip />
                <Bar dataKey="qty" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Quantity Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4" /> Product Mix Sold</h3>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No sales data to display
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Analysis */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b bg-muted/20 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Customer Analysis for Lot</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium text-right">Invoices</th>
                <th className="px-4 py-3 font-medium text-right">Qty Purchased</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Avg Rate</th>
                <th className="px-4 py-3 font-medium">Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {customerAnalysis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No customers found for this lot in the selected period.
                  </td>
                </tr>
              ) : (
                customerAnalysis.map((c, i) => (
                  <tr key={i} className="border-t hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-right">{c.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{c.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(c.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(c.qty > 0 ? c.revenue / c.qty : 0)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.lastDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Breakdown */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b bg-muted/20 flex items-center gap-2">
          <Box className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Inventory Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">SKU / Code</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Finish</th>
                <th className="px-4 py-3 font-medium text-right">Current Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No products found for this lot.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const s = stock.filter(st => st.productId === p.id).reduce((sum, st) => sum + st.quantity, 0);
                  return (
                    <tr key={p.id} className="border-t hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{p.sku || "—"}</td>
                      <td className="px-4 py-3 font-medium">{p.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.size || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.grade || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.finish || "—"}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${s > 0 ? "text-green-600" : "text-red-500"}`}>
                        {s}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales History (Invoices) */}
      <div className="pt-4">
        <h3 className="font-semibold mb-3">Sales History</h3>
        <InvoiceTable 
          invoices={invoices}
          filename={`lot-${lotNo}-invoices`}
          onExportCSV={() => {
            toast.info("CSV Export initiated...");
            // basic CSV logic reusing reports.tsx pattern could go here
          }}
          navigate={navigate}
          showCustomer
        />
      </div>

    </div>
  );
}
