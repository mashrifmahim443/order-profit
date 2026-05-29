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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, RefreshCw, Trash2, Inbox, Download, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

export function ManageData() {
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingRepeat, setExportingRepeat] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [blacklistedPhones, setBlacklistedPhones] = useState<Set<string>>(new Set());
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const blockCustomer = async (o: Order) => {
    if (!user) return;
    const phone = (o.customer_phone ?? "").trim();
    if (!phone) {
      toast.error("This order has no phone number to block");
      return;
    }
    setBlockingId(o.id);
    const { error } = await supabase.from("customer_blacklist").insert({
      user_id: user.id,
      customer_phone: phone,
      customer_name: o.customer_name,
      customer_email: o.customer_email,
      reason: `Blocked from order #${o.order_id}`,
    });
    setBlockingId(null);
    if (error) {
      if (error.code === "23505") toast.error("Customer already blacklisted");
      else toast.error("Failed to blacklist");
      return;
    }
    setBlacklistedPhones((prev) => new Set(prev).add(phone));
    toast.success(`Blacklisted ${o.customer_name ?? phone}`);
  };

  const exportRepeatCustomersCSV = async () => {
    if (!user) return;
    setExportingRepeat(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_name, customer_phone, customer_email, order_total, order_status, order_date")
        .eq("user_id", user.id)
        .not("customer_phone", "is", null)
        .order("order_date", { ascending: false })
        .limit(10000);
      if (error || !data) {
        toast.error("Failed to export");
        return;
      }
      type Agg = {
        name: string;
        phone: string;
        email: string;
        totalOrders: number;
        completedOrders: number;
        cancelledOrders: number;
        totalValue: number;
        lastOrderDate: string;
      };
      const map = new Map<string, Agg>();
      for (const o of data) {
        const phone = (o.customer_phone ?? "").trim();
        if (!phone) continue;
        const existing = map.get(phone);
        const status = (o.order_status ?? "").toLowerCase();
        if (existing) {
          existing.totalOrders += 1;
          if (status === "completed") existing.completedOrders += 1;
          if (status === "cancelled" || status === "refunded") existing.cancelledOrders += 1;
          existing.totalValue += Number(o.order_total) || 0;
          if (!existing.name && o.customer_name) existing.name = o.customer_name;
          if (!existing.email && o.customer_email) existing.email = o.customer_email;
        } else {
          map.set(phone, {
            name: o.customer_name ?? "",
            phone,
            email: o.customer_email ?? "",
            totalOrders: 1,
            completedOrders: status === "completed" ? 1 : 0,
            cancelledOrders: status === "cancelled" || status === "refunded" ? 1 : 0,
            totalValue: Number(o.order_total) || 0,
            lastOrderDate: o.order_date ?? "",
          });
        }
      }
      const repeats = Array.from(map.values())
        .filter((c) => c.totalOrders >= 2)
        .sort((a, b) => b.totalOrders - a.totalOrders);
      if (repeats.length === 0) {
        toast.error("No repeat customers found");
        return;
      }
      const esc = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const headers = [
        "Customer Name", "Phone", "Email",
        "Total Orders", "Completed", "Cancelled/Refunded",
        "Total Value (BDT)", "Last Order Date",
      ];
      const rows = repeats.map((c) => [
        c.name, c.phone, c.email,
        c.totalOrders, c.completedOrders, c.cancelledOrders,
        c.totalValue.toFixed(2), c.lastOrderDate,
      ].map(esc).join(","));
      const csv = "\ufeff" + [headers.map(esc).join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repeat-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${repeats.length} repeat customers`);
    } finally {
      setExportingRepeat(false);
    }
  };

  const exportCSV = async () => {
    if (!user) return;
    setExporting(true);
    try {
      let q = supabase
        .from("orders")
        .select(
          "order_id, customer_name, customer_phone, customer_email, product_name, quantity, order_total, order_status, order_date",
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
      const { data, error } = await q.limit(10000);
      if (error || !data) {
        toast.error("Failed to export");
        return;
      }
      if (data.length === 0) {
        toast.error("No orders to export");
        return;
      }
      const esc = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const headers = [
        "Order ID", "Customer Name", "Phone", "Email",
        "Product", "Quantity", "Order Value (BDT)", "Status", "Order Date",
      ];
      const rows = data.map((o) => [
        o.order_id,
        o.customer_name ?? "",
        o.customer_phone ?? "",
        o.customer_email ?? "",
        o.product_name ?? "",
        o.quantity,
        Number(o.order_total).toFixed(2),
        o.order_status,
        o.order_date ?? "",
      ].map(esc).join(","));
      const csv = "\ufeff" + [headers.map(esc).join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${year}-${String(month + 1).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} orders`);
    } finally {
      setExporting(false);
    }
  };

  const monthStart = useMemo(
    () => new Date(year, month, 1).toISOString(),
    [year, month],
  );
  const monthEnd = useMemo(
    () => new Date(year, month + 1, 1).toISOString(),
    [year, month],
  );

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const prev = orders;
    setOrders((list) =>
      list.map((o) => (o.id === id ? { ...o, order_status: newStatus } : o)),
    );
    const { error } = await supabase
      .from("orders")
      .update({ order_status: newStatus })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
      setOrders(prev);
    } else {
      toast.success("Status updated");
    }
    setUpdatingId(null);
  };

  const deleteOrder = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted");
      setOrders((list) => list.filter((o) => o.id !== id));
    }
    setDeletingId(null);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(orders.map((o) => o.id)));
    else setSelectedIds(new Set());
  };

  const bulkUpdateStatus = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("orders")
      .update({ order_status: bulkStatus })
      .in("id", ids);
    setBulkUpdating(false);
    if (error) {
      toast.error("Bulk update failed");
      return;
    }
    setOrders((list) =>
      list.map((o) => (selectedIds.has(o.id) ? { ...o, order_status: bulkStatus } : o)),
    );
    toast.success(`Updated ${ids.length} orders`);
    setSelectedIds(new Set());
    setBulkStatus("");
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, month, year, status, search, refreshKey]);

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
      setLoading(false);
    })();
  }, [user, monthStart, monthEnd, status, search, page, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [month, year, status, search]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("customer_blacklist")
      .select("customer_phone")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setBlacklistedPhones(new Set((data ?? []).map((r) => r.customer_phone)));
      });
  }, [user, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Data</h1>
          <p className="text-sm text-muted-foreground">
            Update order status or delete orders. Changes reflect on the Dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || loading}
            onClick={exportCSV}
            className="gap-2"
          >
            <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exportingRepeat || loading}
            onClick={exportRepeatCustomersCSV}
            className="gap-2"
          >
            <Download className={`h-4 w-4 ${exportingRepeat ? "animate-pulse" : ""}`} />
            {exportingRepeat ? "Exporting..." : "Export Repeat Customers"}
          </Button>
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

      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Delivered</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="refunded">Returned</SelectItem>
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

      {selectedIds.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Change status to…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Delivered</SelectItem>
                <SelectItem value="refunded">Returned</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={bulkUpdateStatus} disabled={!bulkStatus || bulkUpdating}>
              {bulkUpdating ? "Updating…" : "Apply"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={orders.length > 0 && selectedIds.size === orders.length}
                      onCheckedChange={(v) => toggleSelectAll(v === true)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="h-6 w-6" />
                        No orders match the current filters.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id} data-state={selectedIds.has(o.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(o.id)}
                          onCheckedChange={(v) => toggleSelect(o.id, v === true)}
                          aria-label="Select row"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(o.order_date)}</TableCell>
                      <TableCell className="font-mono text-xs">#{o.order_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>{o.customer_name ?? "—"}</span>
                          {o.customer_phone && blacklistedPhones.has(o.customer_phone) && (
                            <span title="Blacklisted customer" className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                              <ShieldAlert className="h-3 w-3" /> Blocked
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{o.product_name ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatBDT(Number(o.order_total))}</TableCell>
                      <TableCell>
                        <Select
                          value={o.order_status}
                          disabled={updatingId === o.id}
                          onValueChange={(v) => updateStatus(o.id, v)}
                        >
                          <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Delivered</SelectItem>
                            <SelectItem value="refunded">Returned</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={blockingId === o.id || (!!o.customer_phone && blacklistedPhones.has(o.customer_phone))}
                            onClick={() => blockCustomer(o)}
                            aria-label="Blacklist customer"
                            title={o.customer_phone && blacklistedPhones.has(o.customer_phone) ? "Already blacklisted" : "Blacklist this customer"}
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={deletingId === o.id}
                                aria-label="Delete order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Order #{o.order_id} for {o.customer_name ?? "—"} will be permanently removed. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteOrder(o.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
