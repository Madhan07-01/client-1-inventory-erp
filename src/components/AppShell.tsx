import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileClock,
  Settings as SettingsIcon,
  Menu,
  LogOut,
  Package2,
  ShieldCheck,
  BarChart2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logoAsset from "@/assets/madeena-logo.png.asset.json";
import { NotificationsBell } from "@/components/NotificationsBell";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/inventory", label: "Inventory", icon: Package2 },
  { to: "/quotations", label: "Quotations", icon: FileClock },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/admin-scanner", label: "Admin Scanner", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const settings = useApp((s) => s.settings);
  const company = settings.company;
  const location = useLocation();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const navList = (
    <nav className="flex-1 p-3 space-y-1 text-sm">
      {navItems.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={[
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              active
                ? "bg-[var(--surface-header)] text-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex flex-col border-r bg-white w-60">
        <div className="px-4 py-4 border-b flex items-center gap-3">
          <img
            src={company.logoDataUrl || logoAsset.url}
            alt="logo"
            className="h-12 w-12 object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight truncate">{company.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {company.companyTagline}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
              Billing Suite
            </div>
          </div>
        </div>
        {navList}
        <div className="p-4 border-t text-xs text-muted-foreground">v1.0 · Offline mode</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-white px-4 md:px-6 flex items-center justify-between gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <div className="px-4 py-4 border-b flex items-center gap-3">
                <img
                  src={company.logoDataUrl || logoAsset.url}
                  alt="logo"
                  className="h-11 w-11 object-contain"
                />
                <div>
                  <div className="text-sm font-bold">{company.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {company.companyTagline}
                  </div>
                </div>
              </div>
              {navList}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{company.name}</div>
            <div className="text-xs text-muted-foreground truncate">{company.companyTagline}</div>
            <div className="text-xs text-muted-foreground">{today}</div>
          </div>
          <NotificationsBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
