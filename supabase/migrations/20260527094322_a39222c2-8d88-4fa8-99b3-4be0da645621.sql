
CREATE TABLE public.customer_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, customer_phone)
);

CREATE INDEX idx_customer_blacklist_user_phone ON public.customer_blacklist(user_id, customer_phone);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_blacklist TO authenticated;
GRANT ALL ON public.customer_blacklist TO service_role;

ALTER TABLE public.customer_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own blacklist"
ON public.customer_blacklist FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own blacklist"
ON public.customer_blacklist FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own blacklist"
ON public.customer_blacklist FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own blacklist"
ON public.customer_blacklist FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all blacklist"
ON public.customer_blacklist FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));
