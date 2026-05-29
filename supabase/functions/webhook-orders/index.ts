import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function mapStatus(s: unknown): string {
  const v = String(s ?? "").toLowerCase();
  if (v === "completed" || v === "refunded" || v === "cancelled" || v === "processing") return v;
  return "processing";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "Missing token" }, 401);

    let payload: any = {};
    try {
      const text = await req.text();
      if (text.trim()) payload = JSON.parse(text);
    } catch {
      return json({ success: true, ignored: true, reason: "non_json_payload" });
    }

    const orderIdRaw = payload.id ?? payload.order_id;
    if (orderIdRaw === undefined || orderIdRaw === null) {
      return json({ success: true, ping: true });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("webhook_token", token)
      .maybeSingle();

    if (pErr || !profile) return json({ error: "Unauthorized" }, 401);

    const topic = (req.headers.get("x-wc-webhook-topic") ?? "").toLowerCase();
    const rawStatus = String(payload.status ?? "").toLowerCase();
    const isDelete =
      topic === "order.deleted" ||
      rawStatus === "trash" ||
      payload.deleted === true;

    const IGNORED_STATUSES = new Set(["checkout-draft", "auto-draft", "draft", "pending", "failed"]);
    if (!isDelete && IGNORED_STATUSES.has(rawStatus)) {
      return json({ success: true, ignored: true, reason: `status_${rawStatus}` });
    }

    const action = isDelete ? "delete" : `upsert:${rawStatus || "unknown"}`;
    const idempotencyKey = `order:${String(orderIdRaw)}:${action}`;

    const { error: idemErr } = await supabaseAdmin
      .from("webhook_deliveries")
      .insert({ user_id: profile.id, idempotency_key: idempotencyKey });

    if (idemErr) {
      if ((idemErr as any).code === "23505") {
        return json({ success: true, duplicate: true, idempotencyKey });
      }
      console.error("Webhook idempotency error:", idemErr);
      return json({ error: idemErr.message }, 500);
    }

    if (isDelete) {
      const { error: delErr } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("user_id", profile.id)
        .eq("order_id", String(orderIdRaw));

      if (delErr) {
        console.error("Webhook delete error:", delErr);
        return json({ error: delErr.message }, 500);
      }
      return json({ success: true, deleted: true });
    }

    const billing = payload.billing ?? {};
    const lineItem = Array.isArray(payload.line_items) ? payload.line_items[0] : undefined;
    const customerName = `${billing.first_name ?? ""} ${billing.last_name ?? ""}`.trim();

    const row = {
      user_id: profile.id,
      order_id: String(orderIdRaw),
      customer_name: customerName || null,
      customer_phone: billing.phone ?? null,
      customer_email: billing.email ?? null,
      product_name: lineItem?.name ?? null,
      quantity: Number(lineItem?.quantity ?? 1),
      order_total: parseFloat(String(payload.total ?? "0")) || 0,
      order_status: mapStatus(payload.status),
      order_date: payload.date_created ? new Date(payload.date_created).toISOString() : null,
    };

    const { error: upErr } = await supabaseAdmin
      .from("orders")
      .upsert(row, { onConflict: "user_id,order_id" });

    if (upErr) {
      console.error("Webhook upsert error:", upErr);
      return json({ error: upErr.message }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
