import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  
  PieChart,
  Pie,
  Legend,
} from "recharts";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

const fmt = (n: number) =>
  `৳ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const Route = createFileRoute("/profit")({
  head: () => ({
    meta: [
      { title: "Profit Calculator | OrderProfit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfitPage,
});

function ProfitPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [sales, setSales] = useState(0);
  const [refundedTotal, setRefundedTotal] = useState(0);
  const [cancelledTotal, setCancelledTotal] = useState(0);
  const [includeRefunded, setIncludeRefunded] = useState(true);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const refunds =
    (includeRefunded ? refundedTotal : 0) +
    (includeCancelled ? cancelledTotal : 0);

  const [delivery, setDelivery] = useState(0);
  const [packaging, setPackaging] = useState(0);
  const [marketing, setMarketing] = useState(0);
  const [otherLabel, setOtherLabel] = useState("Other");
  const [otherAmount, setOtherAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 1).toISOString();

      const [ordersRes, costsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("order_total, order_status")
          .eq("user_id", user.id)
          .gte("order_date", start)
          .lt("order_date", end),
        supabase
          .from("monthly_costs")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      let s = 0, r = 0, cx = 0;
      for (const o of ordersRes.data ?? []) {
        const t = Number(o.order_total) || 0;
        if (o.order_status === "completed") s += t;
        else if (o.order_status === "refunded") r += t;
        else if (o.order_status === "cancelled") cx += t;
      }
      setSales(s);
      setRefundedTotal(r);
      setCancelledTotal(cx);

      const c = costsRes.data;
      setDelivery(c ? Number(c.delivery_cost) : 0);
      setPackaging(c ? Number(c.packaging_cost) : 0);
      setMarketing(c ? Number(c.marketing_cost) : 0);
      setOtherLabel(c?.other_cost_label ?? "Other");
      setOtherAmount(c ? Number(c.other_cost_amount) : 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, month, year]);

  const netRevenue = sales - refunds;
  const totalCosts = delivery + packaging + marketing + otherAmount;
  const netProfit = netRevenue - totalCosts;
  const margin = sales > 0 ? (netProfit / sales) * 100 : null;

  const saveCosts = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("monthly_costs").upsert(
      {
        user_id: user.id,
        month,
        year,
        delivery_cost: delivery,
        packaging_cost: packaging,
        marketing_cost: marketing,
        other_cost_label: otherLabel || "Other",
        other_cost_amount: otherAmount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month,year" }
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Costs saved");
  };

  const numInput = (v: number, set: (n: number) => void) => (
    <Input
      type="number"
      min={0}
      step="0.01"
      value={Number.isFinite(v) ? v : 0}
      onChange={(e) => set(parseFloat(e.target.value) || 0)}
    />
  );

  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const fileBase = `orderprofit-${year}-${String(month).padStart(2, "0")}`;

  const rows: Array<[string, number]> = [
    ["Total Sales Revenue", sales],
    ["Total Returns", refunds],
    ["Delivery Cost", delivery],
    ["Packaging Cost", packaging],
    ["Marketing Cost", marketing],
    [`${otherLabel || "Other"} Costs`, otherAmount],
    ["Net Profit", netProfit],
  ];

  const exportCSV = () => {
    const lines = [
      `OrderProfit — Monthly Profit Report`,
      `Period,${periodLabel}`,
      ``,
      `Item,Amount (BDT)`,
      ...rows.map(([k, v]) => `"${k}",${v.toFixed(2)}`),
      `Profit Margin,${margin === null ? "N/A" : margin.toFixed(1) + "%"}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 48;
    let y = 64;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("OrderProfit — Monthly Profit Report", left, y);
    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(`Period: ${periodLabel}`, left, y);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, y + 14);
    y += 40;

    doc.setDrawColor(220);
    doc.line(left, y, 547, y);
    y += 20;

    doc.setTextColor(20);
    doc.setFontSize(12);
    rows.slice(0, -1).forEach(([k, v]) => {
      doc.setFont("helvetica", "normal");
      doc.text(k, left, y);
      doc.text(`BDT ${v.toFixed(2)}`, 547, y, { align: "right" });
      y += 20;
    });

    y += 6;
    doc.setDrawColor(180);
    doc.line(left, y, 547, y);
    y += 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Net Profit", left, y);
    if (netProfit >= 0) doc.setTextColor(22, 163, 74);
    else doc.setTextColor(220, 38, 38);
    doc.text(`BDT ${netProfit.toFixed(2)}`, 547, y, { align: "right" });
    y += 22;
    doc.setTextColor(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(
      `Profit Margin: ${margin === null ? "N/A (no sales)" : margin.toFixed(1) + "%"}`,
      left,
      y,
    );

    doc.save(`${fileBase}.pdf`);
    toast.success("PDF exported");
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profit Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Calculate your real monthly profit after costs.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPDF}>Download PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>Download CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Section 1 — Month Selector */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 ml-auto">
              <Label className="text-xs text-muted-foreground">Include in Returns</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeRefunded}
                    onCheckedChange={(v) => setIncludeRefunded(v === true)}
                  />
                  Refunded ({fmt(refundedTotal)})
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeCancelled}
                    onCheckedChange={(v) => setIncludeCancelled(v === true)}
                  />
                  Cancelled ({fmt(cancelledTotal)})
                </label>
              </div>
            </div>
            {loading && <span className="text-sm text-muted-foreground">Loading…</span>}
          </CardContent>
        </Card>

        {/* Section 2 — Revenue */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Sales Revenue</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmt(sales)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Returns / Refunds</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmt(refunds)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Revenue</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmt(netRevenue)}</CardContent>
          </Card>
        </div>

        {/* Section 3 — Costs */}
        <Card>
          <CardHeader><CardTitle>Monthly Costs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Delivery Cost (৳)</Label>
                {numInput(delivery, setDelivery)}
              </div>
              <div className="space-y-1">
                <Label>Packaging Cost (৳)</Label>
                {numInput(packaging, setPackaging)}
              </div>
              <div className="space-y-1">
                <Label>Marketing Cost (৳)</Label>
                {numInput(marketing, setMarketing)}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Other Cost Label</Label>
                <Input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Other Cost Amount (৳)</Label>
                {numInput(otherAmount, setOtherAmount)}
              </div>
            </div>
            <Button onClick={saveCosts} disabled={saving}>
              {saving ? "Saving…" : "Save Costs"}
            </Button>
          </CardContent>
        </Card>

        {/* Section 4 — Profit Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Monthly Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">Revenue, returns, costs & net profit</p>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Revenue", value: sales, fill: "url(#g-revenue)" },
                      { name: "Returns", value: refunds, fill: "url(#g-returns)" },
                      { name: "Costs", value: totalCosts, fill: "url(#g-costs)" },
                      {
                        name: "Net Profit",
                        value: netProfit,
                        fill: netProfit >= 0 ? "url(#g-profit)" : "url(#g-returns)",
                      },
                    ]}
                    margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
                    barCategoryGap="25%"
                  >
                    <defs>
                      <linearGradient id="g-revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(217 91% 65%)" />
                        <stop offset="100%" stopColor="hsl(217 91% 50%)" />
                      </linearGradient>
                      <linearGradient id="g-returns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(0 84% 68%)" />
                        <stop offset="100%" stopColor="hsl(0 84% 55%)" />
                      </linearGradient>
                      <linearGradient id="g-costs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(38 95% 60%)" />
                        <stop offset="100%" stopColor="hsl(38 92% 48%)" />
                      </linearGradient>
                      <linearGradient id="g-profit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(142 71% 55%)" />
                        <stop offset="100%" stopColor="hsl(142 71% 38%)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(v) => `৳${Math.round(Number(v) / 1000)}k`}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v: number) => [fmt(Number(v)), ""]}
                      cursor={{ fill: "rgba(100,116,139,0.08)" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.15)",
                        fontSize: 12,
                        padding: "8px 12px",
                      }}
                      labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: 4 }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Cost Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">Where your money goes</p>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {[
                        ["p-returns", "hsl(0 84% 68%)", "hsl(0 84% 52%)"],
                        ["p-delivery", "hsl(217 91% 65%)", "hsl(217 91% 50%)"],
                        ["p-packaging", "hsl(280 70% 65%)", "hsl(280 65% 50%)"],
                        ["p-marketing", "hsl(38 95% 60%)", "hsl(38 92% 48%)"],
                        ["p-other", "hsl(190 85% 55%)", "hsl(190 80% 42%)"],
                        ["p-profit", "hsl(142 71% 55%)", "hsl(142 71% 38%)"],
                      ].map(([id, a, b]) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={a} />
                          <stop offset="100%" stopColor={b} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={[
                        { name: "Returns", value: Math.max(refunds, 0), fill: "url(#p-returns)" },
                        { name: "Delivery", value: Math.max(delivery, 0), fill: "url(#p-delivery)" },
                        { name: "Packaging", value: Math.max(packaging, 0), fill: "url(#p-packaging)" },
                        { name: "Marketing", value: Math.max(marketing, 0), fill: "url(#p-marketing)" },
                        { name: otherLabel || "Other", value: Math.max(otherAmount, 0), fill: "url(#p-other)" },
                        {
                          name: "Net Profit",
                          value: Math.max(netProfit, 0),
                          fill: "url(#p-profit)",
                        },
                      ].filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={55}
                      paddingAngle={3}
                      stroke="#ffffff"
                      strokeWidth={2}
                      label={(entry: { percent?: number }) =>
                        (entry.percent ?? 0) >= 0.05
                          ? `${((entry.percent ?? 0) * 100).toFixed(0)}%`
                          : ""
                      }
                      labelLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => [fmt(Number(v)), ""]}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.15)",
                        fontSize: 12,
                        padding: "8px 12px",
                      }}
                      labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {netProfit < 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Net Profit ({fmt(netProfit)}) negative হওয়ায় pie chart-এ দেখানো হয়নি।
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 5 — Profit Summary */}
        <Card>
          <CardHeader><CardTitle>Profit Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Total Sales Revenue" value={fmt(sales)} />
            <Row label="(-) Total Returns" value={fmt(refunds)} />
            <Row label="(-) Delivery Cost" value={fmt(delivery)} />
            <Row label="(-) Packaging Cost" value={fmt(packaging)} />
            <Row label="(-) Marketing Cost" value={fmt(marketing)} />
            <Row label={`(-) ${otherLabel || "Other"} Costs`} value={fmt(otherAmount)} />
            <div className="border-t my-3" />
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">✅ Net Profit</span>
              <span className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(netProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit Margin</span>
              <span className="font-medium">
                {margin === null ? "No sales data for this month" : `${margin.toFixed(1)} %`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
