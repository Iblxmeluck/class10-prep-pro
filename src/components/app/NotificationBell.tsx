import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function NotificationBell() {
  const { data: session } = useSessionInfo();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reads = useQuery({
    queryKey: ["notification-reads", session?.userId],
    enabled: !!session?.userId,
    queryFn: async () =>
      (await supabase.from("notification_reads").select("notification_id")).data ?? [],
  });

  const readIds = new Set((reads.data ?? []).map((r) => r.notification_id));
  const unread = (notifications.data ?? []).filter((n) => !readIds.has(n.id)).length;

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .insert({ title, body, created_by: session?.userId ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      toast.success("Notification sent to all members");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  async function markAllRead() {
    const unreadOnes = (notifications.data ?? []).filter((n) => !readIds.has(n.id));
    if (!unreadOnes.length || !session?.userId) return;
    await supabase
      .from("notification_reads")
      .insert(unreadOnes.map((n) => ({ notification_id: n.id, user_id: session.userId })));
    qc.invalidateQueries({ queryKey: ["notification-reads"] });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        onClick={() => {
          setOpen(true);
          void markAllRead();
        }}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>

          {session?.isAdmin && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="notif-title">Title</Label>
                <Input
                  id="notif-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="New test uploaded"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notif-body">Message</Label>
                <Textarea
                  id="notif-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Details for all members…"
                  rows={3}
                />
              </div>
              <Button
                className="w-full"
                disabled={!title.trim() || send.isPending}
                onClick={() => send.mutate()}
              >
                <Send className="mr-2 h-4 w-4" />
                Send to all members
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {(notifications.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}
            {(notifications.data ?? []).map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {session?.isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete notification"
                      onClick={() => remove.mutate(n.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
