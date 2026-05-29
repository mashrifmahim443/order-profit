import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Crown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Defaults (overridden at runtime from site_settings table managed by Super Admin)
const DEFAULT_BKASH_NUMBER = "01XXXXXXXXX";
const DEFAULT_NAGAD_NUMBER = "01XXXXXXXXX";
const DEFAULT_PRO_PRICE_BDT = 200;
const DEFAULT_BUSINESS_PRICE_BDT = 300;

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | OrderProfit" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("store_name, webhook_token")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error("Failed to load settings");
        setLoading(false);
        return;
      }

      // Self-heal: profile missing or token empty -> upsert with a fresh token
      if (!data || !data.webhook_token) {
        const newToken =
          globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        const { data: upserted, error: upsertErr } = await supabase
          .from("profiles")
          .upsert(
            { id: user.id, webhook_token: newToken },
            { onConflict: "id" }
          )
          .select("store_name, webhook_token")
          .maybeSingle();

        if (cancelled) return;
        if (upsertErr) {
          toast.error("Failed to initialize webhook URL");
          setLoading(false);
          return;
        }
        if (upserted) {
          setStoreName(upserted.store_name ?? "");
          setToken(upserted.webhook_token ?? "");
        }
      } else {
        setStoreName(data.store_name ?? "");
        setToken(data.webhook_token ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveStore = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ store_name: storeName.trim() || "My Store" })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Store settings saved");
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://YOUR_DOMAIN";
  const webhookUrl = token
    ? `${origin}/api/public/webhook/orders?token=${token}`
    : "";

  const copyUrl = async () => {
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
    <DashboardShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your store, webhook, and account.
          </p>
        </div>

        {/* Store */}
        <Card>
          <CardHeader><CardTitle>Store Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="store">Store Name</Label>
                  <Input
                    id="store"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="My Store"
                  />
                </div>
                <Button onClick={saveStore} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Webhook */}
        <Card>
          <CardHeader><CardTitle>Webhook Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input id="webhook-url" readOnly value={webhookUrl} className="font-mono text-xs" />
                    <Button variant="outline" onClick={copyUrl} type="button" aria-label="Copy Webhook URL">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
                  <p className="font-medium">Setup instructions</p>
                  <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                    <li>Go to WordPress Admin → WooCommerce → Settings → Advanced → Webhooks</li>
                    <li>Click "Add Webhook"</li>
                    <li>Name: <span className="font-medium text-foreground">OrderProfit Sync</span></li>
                    <li>Status: <span className="font-medium text-foreground">Active</span></li>
                    <li>Topic: <span className="font-medium text-foreground">Order updated</span></li>
                    <li>Delivery URL: paste the URL above</li>
                    <li>Click Save</li>
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <SubscriptionCard />

        {/* Account */}
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" readOnly value={user?.email ?? ""} />
            </div>
            <ChangePasswordDialog />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const submit = async () => {
    if (next.length < 6) return toast.error("Password must be at least 6 characters");
    if (next !== confirm) return toast.error("Passwords do not match");
    if (!user?.email) return toast.error("Not signed in");

    setLoading(true);
    // Verify current password by signing in again
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signErr) {
      setLoading(false);
      return toast.error("Current password is incorrect");
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setCurrent(""); setNext(""); setConfirm("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change Password</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and a new password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pw-current">Current Password</Label>
            <Input id="pw-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-new">New Password</Label>
            <Input id="pw-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-confirm">Confirm New Password</Label>
            <Input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Updating…" : "Update Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [latestRequest, setLatestRequest] = useState<{
    status: string;
    created_at: string;
    plan: string;
  } | null>(null);

  const [open, setOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<"pro" | "business">("pro");
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [bkashNumber, setBkashNumber] = useState(DEFAULT_BKASH_NUMBER);
  const [nagadNumber, setNagadNumber] = useState(DEFAULT_NAGAD_NUMBER);
  const [proPrice, setProPrice] = useState(DEFAULT_PRO_PRICE_BDT);
  const [businessPrice, setBusinessPrice] = useState(DEFAULT_BUSINESS_PRICE_BDT);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: reqs }, { data: settings }] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan, plan_expires_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("payment_requests")
        .select("status, created_at, plan")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("site_settings")
        .select("bkash_number, nagad_number, pro_price, business_price")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    if (prof) {
      setPlan(prof.plan ?? "free");
      setExpiresAt(prof.plan_expires_at ?? null);
    }
    if (settings) {
      setBkashNumber(settings.bkash_number);
      setNagadNumber(settings.nagad_number);
      setProPrice(Number(settings.pro_price));
      setBusinessPrice(Number(settings.business_price));
    }
    setLatestRequest(reqs?.[0] ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isPaid =
    (plan === "pro" || plan === "business") &&
    (!expiresAt || new Date(expiresAt) > new Date());
  const pendingRequest = latestRequest?.status === "pending";

  const planPrice = upgradePlan === "business" ? businessPrice : proPrice;
  const PRO_PRICE_BDT = proPrice;
  const BUSINESS_PRICE_BDT = businessPrice;
  const BKASH_NUMBER = bkashNumber;
  const NAGAD_NUMBER = nagadNumber;

  const submit = async () => {
    if (!user) return;
    if (!/^\d{11}$/.test(senderNumber.trim()))
      return toast.error("Enter a valid 11-digit phone number");
    if (txnId.trim().length < 4)
      return toast.error("Enter the transaction ID");

    setSubmitting(true);
    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      plan: upgradePlan,
      amount: planPrice,
      method,
      sender_number: senderNumber.trim(),
      transaction_id: txnId.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Payment submitted! We'll activate your plan within 24 hours.");
    setOpen(false);
    setSenderNumber("");
    setTxnId("");
    load();
  };

  const getPlanLabel = (p: string) => {
    if (p === "business") return "Business";
    if (p === "pro") return "Pro";
    return "Free";
  };

  const getPlanFeatures = (p: string) => {
    if (p === "business")
      return [
        "Up to 1,000 orders / month",
        "Everything in Pro",
        "Dedicated onboarding support",
        "Early access to new features",
        "Priority support",
      ];
    if (p === "pro")
      return [
        "Up to 500 orders / month",
        "WooCommerce auto-sync",
        "CSV exports (orders + repeat customers)",
        "Priority support",
      ];
    return ["Up to 50 orders / month", "Basic profit dashboard", "Manual cost entry"];
  };

  const getOrderLimit = (p: string) => {
    if (p === "business") return "1,000";
    if (p === "pro") return "500";
    return "50";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Current plan</p>
                  <Badge variant={isPaid ? "default" : "secondary"}>
                    {getPlanLabel(plan)}
                  </Badge>
                </div>
                {isPaid && expiresAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Renews / expires on{" "}
                    {new Date(expiresAt).toLocaleDateString()}
                  </p>
                )}
                {!isPaid && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Up to {getOrderLimit(plan)} orders / month
                  </p>
                )}
              </div>
              {!isPaid && !pendingRequest && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Sparkles className="h-4 w-4" /> Upgrade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upgrade your plan</DialogTitle>
                      <DialogDescription>
                        Choose a plan, send payment via bKash or Nagad, then submit the transaction ID. We'll activate within 24 hours.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Plan selection */}
                      <div className="space-y-1">
                        <Label>Select plan</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setUpgradePlan("pro")}
                            className={`rounded-lg border p-3 text-left transition ${
                              upgradePlan === "pro"
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-secondary/40"
                            }`}
                          >
                            <p className="text-sm font-semibold">Pro</p>
                            <p className="text-xs text-muted-foreground">৳ {PRO_PRICE_BDT} / month</p>
                            <p className="text-[11px] text-muted-foreground mt-1">500 orders / month</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpgradePlan("business")}
                            className={`rounded-lg border p-3 text-left transition ${
                              upgradePlan === "business"
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-secondary/40"
                            }`}
                          >
                            <p className="text-sm font-semibold">Business</p>
                            <p className="text-xs text-muted-foreground">৳ {BUSINESS_PRICE_BDT} / month</p>
                            <p className="text-[11px] text-muted-foreground mt-1">1,000 orders / month</p>
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg border bg-secondary/40 p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">bKash (Send Money)</span>
                          <span className="font-mono font-medium">{BKASH_NUMBER}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nagad (Send Money)</span>
                          <span className="font-mono font-medium">{NAGAD_NUMBER}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-semibold">৳ {planPrice}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Payment method</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={method === "bkash" ? "default" : "outline"}
                            onClick={() => setMethod("bkash")}
                            className="flex-1"
                          >
                            bKash
                          </Button>
                          <Button
                            type="button"
                            variant={method === "nagad" ? "default" : "outline"}
                            onClick={() => setMethod("nagad")}
                            className="flex-1"
                          >
                            Nagad
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="sender">Your {method === "bkash" ? "bKash" : "Nagad"} number</Label>
                        <Input
                          id="sender"
                          inputMode="numeric"
                          placeholder="01XXXXXXXXX"
                          value={senderNumber}
                          onChange={(e) => setSenderNumber(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="txn">Transaction ID</Label>
                        <Input
                          id="txn"
                          placeholder="e.g. 8N7A2K9XYZ"
                          value={txnId}
                          onChange={(e) => setTxnId(e.target.value)}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={submit} disabled={submitting}>
                        {submitting ? "Submitting…" : "Submit Payment"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {pendingRequest && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Your {getPlanLabel(latestRequest?.plan ?? "pro")} payment is being verified. It will be activated within 24 hours.
              </div>
            )}

            <ul className="text-sm space-y-2 text-muted-foreground">
              {getPlanFeatures(plan).map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
