import { format } from "date-fns";
import { Link } from "@tanstack/react-router";
import { LucideIcon, FileText, CheckCircle2, Box, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  type: "INVOICE" | "QUOTATION" | "INVENTORY" | "OTHER";
  icon?: LucideIcon;
  link?: string;
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
  className?: string;
}

export function ActivityTimeline({ events, className }: ActivityTimelineProps) {
  const sorted = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);

  const getIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "INVOICE":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "QUOTATION":
        return <CheckCircle2 className="w-4 h-4 text-orange-600" />;
      case "INVENTORY":
        return <Box className="w-4 h-4 text-purple-600" />;
      default:
        return <PackagePlus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getBg = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "INVOICE":
        return "bg-blue-100";
      case "QUOTATION":
        return "bg-orange-100";
      case "INVENTORY":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className={`bg-white border rounded-xl p-6 shadow-sm flex flex-col ${className}`}>
      <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
        {sorted.map((event, i) => {
          const isLast = i === sorted.length - 1;
          const IconComp = event.icon;
          return (
            <div key={event.id} className="relative flex gap-4">
              {!isLast && (
                <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-gray-200" />
              )}
              <div
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white",
                  getBg(event.type)
                )}
              >
                {IconComp ? <IconComp className="w-4 h-4 text-gray-600" /> : getIcon(event.type)}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {format(event.timestamp, "MMM d, HH:mm")}
                  </span>
                </div>
                {event.link ? (
                  <Link to={event.link as any} className="text-sm text-muted-foreground hover:text-blue-600 hover:underline">
                    {event.description}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
        )}
      </div>
    </div>
  );
}
