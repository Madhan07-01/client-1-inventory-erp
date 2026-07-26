import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/calc";

interface TrendData {
  dateLabel: string; // e.g. "Mon", "Jan", "2024-05-12"
  revenue: number;
  invoices: number;
}

interface TrendChartProps {
  data: TrendData[];
  title?: string;
  className?: string;
}

export function TrendChart({ data, title, className }: TrendChartProps) {
  return (
    <div className={`bg-white border rounded-xl p-6 shadow-sm ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="dateLabel" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "#6b7280" }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              dx={-10}
            />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              formatter={(value: number, name: string) => {
                if (name === "revenue") return [formatINR(value), "Revenue"];
                if (name === "invoices") return [value, "Invoices"];
                return [value, name];
              }}
              labelStyle={{ color: "#374151", fontWeight: "bold", marginBottom: "4px" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
