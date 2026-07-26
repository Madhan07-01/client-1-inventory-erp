import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/calc";

interface DualBarData {
  name: string;
  revenue: number;
  gst: number;
}

interface DualBarChartProps {
  data: DualBarData[];
  title?: string;
  className?: string;
}

export function DualBarChart({ data, title, className }: DualBarChartProps) {
  return (
    <div className={`bg-white border rounded-xl p-6 shadow-sm ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              dx={-10}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              dx={10}
            />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              formatter={(value: number, name: string) => [formatINR(value), name === "revenue" ? "Revenue" : "GST"]}
              labelStyle={{ color: "#374151", fontWeight: "bold", marginBottom: "4px" }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
            <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar yAxisId="right" dataKey="gst" fill="#f59e0b" radius={[4, 4, 0, 0]} name="GST" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
