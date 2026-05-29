import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Message {
  id: string;
  message: string;
  is_admin: boolean;
  user_id: string;
  created_at: string;
}

export function TicketThread({
  ticketId,
  asAdmin = false,
  disabled = false,
}: {
  ticketId: string;
  asAdmin?: boolean;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        setMessages((data ?? []) as Message[]);
      });
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      user_id: user.id,
      message: text.trim(),
      is_admin: asAdmin,
    });
    if (!error) {
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticketId);
    }
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
    load();
  };

  if (!messages) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-3">
      <div className="max-h-80 overflow-y-auto space-y-2 rounded-md border border-border bg-secondary/30 p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.is_admin ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                m.is_admin
                  ? "bg-primary text-primary-foreground"
                  : "bg-white border border-border"
              }`}
            >
              <p className="text-[10px] opacity-70 mb-0.5">
                {m.is_admin ? "Support" : "You"} · {new Date(m.created_at).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      {!disabled && (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a reply…"
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-end">
            <Button onClick={send} disabled={sending || !text.trim()}>
              {sending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
