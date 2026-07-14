import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Bell, AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { deriveNotifications, type AppNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function iconFor(kind: AppNotification["kind"]) {
  if (kind === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  if (kind === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  return <Info className="h-4 w-4 text-blue-600" />;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function NotificationsBell() {
  const invoices = useApp((s) => s.invoices);
  const readIds = useApp((s) => s.readNotificationIds);
  const dismissedIds = useApp((s) => s.dismissedNotificationIds);
  const markRead = useApp((s) => s.markNotificationsRead);
  const dismiss = useApp((s) => s.dismissNotification);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const notifications = useMemo(() => {
    const dismissed = new Set(dismissedIds);
    return deriveNotifications(invoices).filter((n) => !dismissed.has(n.id));
  }, [invoices, dismissedIds]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const unreadCount = notifications.filter((n) => !readSet.has(n.id)).length;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) {
      // mark all as read after a short delay so user sees the unread highlight first
      const ids = notifications.filter((n) => !readSet.has(n.id)).map((n) => n.id);
      setTimeout(() => markRead(ids), 800);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">
              {notifications.length === 0
                ? "You're all caught up"
                : `${unreadCount} unread · ${notifications.length} total`}
            </div>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => markRead(notifications.map((n) => n.id))}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications right now.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const isUnread = !readSet.has(n.id);
                const content = (
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5 shrink-0">{iconFor(n.kind)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {isUnread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {relativeTime(n.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismiss(n.id);
                      }}
                      aria-label="Dismiss"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          markRead([n.id]);
                          setOpen(false);
                          router.navigate({ to: n.link! as string } as Parameters<
                            typeof router.navigate
                          >[0]);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            markRead([n.id]);
                            setOpen(false);
                            router.navigate({ to: n.link! as string } as Parameters<
                              typeof router.navigate
                            >[0]);
                          }
                        }}
                        className="block w-full text-left cursor-pointer"
                      >
                        {content}
                      </div>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
