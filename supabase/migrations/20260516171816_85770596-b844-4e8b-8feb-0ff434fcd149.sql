CREATE TABLE public.monthly_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  delivery_cost numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  marketing_cost numeric NOT NULL DEFAULT 0,
  other_cost_label text NOT NULL DEFAULT 'Other',
  other_cost_amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, year)
);

ALTER TABLE public.monthly_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly costs" ON public.monthly_costs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own monthly costs" ON public.monthly_costs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own monthly costs" ON public.monthly_costs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own monthly costs" ON public.monthly_costs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);