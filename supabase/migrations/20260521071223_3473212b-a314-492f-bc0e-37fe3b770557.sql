
-- 1. Add blocked column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

-- 2. Site settings (singleton)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  bkash_number text NOT NULL DEFAULT '01XXXXXXXXX',
  nagad_number text NOT NULL DEFAULT '01XXXXXXXXX',
  pro_price numeric NOT NULL DEFAULT 200,
  business_price numeric NOT NULL DEFAULT 300,
  free_order_limit integer NOT NULL DEFAULT 50,
  pro_order_limit integer NOT NULL DEFAULT 500,
  business_order_limit integer NOT NULL DEFAULT 1000,
  hero_title text NOT NULL DEFAULT 'Real profit. Real time.',
  hero_subtitle text NOT NULL DEFAULT 'Sync WooCommerce orders, subtract real costs, see actual profit instantly.',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins update site settings" ON public.site_settings;
CREATE POLICY "Admins update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Admin policies on profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Admin policies on orders
DROP POLICY IF EXISTS "Admins view all orders" ON public.orders;
CREATE POLICY "Admins view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 5. Admin policies on monthly_costs
DROP POLICY IF EXISTS "Admins view all monthly costs" ON public.monthly_costs;
CREATE POLICY "Admins view all monthly costs"
  ON public.monthly_costs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 6. Admin stats RPC: users with order counts
CREATE OR REPLACE FUNCTION public.admin_user_stats()
RETURNS TABLE (
  user_id uuid,
  store_name text,
  plan text,
  plan_expires_at timestamptz,
  blocked boolean,
  created_at timestamptz,
  total_orders bigint,
  orders_this_month bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.store_name,
    p.plan,
    p.plan_expires_at,
    p.blocked,
    p.created_at,
    COALESCE(o.total, 0)::bigint,
    COALESCE(o.this_month, 0)::bigint
  FROM public.profiles p
  LEFT JOIN (
    SELECT
      user_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (
        WHERE COALESCE(order_date, created_at) >= date_trunc('month', now())
      ) AS this_month
    FROM public.orders
    GROUP BY user_id
  ) o ON o.user_id = p.id
  WHERE has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

-- 7. Platform stats
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS TABLE (
  total_users bigint,
  paid_users bigint,
  blocked_users bigint,
  orders_this_month bigint,
  pending_payments bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE has_role(auth.uid(), 'admin')),
    (SELECT COUNT(*) FROM public.profiles WHERE has_role(auth.uid(), 'admin') AND plan IN ('pro','business') AND (plan_expires_at IS NULL OR plan_expires_at > now())),
    (SELECT COUNT(*) FROM public.profiles WHERE has_role(auth.uid(), 'admin') AND blocked = true),
    (SELECT COUNT(*) FROM public.orders WHERE has_role(auth.uid(), 'admin') AND COALESCE(order_date, created_at) >= date_trunc('month', now())),
    (SELECT COUNT(*) FROM public.payment_requests WHERE has_role(auth.uid(), 'admin') AND status = 'pending');
$$;
