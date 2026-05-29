import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function mapStatus(s: unknown): string {
  const v = String(s ?? "").toLowerCase();
  if (v === "completed" || v === "refunded" || v === "cancelled" || v === "processing") return v;
  return "processing";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/webhook/orders")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const token = url.searchParams.get("token");
          if (!token) return json({ error: "Missing token" }, 401);

          // Read the body first. WooCommerce sends a "ping" (empty body or
          // webhook_id only) when saving the webhook, with a strict 2s timeout.
          // Respond instantly to ping BEFORE any DB work to avoid cURL timeout.
          let payload: any = {};
          try {
            const text = await request.text();
            if (text.trim()) payload = JSON.parse(text);
          } catch (e) {
            return json({ success: true, ignored: true, reason: "non_json_payload" });
          }

          const orderIdRaw = payload.id ?? payload.order_id;
          if (orderIdRaw === undefined || orderIdRaw === null) {
            return json({ success: true, ping: true });
          }

          const { data: profile, error: pErr } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("webhook_token", token)
            .maybeSingle();

          if (pErr || !profile) return json({ error: "Unauthorized" }, 401);

          // WooCommerce sends the event type in this header
          // (e.g. "order.created", "order.updated", "order.deleted").
          const topic = (request.headers.get("x-wc-webhook-topic") ?? "").toLowerCase();
          const rawStatus = String(payload.status ?? "").toLowerCase();
          const isDelete =
            topic === "order.deleted" ||
            rawStatus === "trash" ||
            payload.deleted === true;

          // WooCommerce Checkout Block creates temporary draft orders with
          // their own order_id as soon as a customer opens the checkout page.
          // These are NOT real orders — they get abandoned and a separate
          // real order is created on place-order. Ignore them so they don't
          // show up as duplicates in the dashboard.
          const IGNORED_STATUSES = new Set([
            "checkout-draft",
            "auto-draft",
            "draft",
            "pending",
            "failed",
          ]);
          if (!isDelete && IGNORED_STATUSES.has(rawStatus)) {
            return json({ success: true, ignored: true, reason: `status_${rawStatus}` });
          }

          // Idempotency key based on order_id + action. If the same webhook
          // (or another webhook for the same order+action) was already
          // processed, short-circuit to prevent duplicate work.
          const action = isDelete ? "delete" : `upsert:${rawStatus || "unknown"}`;
          const idempotencyKey = `order:${String(orderIdRaw)}:${action}`;

          const { error: idemErr } = await supabaseAdmin
            .from("webhook_deliveries")
            .insert({ user_id: profile.id, idempotency_key: idempotencyKey });

          if (idemErr) {
            // Unique violation = already processed. Return success so
            // WooCommerce doesn't retry.
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
      },
    },
  },
});
