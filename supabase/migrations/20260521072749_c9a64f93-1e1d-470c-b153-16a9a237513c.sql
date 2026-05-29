CREATE TABLE public.plan_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  website text,
  plan text NOT NULL DEFAULT 'pro',
  status text NOT NULL DEFAULT 'pending',
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit plan orders"
ON public.plan_orders FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins view plan orders"
ON public.plan_orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update plan orders"
ON public.plan_orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete plan orders"
ON public.plan_orders FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));