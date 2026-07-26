import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { formatINR } from "@/lib/calc";
import {
  FileText,
  IndianRupee,
  Receipt,
  FileClock,
  TrendingUp,
  Package,
  Users,
  Box,
  Plus,
  ScanBarcode,
  Settings,
  PieChart
} from "lucide-react";
import { KpiCard } from "@/components/analytics/KpiCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { DualBarChart } from "@/components/analytics/DualBarChart";
import { HorizontalBarList } from "@/components/analytics/HorizontalBarList";
import { ActivityTimeline } from "@/components/analytics/ActivityTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard · FastenerERP Analytics" },
      { name: "description", content: "Executive Analytics Dashboard" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {
    filter,
    setFilter,
    kpis,
    revenueTrend,
    topCustomers,
    topProducts,
    recentActivity
  } = useDashboardAnalytics();

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* Header & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Command Centre</h1>
            <p className="text-sm text-muted-foreground mt-1">Executive overview of your business.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(val: DateRangeFilter) => setFilter(val)}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAY">Today</SelectItem>
                <SelectItem value="YESTERDAY">Yesterday</SelectItem>
                <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                <SelectItem value="THIS_MONTH">This Month</SelectItem>
                <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                <SelectItem value="THIS_QUARTER">This Quarter</SelectItem>
                <SelectItem value="THIS_YEAR">This Year</SelectItem>
                <SelectItem value="ALL">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* SECTION 1: Executive KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Revenue"
            value={formatINR(kpis.revenue)}
            icon={IndianRupee}
            tint="#3b82f6"
            growth={kpis.revenueGrowth}
            comparisonText="vs prev period"
          />
          <KpiCard
            label="Invoices Generated"
            value={kpis.count}
            icon={FileText}
            tint="#10b981"
            growth={kpis.invoiceGrowth}
            comparisonText="vs prev period"
          />
          <KpiCard
            label="GST Collected"
            value={formatINR(kpis.gst)}
            icon={Receipt}
            tint="#f59e0b"
          />
          <KpiCard
            label="Active Customers"
            value={kpis.activeCustomers}
            icon={Users}
            tint="#8b5cf6"
          />
          <KpiCard
            label="Avg. Invoice Value"
            value={formatINR(kpis.avgInvoiceValue)}
            icon={TrendingUp}
            tint="#0ea5e9"
          />
          <KpiCard
            label="Quotation Value"
            value={formatINR(kpis.quotationValue)}
            icon={FileClock}
            tint="#f43f5e"
          />
          <KpiCard
            label="Net Inventory Value"
            value={formatINR(kpis.netInventoryValue)}
            icon={Box}
            tint="#6366f1"
          />
          <KpiCard
            label="Low Stock Items"
            value={kpis.lowStockProducts}
            icon={Package}
            tint="#ef4444"
          />
        </div>

        {/* SECTION 2 & 3: Revenue & GST Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrendChart 
              title="Revenue & Invoice Trend" 
              data={revenueTrend} 
            />
          </div>
          <div className="lg:col-span-1">
            <DualBarChart 
              title="Sales vs GST" 
              data={revenueTrend.map(d => ({ name: d.dateLabel, revenue: d.revenue, gst: d.gst }))} 
            />
          </div>
        </div>

        {/* SECTION 5 & 6: Customer & Product Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HorizontalBarList 
            title="Top Customers by Revenue" 
            data={topCustomers}
            valueFormatter="currency"
          />
          <HorizontalBarList 
            title="Top Selling Products" 
            data={topProducts}
            valueFormatter="currency"
          />
        </div>

        {/* SECTION 9 & 10: Activity & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityTimeline events={recentActivity} />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/invoices/new" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                  <Plus className="w-6 h-6 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-700">New Invoice</span>
                </Link>
                <Link to="/inventory" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                  <Box className="w-6 h-6 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Add Stock</span>
                </Link>
                <Link to="/reports" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                  <PieChart className="w-6 h-6 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Reports</span>
                </Link>
                <Link to="/settings" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                  <Settings className="w-6 h-6 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
