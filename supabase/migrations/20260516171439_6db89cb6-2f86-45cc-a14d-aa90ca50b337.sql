
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  customer_name text,
  customer_phone text,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  order_total numeric NOT NULL DEFAULT 0,
  order_status text NOT NULL DEFAULT 'processing',
  order_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_date ON public.orders (user_id, order_date DESC);
CREATE INDEX idx_orders_user_status ON public.orders (user_id, order_status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
  ON public.orders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
