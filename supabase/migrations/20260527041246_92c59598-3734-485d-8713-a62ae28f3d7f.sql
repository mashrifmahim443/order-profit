
-- Fix 1: Prevent privilege escalation via is_admin on ticket_messages
DROP POLICY IF EXISTS "Post messages on accessible tickets" ON public.ticket_messages;
CREATE POLICY "Post messages on accessible tickets"
ON public.ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      is_admin = false
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()
      )
    )
  )
);

-- Fix 2: Add owner/admin SELECT policy on webhook_deliveries
CREATE POLICY "Owners and admins view webhook deliveries"
ON public.webhook_deliveries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Tighten plan_orders insert policy - require authentication and validate inputs
DROP POLICY IF EXISTS "Anyone can submit plan orders" ON public.plan_orders;
CREATE POLICY "Authenticated users submit plan orders"
ON public.plan_orders
FOR INSERT
TO authenticated
WITH CHECK (
  length(name) BETWEEN 1 AND 200
  AND length(phone) BETWEEN 1 AND 50
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (website IS NULL OR length(website) <= 500)
  AND plan IN ('pro','business')
);

-- Fix 4: Revoke EXECUTE on SECURITY DEFINER function from anon/authenticated
-- RLS-internal calls still work because policies execute as definer
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
