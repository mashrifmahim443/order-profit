import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Copy, Inbox, RefreshCw, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

interface Order {
  id: string;
  order_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  product_name: string | null;
  quantity: number;
  order_total: number;
  order_status: string;
  order_date: string | null;
}

const PAGE_SIZE = 20;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatBDT(n: number) {
  return `৳ ${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    processing: "bg-yellow-100 text-yellow-700",
    refunded: "bg-red-100 text-red-700",
    cancelled: "bg-gray-200 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        styles[s] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth());
  const [year, setYear] = useState<number>(now.getFullYear());
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [hasAnyOrders, setHasAnyOrders] = useState<boolean | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);


  const [timezone, setTimezone] = useState<string>(() => {
    if (typeof window === "undefined") return "UTC";
    return (
      window.localStorage.getItem("dashboard-timezone") ||
      "Asia/Dhaka"
    );
  });

  const timezones = useMemo<string[]>(() => {
    try {
      const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
        .supportedValuesOf;
      if (fn) return fn("timeZone");
    } catch {
      // ignore
    }
    return [
      "UTC",
      "Asia/Dhaka",
      "Asia/Kolkata",
      "Asia/Karachi",
      "Asia/Dubai",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Europe/London",
      "Europe/Berlin",
      "Europe/Paris",
      "America/New_York",
      "America/Chicago",
      "America/Los_Angeles",
      "Australia/Sydney",
    ];
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dashboard-timezone", timezone);
    }
  }, [timezone]);

  const formatInTz = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(date);
  };

  // monthly stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    sales: 0,
    refunds: 0,
  });

  // Phones that have at least one cancelled/refunded order for this user
  const [flaggedPhones, setFlaggedPhones] = useState<Set<string>>(new Set());
  // Phones that have at least one completed order for this user
  const [repeatCustomerPhones, setRepeatCustomerPhones] = useState<Set<string>>(new Set());

  const monthStart = useMemo(
    () => new Date(year, month, 1).toISOString(),
    [year, month],
  );
  const monthEnd = useMemo(
    () => new Date(year, month + 1, 1).toISOString(),
    [year, month],
  );

  // Auto-refresh disabled — data only reloads on manual Refresh click or filter change.

  // Check if user has any orders. Last synced means the last successful dashboard load time.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count, error }) => {
        if (error) return;
        setHasAnyOrders((count ?? 0) > 0);
      });
  }, [user, totalCount, refreshKey]);


  // Load monthly stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("order_total, order_status")
        .eq("user_id", user.id)
        .gte("order_date", monthStart)
        .lt("order_date", monthEnd);

      if (error) {
        toast.error("Failed to load stats");
        return;
      }
      const list = data ?? [];
      const sales = list
        .filter((o) => o.order_status?.toLowerCase() === "completed")
        .reduce((sum, o) => sum + Number(o.order_total || 0), 0);
      const refunds = list
        .filter((o) => o.order_status?.toLowerCase() === "refunded")
        .reduce((sum, o) => sum + Number(o.order_total || 0), 0);
      setStats({ totalOrders: list.length, sales, refunds });
    })();
  }, [user, monthStart, monthEnd, refreshKey]);

  // Load paginated orders
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("orders")
        .select(
          "id, order_id, customer_name, customer_phone, customer_email, product_name, quantity, order_total, order_status, order_date",
          { count: "exact" },
        )
        .eq("user_id", user.id)
        .gte("order_date", monthStart)
        .lt("order_date", monthEnd)
        .order("order_date", { ascending: false });

      if (status !== "all") q = q.eq("order_status", status);
      if (search.trim()) {
        const s = search.trim().replace(/[%,]/g, "");
        q = q.or(`customer_name.ilike.%${s}%,order_id.ilike.%${s}%,customer_phone.ilike.%${s}%,customer_email.ilike.%${s}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) toast.error("Failed to load orders");
      setOrders((data as Order[]) ?? []);
      setTotalCount(count ?? 0);
      if (!error) setLastSynced(new Date().toISOString());
      setLoading(false);
    })();
  }, [user, monthStart, monthEnd, status, search, page, refreshKey]);

  // Load flagged + repeat phones in a single query (covers both flag types).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_phone, order_status")
        .eq("user_id", user.id)
        .in("order_status", ["cancelled", "refunded", "completed"])
        .not("customer_phone", "is", null)
        .limit(20000);
      if (error) return;
      const flagged = new Set<string>();
      const repeat = new Set<string>();
      (data ?? []).forEach((r: { customer_phone: string | null; order_status: string }) => {
        const p = (r.customer_phone ?? "").trim();
        if (!p) return;
        const s = r.order_status?.toLowerCase();
        if (s === "completed") repeat.add(p);
        else if (s === "cancelled" || s === "refunded") flagged.add(p);
      });
      setFlaggedPhones(flagged);
      setRepeatCustomerPhones(repeat);
    })();
  }, [user, refreshKey, totalCount]);


  useEffect(() => {
    setPage(1);
  }, [month, year, status, search]);

  const netRevenue = stats.sales - stats.refunds;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview for {MONTHS[month]} {year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastSynced && (
            <p className="text-xs text-muted-foreground">
              Last synced: {formatInTz(lastSynced)}
            </p>
          )}
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setRefreshKey((k) => k + 1)}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={String(stats.totalOrders)} />
        <StatCard label="Total Sales" value={formatBDT(stats.sales)} />
        <StatCard label="Total Refunds" value={formatBDT(stats.refunds)} />
        <StatCard label="Net Revenue" value={formatBDT(netRevenue)} highlight />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search orders by customer name, phone, email or order ID"
              placeholder="Search by name, phone, email or order ID"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders table or empty state */}
      <Card>
        <CardContent className="p-0">
          {hasAnyOrders === false ? (
            <EmptyState />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`sk-${i}`}>
                          {Array.from({ length: 7 }).map((__, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                          No orders match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((o) => {
                        const phone = (o.customer_phone ?? "").trim();
                        const status = o.order_status?.toLowerCase();
                        const isRisky =
                          phone &&
                          flaggedPhones.has(phone) &&
                          status !== "cancelled" &&
                          status !== "refunded";
                        const isRepeatCustomer =
                          phone &&
                          repeatCustomerPhones.has(phone) &&
                          !isRisky;
                        return (
                          <TableRow
                            key={o.id}
                            className={isRisky ? "bg-destructive/10 hover:bg-destructive/15" : isRepeatCustomer ? "bg-green-50/60 hover:bg-green-50" : ""}
                          >
                            <TableCell className="whitespace-nowrap">{formatDate(o.order_date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{o.customer_name ?? "—"}</span>
                                {isRisky && (
                                  <TooltipProvider delayDuration={150}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                                          <AlertTriangle className="h-3 w-3" />
                                          Risk
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Previously returned or cancelled order from this phone number.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {isRepeatCustomer && (
                                  <TooltipProvider delayDuration={150}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Repeat
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Successfully delivered previous order from this phone number.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={isRisky ? "font-medium text-destructive" : isRepeatCustomer ? "font-medium text-green-700" : ""}>
                              {o.customer_phone ?? "—"}
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate">{o.product_name ?? "—"}</TableCell>
                            <TableCell className="text-right">{o.quantity}</TableCell>
                            <TableCell className="text-right font-medium">{formatBDT(Number(o.order_total))}</TableCell>
                            <TableCell><StatusBadge status={o.order_status} /></TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalCount > 0 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                  <p className="text-muted-foreground">
                    Page {page} of {totalPages} · {totalCount} orders
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent
        className={`p-5 rounded-xl ${
          highlight ? "bg-primary text-primary-foreground" : ""
        }`}
      >
        <p className={`text-xs ${highlight ? "opacity-80" : "text-muted-foreground"}`}>
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  const { user } = useAuth();
  const [token, setToken] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("webhook_token")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setToken(data?.webhook_token ?? ""));
  }, [user]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://YOUR_DOMAIN";
  const webhookUrl = token
    ? `${origin}/api/public/webhook/orders?token=${token}`
    : "";

  const copy = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="py-12 px-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <Inbox className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">No orders yet</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        Connect your WooCommerce store using the webhook URL below. New orders
        will appear here automatically.
      </p>

      <div className="mt-6 max-w-xl mx-auto text-left">
        <label className="text-xs font-medium text-muted-foreground">
          Your Webhook URL
        </label>
        <div className="mt-1 flex gap-2">
          <Input
            readOnly
            value={webhookUrl || "Loading..."}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copy}
            disabled={!webhookUrl}
            aria-label="Copy webhook URL"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Paste this into the OrderProfit WooCommerce plugin. You can also find
          it later in{" "}
          <Link to="/settings" className="text-primary underline">
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
