import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tint?: string; // Optional CSS color var or hex for the icon background
  growth?: number; // Growth percentage
  comparisonText?: string; // e.g. "Compared to last month"
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tint = "var(--primary)",
  growth,
  comparisonText,
  className,
}: KpiCardProps) {
  const isPositive = growth !== undefined && growth > 0;
  const isNegative = growth !== undefined && growth < 0;
  const isNeutral = growth === 0;

  return (
    <div
      className={cn(
        "bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between",
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        </div>
        <div
          className="p-3 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${tint}15`, color: tint }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {growth !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
              isPositive && "bg-green-100 text-green-700",
              isNegative && "bg-red-100 text-red-700",
              isNeutral && "bg-gray-100 text-gray-700"
            )}
          >
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {isNeutral && <Minus className="w-3 h-3" />}
            <span>{Math.abs(growth).toFixed(1)}%</span>
          </div>
          {comparisonText && (
            <span className="text-xs text-muted-foreground">{comparisonText}</span>
          )}
        </div>
      )}
    </div>
  );
}
