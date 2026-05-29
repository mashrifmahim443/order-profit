import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Shield, Users, ShoppingBag, Ban, Check, Download, CreditCard, LifeBuoy, ChevronLeft, ChevronRight } from "lucide-react";
import { TicketThread } from "@/components/ticket-thread";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/private")({
  head: () => ({
    meta: [
      { title: "Super Admin | OrderProfit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

interface UserRow {
  user_id: string;
  store_name: string | null;
  plan: string;
  plan_expires_at: string | null;
  blocked: boolean;
  created_at: string;
  total_orders: number;
  orders_this_month: number;
}

interface PlatformStats {
  total_users: number;
  paid_users: number;
  blocked_users: number;
  orders_this_month: number;
  pending_payments: number;
}

function AdminPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Console</h1>
        </div>

        <StatsCards />

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="orders">Plan Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payment Requests</TabsTrigger>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="settings">Site & Payment Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="orders"><PlanOrdersTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="tickets"><TicketsTab /></TabsContent>
          <TabsContent value="settings"><SiteSettingsTab /></TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

function StatsCards() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    supabase.rpc("admin_platform_stats").then(({ data, error }) => {
      if (error) return;
      if (data && data[0]) setStats(data[0] as PlatformStats);
    });
  }, []);

  const items = [
    { label: "Total Users", value: stats?.total_users ?? "—", icon: Users },
    { label: "Paid Users", value: stats?.paid_users ?? "—", icon: CreditCard },
    { label: "Blocked", value: stats?.blocked_users ?? "—", icon: Ban },
    { label: "Orders this month", value: stats?.orders_this_month ?? "—", icon: ShoppingBag },
    { label: "Pending payments", value: stats?.pending_payments ?? "—", icon: CreditCard },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{it.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{String(it.value)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function UsersTab() {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    supabase.rpc("admin_user_stats").then(({ data, error }) => {
      if (error) return toast.error(error.message);
      setRows((data ?? []) as UserRow[]);
    });
  };

  useEffect(() => { load(); }, []);

  const toggleBlock = async (u: UserRow) => {
    setBusy(u.user_id);
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: !u.blocked })
      .eq("id", u.user_id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(u.blocked ? "User unblocked" : "User blocked");
    load();
  };

  const setPlan = async (u: UserRow, plan: string) => {
    setBusy(u.user_id);
    const expires = plan === "free"
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ plan, plan_expires_at: expires })
      .eq("id", u.user_id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Plan set to ${plan}`);
    load();
  };

  const downloadUserData = async (u: UserRow) => {
    setBusy(u.user_id);
    const [{ data: orders }, { data: costs }] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", u.user_id),
      supabase.from("monthly_costs").select("*").eq("user_id", u.user_id),
    ]);
    setBusy(null);
    const payload = {
      user_id: u.user_id,
      store_name: u.store_name,
      plan: u.plan,
      orders: orders ?? [],
      monthly_costs: costs ?? [],
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-${u.user_id.slice(0, 8)}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  if (!rows) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Orders (mo)</TableHead>
              <TableHead className="text-right">Total Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell>
                  <p className="font-medium">{u.store_name || "—"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}…</p>
                </TableCell>
                <TableCell>
                  <select
                    value={u.plan}
                    onChange={(e) => setPlan(u, e.target.value)}
                    disabled={busy === u.user_id}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                  </select>
                </TableCell>
                <TableCell className="text-right">{u.orders_this_month}</TableCell>
                <TableCell className="text-right">{u.total_orders}</TableCell>
                <TableCell>
                  {u.blocked
                    ? <Badge variant="destructive">Blocked</Badge>
                    : <Badge variant="secondary">Active</Badge>}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadUserData(u)}
                    disabled={busy === u.user_id}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={u.blocked ? "default" : "destructive"}
                    onClick={() => toggleBlock(u)}
                    disabled={busy === u.user_id}
                  >
                    {u.blocked ? "Unblock" : "Block"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface PaymentReq {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  method: string;
  sender_number: string;
  transaction_id: string;
  status: string;
  created_at: string;
}

function PaymentsTab() {
  const [rows, setRows] = useState<PaymentReq[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { user } = useAuth();

  const load = () => {
    supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        setRows((data ?? []) as PaymentReq[]);
      });
  };

  useEffect(() => { load(); }, []);

  const approve = async (r: PaymentReq) => {
    setBusy(r.id);
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("profiles").update({ plan: r.plan, plan_expires_at: expires }).eq("id", r.user_id),
      supabase.from("payment_requests").update({
        status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
      }).eq("id", r.id),
    ]);
    setBusy(null);
    if (e1 || e2) return toast.error((e1 || e2)!.message);
    toast.success("Approved & plan activated");
    load();
  };

  const reject = async (r: PaymentReq) => {
    setBusy(r.id);
    const { error } = await supabase.from("payment_requests").update({
      status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
    }).eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    load();
  };

  if (!rows) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle>Payment Requests</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Txn ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}…</TableCell>
                <TableCell><Badge variant="outline">{r.plan}</Badge></TableCell>
                <TableCell className="uppercase text-xs">{r.method}</TableCell>
                <TableCell className="font-mono text-xs">{r.sender_number}</TableCell>
                <TableCell className="font-mono text-xs">{r.transaction_id}</TableCell>
                <TableCell className="text-right">৳{r.amount}</TableCell>
                <TableCell>
                  <Badge variant={
                    r.status === "approved" ? "default" :
                    r.status === "rejected" ? "destructive" : "secondary"
                  }>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => approve(r)} disabled={busy === r.id}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(r)} disabled={busy === r.id}>
                        <Ban className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No payment requests</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SiteSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState({
    bkash_number: "",
    nagad_number: "",
    pro_price: 200,
    business_price: 300,
    free_order_limit: 50,
    pro_order_limit: 500,
    business_order_limit: 1000,
    hero_title: "",
    hero_subtitle: "",
  });

  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (data) setS({
          bkash_number: data.bkash_number,
          nagad_number: data.nagad_number,
          pro_price: Number(data.pro_price),
          business_price: Number(data.business_price),
          free_order_limit: data.free_order_limit,
          pro_order_limit: data.pro_order_limit,
          business_order_limit: data.business_order_limit,
          hero_title: data.hero_title,
          hero_subtitle: data.hero_subtitle,
        });
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ ...s, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Payment Numbers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>bKash Number</Label>
            <Input value={s.bkash_number} onChange={(e) => setS({ ...s, bkash_number: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Nagad Number</Label>
            <Input value={s.nagad_number} onChange={(e) => setS({ ...s, nagad_number: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plan Pricing (BDT)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Pro Price</Label>
            <Input type="number" value={s.pro_price} onChange={(e) => setS({ ...s, pro_price: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Business Price</Label>
            <Input type="number" value={s.business_price} onChange={(e) => setS({ ...s, business_price: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order Limits</CardTitle></CardHeader>
        <CardContent className="space-y-3 grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Free</Label>
            <Input type="number" value={s.free_order_limit} onChange={(e) => setS({ ...s, free_order_limit: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Pro</Label>
            <Input type="number" value={s.pro_order_limit} onChange={(e) => setS({ ...s, pro_order_limit: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Business</Label>
            <Input type="number" value={s.business_order_limit} onChange={(e) => setS({ ...s, business_order_limit: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Landing Page Content</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Hero Title</Label>
            <Input value={s.hero_title} onChange={(e) => setS({ ...s, hero_title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Hero Subtitle</Label>
            <Input value={s.hero_subtitle} onChange={(e) => setS({ ...s, hero_subtitle: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save All Settings"}</Button>
      </div>
    </div>
  );
}

interface PlanOrder {
  id: string;
  name: string;
  phone: string;
  email: string;
  website: string | null;
  plan: string;
  status: string;
  created_at: string;
}

function PlanOrdersTab() {
  const [rows, setRows] = useState<PlanOrder[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { user } = useAuth();

  const load = () => {
    supabase
      .from("plan_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        setRows((data ?? []) as PlanOrder[]);
      });
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (r: PlanOrder, status: "approved" | "rejected") => {
    setBusy(r.id);
    const { error } = await supabase
      .from("plan_orders")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      })
      .eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(status === "approved"
      ? "Approved. Now set the user's plan in the Users tab."
      : "Rejected");
    load();
  };

  const remove = async (r: PlanOrder) => {
    setBusy(r.id);
    const { error } = await supabase.from("plan_orders").delete().eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (!rows) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Orders (from landing page)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                <TableCell className="text-xs">{r.email}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">
                  {r.website ? (
                    <a href={r.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {r.website}
                    </a>
                  ) : "—"}
                </TableCell>
                <TableCell><Badge variant="outline">{r.plan}</Badge></TableCell>
                <TableCell>
                  <Badge variant={
                    r.status === "approved" ? "default" :
                    r.status === "rejected" ? "destructive" : "secondary"
                  }>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {r.status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => updateStatus(r, "approved")} disabled={busy === r.id}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(r, "rejected")} disabled={busy === r.id}>
                        <Ban className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => remove(r)} disabled={busy === r.id}>
                      Delete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No plan orders yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface AdminTicket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function TicketsTab() {
  const [allRows, setAllRows] = useState<AdminTicket[] | null>(null);
  const [selected, setSelected] = useState<AdminTicket | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = () => {
    supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        setAllRows((data ?? []) as AdminTicket[]);
        setPage(1);
      });
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (t: AdminTicket) => {
    setBusy(true);
    const next = t.status === "open" ? "closed" : "open";
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", t.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Ticket ${next}`);
    setSelected({ ...t, status: next });
    load();
  };

  const filtered = (allRows ?? []).filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(search.trim().toLowerCase()) ||
      t.user_id.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  if (!allRows) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4" /> Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="ticket-search">Search</Label>
              <Input
                id="ticket-search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Subject or user ID…"
              />
            </div>
            <div className="w-full md:w-40 space-y-1">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as "all" | "open" | "closed"); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-32 space-y-1">
              <Label>Per page</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.subject}</TableCell>
                  <TableCell className="font-mono text-xs">{t.user_id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelected(t)}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No tickets match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[3rem] text-center">
                {safePage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span className="truncate">{selected?.subject}</span>
              {selected && (
                <Button
                  size="sm"
                  variant={selected.status === "open" ? "destructive" : "default"}
                  onClick={() => toggleStatus(selected)}
                  disabled={busy}
                >
                  {selected.status === "open" ? "Close ticket" : "Reopen"}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <TicketThread
              ticketId={selected.id}
              asAdmin
              disabled={selected.status === "closed"}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
