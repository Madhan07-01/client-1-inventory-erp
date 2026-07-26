import { formatINR } from "@/lib/calc";

interface BarListItem {
  id: string;
  label: string;
  value: number;
  secondaryValue?: string | number; // e.g. "12 invoices"
}

interface HorizontalBarListProps {
  title: string;
  data: BarListItem[];
  valueFormatter?: "currency" | "number" | "percentage";
  className?: string;
}

export function HorizontalBarList({
  title,
  data,
  valueFormatter = "number",
  className,
}: HorizontalBarListProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1); // Avoid division by zero

  const formatValue = (val: number) => {
    if (valueFormatter === "currency") return formatINR(val);
    if (valueFormatter === "percentage") return `${val.toFixed(1)}%`;
    return val.toLocaleString();
  };

  return (
    <div className={`bg-white border rounded-xl p-6 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const widthPct = (item.value / maxVal) * 100;
          return (
            <div key={item.id || index} className="group relative">
              <div className="flex justify-between items-end mb-1 z-10 relative">
                <span className="text-sm font-medium truncate pr-4 text-gray-700">
                  {item.label}
                </span>
                <div className="text-right flex flex-col">
                  <span className="text-sm font-semibold">{formatValue(item.value)}</span>
                  {item.secondaryValue && (
                    <span className="text-xs text-muted-foreground">{item.secondaryValue}</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500 group-hover:bg-blue-600"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">No data available</div>
        )}
      </div>
    </div>
  );
}
