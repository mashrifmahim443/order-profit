import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RefreshCw,
  BarChart3,
  Receipt,
  Plug,
  ShoppingCart,
  TrendingUp,
  Check,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrderProfit — WooCommerce Profit Tracker for BDT Stores" },
      {
        name: "description",
        content:
          "Connect WooCommerce, auto-sync orders, and see real monthly profit after delivery, packaging, marketing & return costs. Built for ৳ BDT stores.",
      },
      { property: "og:title", content: "OrderProfit — Real Profit Tracker" },
      {
        property: "og:description",
        content:
          "Auto-sync WooCommerce orders & calculate real profit in BDT. Free plan available.",
      },
      { property: "og:url", content: "https://revenue-wise-mate.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://revenue-wise-mate.lovable.app/" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: RefreshCw,
    title: "Auto Order Sync",
    desc: "WooCommerce orders flow into your dashboard in real-time via secure webhook.",
  },
  {
    icon: BarChart3,
    title: "Profit Reports",
    desc: "Pick any month and instantly see revenue, costs and net profit breakdown.",
  },
  {
    icon: Receipt,
    title: "Real Cost Tracking",
    desc: "Subtract delivery, packaging, marketing and return costs to know real profit.",
  },
  {
    icon: Shield,
    title: "Repeat Customer Alerts",
    desc: "Spot previously returned or cancelled customers before shipping again.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Optimized dashboard loads instantly, even with thousands of orders.",
  },
  {
    icon: Sparkles,
    title: "BDT-First",
    desc: "Built for Bangladeshi merchants — everything in ৳, bKash & Nagad billing.",
  },
];

const steps = [
  {
    icon: Plug,
    title: "Connect WordPress",
    desc: "Paste a webhook URL into WooCommerce settings — takes 2 minutes.",
  },
  {
    icon: ShoppingCart,
    title: "Orders Auto-Sync",
    desc: "Every new order streams in automatically. Nothing manual.",
  },
  {
    icon: TrendingUp,
    title: "See Real Profit",
    desc: "Get a clear ৳ profit number after every cost — no spreadsheets.",
  },
];

const plans = [
  {
    name: "Free",
    key: "free" as const,
    price: "৳ 0",
    period: "forever",
    desc: "Perfect for getting started",
    cta: "Start Free",
    highlight: false,
    features: [
      "Up to 50 orders / month",
      "Basic profit dashboard",
      "Manual cost entry",
      "Repeat customer alerts",
      "Community support",
    ],
  },
  {
    name: "Pro",
    key: "pro" as const,
    price: "৳ 200",
    period: "/ month",
    desc: "For growing WooCommerce stores",
    cta: "Order Pro Plan",
    highlight: true,
    features: [
      "Up to 500 orders / month",
      "Advanced profit analytics",
      "WooCommerce auto-sync",
      "Repeat & returned customer alerts",
      "Export to CSV (orders + repeat customers)",
      "Priority email support",
      "All future features included",
    ],
  },
  {
    name: "Business",
    key: "business" as const,
    price: "৳ 300",
    period: "/ month",
    desc: "For high-volume stores",
    cta: "Order Business Plan",
    highlight: false,
    features: [
      "Up to 1,000 orders / month",
      "Everything in Pro",
      "Dedicated onboarding support",
      "Early access to new features",
      "Export to CSV (orders + repeat customers)",
      "Priority email support",
      "All future features included",
    ],
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <nav
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
          aria-label="Main"
        >
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold shadow-sm">
              O
            </span>
            <span className="text-lg font-semibold tracking-tight">
              OrderProfit
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.08),_transparent_55%)]"
          />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-primary" />
              Built for WooCommerce · Prices in ৳ BDT
            </div>
            <h1 className="mt-7 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Track Every Order.
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Know Your Real Profit.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
              Auto-sync your WooCommerce store and see exactly how much you're
              earning each month — after delivery, packaging, marketing, and
              return costs.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="gap-2">
                <Link to="/signup">
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#pricing">See Pricing</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Free plan available
            </p>

            {/* Visual */}
            <div className="mt-16 mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
              <div className="grid grid-cols-3 gap-4 text-left">
                <div className="rounded-lg bg-secondary/60 p-4 border border-border">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="mt-1 text-xl font-bold">৳ 1,84,500</p>
                  <p className="mt-1 text-[10px] text-emerald-600">↑ 12% MoM</p>
                </div>
                <div className="rounded-lg bg-secondary/60 p-4 border border-border">
                  <p className="text-xs text-muted-foreground">Total Costs</p>
                  <p className="mt-1 text-xl font-bold">৳ 92,300</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">All-in</p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-primary to-blue-600 p-4 text-primary-foreground shadow-md">
                  <p className="text-xs opacity-90">Net Profit</p>
                  <p className="mt-1 text-xl font-bold">৳ 92,200</p>
                  <p className="mt-1 text-[10px] opacity-90">50% margin</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-secondary/30 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">Features</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
                Everything you need to measure profit
              </h2>
              <p className="mt-4 text-muted-foreground">
                Purpose-built for WooCommerce stores tracking real-world costs in ৳.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title} className="border-border transition hover:shadow-md hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {f.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">How it works</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
                Three steps to your first profit report
              </h2>
            </div>
            <ol className="mt-14 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li
                  key={s.title}
                  className="relative rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    Step {i + 1}
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border bg-secondary/30 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">Pricing</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
                Simple, honest pricing
              </h2>
              <p className="mt-4 text-muted-foreground">
                Start free. Upgrade to Pro when your store grows. Pay via bKash or Nagad.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {plans.map((p) => (
                <Card
                  key={p.name}
                  className={`relative border-border ${
                    p.highlight
                      ? "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary"
                      : ""
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
                      <span className="text-sm text-muted-foreground">{p.period}</span>
                    </div>
                    {p.key === "free" ? (
                      <Button
                        asChild
                        className="mt-6 w-full"
                        variant={p.highlight ? "default" : "outline"}
                        size="lg"
                      >
                        <Link to="/signup">{p.cta}</Link>
                      </Button>
                    ) : (
                      <PlanOrderButton
                        plan={p.key}
                        label={p.cta}
                        variant={p.highlight ? "default" : "outline"}
                      />
                    )}
                    <ul className="mt-7 space-y-3">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-3 text-sm">
                          <span
                            className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full ${
                              p.highlight
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="text-foreground/90">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Pro is billed monthly via bKash or Nagad · Cancel anytime
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-10 sm:p-14 text-center text-primary-foreground shadow-xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Ready to know your real profit?
              </h2>
              <p className="mt-4 text-primary-foreground/90 max-w-xl mx-auto">
                Join Bangladeshi WooCommerce merchants tracking every ৳ they earn.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" variant="secondary" asChild className="gap-2">
                  <Link to="/signup">
                    Start Free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-primary text-primary-foreground text-xs font-bold">
              O
            </span>
            <p className="text-sm text-muted-foreground">
              OrderProfit © 2025 — Track smarter, profit more
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            All amounts in ৳ (BDT)
          </p>
        </div>
      </footer>
    </div>
  );
}

function PlanOrderButton({
  plan,
  label,
  variant,
}: {
  plan: "pro" | "business";
  label: string;
  variant: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2) return toast.error("Enter your name");
    if (!/^\d{11}$/.test(phone.trim())) return toast.error("Enter a valid 11-digit phone");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error("Enter a valid email");
    if (website.trim().length < 4) return toast.error("Enter your website link");

    setSubmitting(true);
    const { error } = await supabase.from("plan_orders").insert({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      plan,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Request received! Admin will contact you to confirm payment.");
    setOpen(false);
    setName(""); setPhone(""); setEmail(""); setWebsite("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        className="mt-6 w-full"
        variant={variant}
        size="lg"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Order {plan === "pro" ? "Pro" : "Business"} Plan</DialogTitle>
          <DialogDescription>
            Fill in your details. Our admin will contact you to confirm payment via bKash or Nagad and activate your plan within 24 hours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="po-name">Full Name</Label>
            <Input id="po-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="po-phone">Phone Number</Label>
            <Input id="po-phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="po-email">Email</Label>
            <Input id="po-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="po-website">Website Link</Label>
            <Input id="po-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourstore.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
