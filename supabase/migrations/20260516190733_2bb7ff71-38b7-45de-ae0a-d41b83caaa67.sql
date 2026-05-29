CREATE TABLE public.webhook_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (server) can access. Users have no access.