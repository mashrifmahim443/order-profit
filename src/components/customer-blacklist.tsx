import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Trash2, Plus, Inbox } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface BlacklistEntry {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  customer_email: string | null;
  reason: string | null;
  created_at: string;
}

export function CustomerBlacklist() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_blacklist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load blacklist");
    setEntries((data as BlacklistEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addEntry = async () => {
    if (!user) return;
    const p = phone.trim();
    if (!p) {
      toast.error("Phone is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("customer_blacklist").insert({
      user_id: user.id,
      customer_phone: p,
      customer_name: name.trim() || null,
      customer_email: email.trim() || null,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Customer already blacklisted");
      else toast.error("Failed to add to blacklist");
      return;
    }
    toast.success("Customer blacklisted");
    setOpen(false);
    setPhone("");
    setName("");
    setEmail("");
    setReason("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("customer_blacklist").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
      return;
    }
    setEntries((list) => list.filter((e) => e.id !== id));
    toast.success("Removed from blacklist");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Customer Blacklist
          </h1>
          <p className="text-sm text-muted-foreground">
            Block risky customers. Blacklisted phone numbers will be flagged in your orders.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Blacklist a customer</DialogTitle>
              <DialogDescription>
                Add a risky customer. They will be flagged in your orders list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="bl-phone">Phone *</Label>
                <Input id="bl-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <Label htmlFor="bl-name">Name</Label>
                <Input id="bl-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bl-email">Email</Label>
                <Input id="bl-email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bl-reason">Reason</Label>
                <Input id="bl-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fake orders, repeated cancellations" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addEntry} disabled={saving}>
                {saving ? "Saving…" : "Add to Blacklist"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="h-6 w-6" />
                        No blacklisted customers yet.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.customer_phone}</TableCell>
                      <TableCell>{e.customer_name ?? "—"}</TableCell>
                      <TableCell>{e.customer_email ?? "—"}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{e.reason ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => remove(e.id)}
                          aria-label="Remove from blacklist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
