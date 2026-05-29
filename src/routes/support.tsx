import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TicketThread } from "@/components/ticket-thread";
import { toast } from "sonner";
import { LifeBuoy, Plus, XCircle } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [{ title: "Support | OrderProfit" }],
  }),
  component: SupportPage,
});

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function SupportPage() {
  const { user, loading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    if (!user) return;
    supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        setTickets((data ?? []) as Ticket[]);
      });
  };

  useEffect(() => {
    if (!loading && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const createTicket = async () => {
    if (!user) return toast.error("Please sign in first");
    if (!subject.trim()) return toast.error("Please enter a subject");
    if (!message.trim()) return toast.error("Please write a message");
    setCreating(true);
    const { data: t, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, subject: subject.trim() })
      .select()
      .single();
    if (error || !t) {
      setCreating(false);
      return toast.error(error?.message ?? "Failed to create ticket");
    }
    const { error: mErr } = await supabase.from("ticket_messages").insert({
      ticket_id: t.id,
      user_id: user.id,
      message: message.trim(),
      is_admin: false,
    });
    setCreating(false);
    if (mErr) return toast.error(mErr.message);
    toast.success("Ticket opened");
    setSubject("");
    setMessage("");
    load();
  };

  const closeTicket = async (ticketId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "closed" })
      .eq("id", ticketId)
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Ticket closed");
    load();
    setSelected((prev) => (prev && prev.id === ticketId ? { ...prev, status: "closed" } : prev));
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Open a new ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                maxLength={150}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                maxLength={2000}
                rows={4}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail…"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={createTicket}
                disabled={creating}
              >
                {creating ? "Submitting…" : "Submit ticket"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Your tickets</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!tickets && <Skeleton className="h-32 w-full" />}
              {tickets && tickets.length === 0 && (
                <p className="text-sm text-muted-foreground">No tickets yet.</p>
              )}
              {tickets?.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    selected?.id === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Updated {new Date(t.updated_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {selected ? selected.subject : "Select a ticket"}
                </CardTitle>
                {selected && selected.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeTicket(selected.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Close ticket
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selected ? (
                <TicketThread ticketId={selected.id} disabled={selected.status === "closed"} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pick a ticket from the list to view the conversation.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
