import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Shield, LogOut, LayoutDashboard, ExternalLink, LifeBuoy,
  ChevronDown, MessageCircle, CheckCircle, XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  children?: { to: string; label: string; icon: typeof LayoutDashboard }[];
}

const navItems: NavItem[] = [
  { to: "/private", label: "Admin Console", icon: LayoutDashboard },
  {
    to: "/support",
    label: "Support",
    icon: LifeBuoy,
    children: [
      { to: "/support", label: "All Tickets", icon: MessageCircle },
      { to: "/support?status=open", label: "Open Tickets", icon: CheckCircle },
      { to: "/support?status=closed", label: "Closed Tickets", icon: XCircle },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [supportOpen, setSupportOpen] = useState(true);

  useEffect(() => {
    if (loading || adminLoading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, adminLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (!adminLoading && user && isAdmin) {
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .then(({ count, error }) => {
          if (!error) setOpenTicketsCount(count ?? 0);
        });
    }
  }, [adminLoading, user, isAdmin]);

  if (loading || adminLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Verifying super admin access…
      </div>
    );
  }

  const fullPath = pathname + searchStr;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="fixed inset-y-0 left-0 hidden md:flex w-[240px] flex-col border-r border-slate-800 bg-slate-900">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight text-sm">Super Admin</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Control Center</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const isSupport = item.to === "/support";
            if (!item.children) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {isSupport && openTicketsCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {openTicketsCount}
                    </span>
                  )}
                </Link>
              );
            }
            // Expandable parent
            return (
              <div key={item.to}>
                <button
                  onClick={() => setSupportOpen((v) => !v)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {openTicketsCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {openTicketsCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${supportOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {supportOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-3">
                    {item.children.map((child) => {
                      const CIcon = child.icon;
                      const childActive = fullPath === child.to;
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            childActive
                              ? "bg-primary/15 text-primary font-medium"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                          }`}
                        >
                          <CIcon className="h-3.5 w-3.5" />
                          <span className="flex-1">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <ExternalLink className="h-4 w-4" />
            View Public Site
          </a>
        </nav>
        <div className="p-3 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 md:ml-[240px] flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Signed in as</p>
            <p className="text-sm font-semibold truncate text-slate-100">{user.email}</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary font-medium uppercase tracking-wider">
            Super Admin
          </span>
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-slate-950">{children}</main>
      </div>
    </div>
  );
}
