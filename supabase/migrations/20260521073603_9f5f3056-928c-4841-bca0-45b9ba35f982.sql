
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- support_tickets policies
CREATE POLICY "Users view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins delete tickets" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ticket_messages policies
CREATE POLICY "View messages of accessible tickets" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Post messages on accessible tickets" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
  );

CREATE POLICY "Admins delete messages" ON public.ticket_messages
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
