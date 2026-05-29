import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Calculator, Settings, LogOut, Database, LifeBuoy, BarChart3, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/manage", label: "Manage Data", icon: Database },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { to: "/dashboard/blacklist", label: "Blacklist", icon: ShieldAlert },
  { to: "/profit", label: "Profit Calculator", icon: Calculator },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const [storeName, setStoreName] = useState<string>("My Store");
  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Super admins should never see the user portal — redirect to admin console
  useEffect(() => {
    if (!loading && !adminLoading && user && isAdmin) {
      navigate({ to: "/private" });
    }
  }, [loading, adminLoading, user, isAdmin, navigate]);


  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("store_name, blocked")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.store_name) setStoreName(data.store_name);
        if (data?.blocked) {
          toast.error("Your account has been blocked. Contact support.");
          supabase.auth.signOut().then(() => navigate({ to: "/login" }));
        }
      });
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "open")
      .then(({ count }) => setSupportCount(count ?? 0));
  }, [user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const initials =
    user.email
      ?.split("@")[0]
      .split(/[._-]/)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") ?? "U";

  return (
    <div className="min-h-screen bg-secondary/20 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden md:flex w-[220px] flex-col border-r border-border bg-white">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
            O
          </span>
          <span className="font-semibold tracking-tight">OrderProfit</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            const isSupport = item.to === "/support";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {isSupport && supportCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {supportCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-[220px] flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between border-b border-border bg-white px-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Store</p>
            <p className="text-sm font-semibold truncate">{storeName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium truncate max-w-[200px]">
                {user.email}
              </p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
