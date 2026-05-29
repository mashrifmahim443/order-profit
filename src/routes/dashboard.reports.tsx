import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/reports")({
  head: () => ({
    meta: [
      { title: "Reports | OrderProfit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

const fmt = (n: number) => `৳ ${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;

interface OrderRow {
  customer_phone: string | null;
  customer_name: string | null;
  product_name: string | null;
  quantity: number;
  order_total: number;
  order_status: string;
  order_date: string | null;
}

function ReportsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<"30" | "90" | "180" | "365">("30");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const days = Number(range);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [{ data: ranged, error: e1 }, { data: all, error: e2 }] = await Promise.all([
        supabase
          .from("orders")
          .select("customer_phone, customer_name, product_name, quantity, order_total, order_status, order_date")
          .eq("user_id", user.id)
          .gte("order_date", since.toISOString())
          .limit(20000),
        supabase
          .from("orders")
          .select("customer_phone, customer_name, product_name, quantity, order_total, order_status, order_date")
          .eq("user_id", user.id)
          .eq("order_status", "completed")
          .limit(20000),
      ]);
      if (e1 || e2) toast.error("Failed to load reports");
      setOrders((ranged as OrderRow[]) ?? []);
      setAllOrders((all as OrderRow[]) ?? []);
      setLoading(false);
    })();
  }, [user, range]);

  const completed = useMemo(
    () => orders.filter((o) => (o.order_status ?? "").toLowerCase() === "completed"),
    [orders],
  );

  // Daily breakdown
  const daily = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; orders: number }>();
    const days = Number(range);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      map.set(k, { date: k, sales: 0, orders: 0 });
    }
    for (const o of completed) {
      if (!o.order_date) continue;
      const k = o.order_date.slice(0, 10);
      const ex = map.get(k);
      if (ex) {
        ex.sales += Number(o.order_total) || 0;
        ex.orders += 1;
      }
    }
    return Array.from(map.values());
  }, [completed, range]);

  // Weekly breakdown (last 12 weeks)
  const weekly = useMemo(() => {
    const map = new Map<string, { week: string; sales: number; orders: number }>();
    for (const o of completed) {
      if (!o.order_date) continue;
      const d = new Date(o.order_date);
      const day = d.getUTCDay();
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
      const k = monday.toISOString().slice(0, 10);
      const ex = map.get(k) ?? { week: k, sales: 0, orders: 0 };
      ex.sales += Number(o.order_total) || 0;
      ex.orders += 1;
      map.set(k, ex);
    }
    return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week));
  }, [completed]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sold: number; revenue: number; cancelled: number }
    >();
    for (const o of orders) {
      const name = (o.product_name ?? "Unknown").trim() || "Unknown";
      const ex = map.get(name) ?? { name, sold: 0, revenue: 0, cancelled: 0 };
      const status = (o.order_status ?? "").toLowerCase();
      if (status === "completed") {
        ex.sold += Number(o.quantity) || 0;
        ex.revenue += Number(o.order_total) || 0;
      } else if (status === "cancelled" || status === "refunded") {
        ex.cancelled += Number(o.quantity) || 0;
      }
      map.set(name, ex);
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }, [orders]);

  // CLV — based on all completed orders ever
  const clv = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; orders: number; total: number; lastDate: string }
    >();
    for (const o of allOrders) {
      const phone = (o.customer_phone ?? "").trim();
      if (!phone) continue;
      const ex = map.get(phone) ?? {
        name: o.customer_name ?? "—",
        phone,
        orders: 0,
        total: 0,
        lastDate: "",
      };
      ex.orders += 1;
      ex.total += Number(o.order_total) || 0;
      if (o.order_date && o.order_date > ex.lastDate) ex.lastDate = o.order_date;
      if (!ex.name && o.customer_name) ex.name = o.customer_name;
      map.set(phone, ex);
    }
    const list = Array.from(map.values());
    const avgClv = list.length ? list.reduce((s, c) => s + c.total, 0) / list.length : 0;
    const top = list.sort((a, b) => b.total - a.total).slice(0, 20);
    return { avgClv, total: list.length, top };
  }, [allOrders]);

  const totals = useMemo(() => {
    const sales = completed.reduce((s, o) => s + (Number(o.order_total) || 0), 0);
    const ordersCount = completed.length;
    const avg = ordersCount ? sales / ordersCount : 0;
    return { sales, ordersCount, avg };
  }, [completed]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Daily / weekly breakdown, top products, and customer lifetime value.
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Sales</p><p className="mt-1 text-2xl font-bold">{fmt(totals.sales)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Delivered Orders</p><p className="mt-1 text-2xl font-bold">{totals.ordersCount}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Avg Order Value</p><p className="mt-1 text-2xl font-bold">{fmt(totals.avg)}</p></CardContent></Card>
      </div>

      {/* Daily */}
      <Card>
        <CardHeader><CardTitle className="text-base">Daily Sales Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={daily} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `৳${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(v: number) => fmt(Number(v))} />
                <Line type="monotone" dataKey="sales" stroke="hsl(217 91% 55%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly */}
      <Card>
        <CardHeader><CardTitle className="text-base">Weekly Sales Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={weekly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `৳${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(v: number) => fmt(Number(v))} />
                <Bar dataKey="sales" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Products</CardTitle>
          <p className="text-xs text-muted-foreground">Best sellers and high-cancellation items in selected range.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Sold (qty)</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cancelled/Returned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : topProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">No product data yet.</TableCell></TableRow>
                ) : (
                  topProducts.map((p) => {
                    const loss = p.cancelled > p.sold && p.sold > 0;
                    return (
                      <TableRow key={p.name} className={loss ? "bg-destructive/5" : ""}>
                        <TableCell className="max-w-[320px] truncate">{p.name}</TableCell>
                        <TableCell className="text-right font-medium">{p.sold}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(p.revenue)}</TableCell>
                        <TableCell className={`text-right ${p.cancelled > 0 ? "text-destructive font-medium" : ""}`}>{p.cancelled}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CLV */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Lifetime Value (CLV)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Average CLV: <span className="font-semibold text-foreground">{fmt(clv.avgClv)}</span> · Total customers: {clv.total}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead>Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : clv.top.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No completed orders yet.</TableCell></TableRow>
                ) : (
                  clv.top.map((c) => (
                    <TableRow key={c.phone}>
                      <TableCell>{c.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.phone}</TableCell>
                      <TableCell className="text-right">{c.orders}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(c.total)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.lastDate ? c.lastDate.slice(0, 10) : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
