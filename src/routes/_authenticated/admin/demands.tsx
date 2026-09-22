import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/demands")({
  head: () => ({
    meta: [
      { title: "Demands — CBSE 10 Prep" },
      { name: "description", content: "Student requests for notes, quizzes, questions and videos." },
      { property: "og:title", content: "Demands — CBSE 10 Prep" },
      { property: "og:description", content: "Review and resolve what your students are asking for." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemandsPage,
});

const STATUSES = ["open", "in_progress", "done"] as const;

function DemandsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]>("open");

  const demands = useQuery({
    queryKey: ["admin-demands", filter],
    queryFn: async () => {
      let q = supabase
        .from("demands")
        .select("id, want, details, status, created_at, user_id, subjects(name), chapters(name)")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const profiles = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name");
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("demands").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-demands"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameOf = (userId: string) => {
    const p = (profiles.data ?? []).find((x) => x.id === userId);
    return p?.display_name || p?.username || "Member";
  };

  const list = demands.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Demands</h1>
        <p className="text-sm text-muted-foreground">
          What your students are asking for — notes, quizzes, questions, videos and more.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["open", "in_progress", "done", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "in_progress" ? "In progress" : f[0]!.toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{list.length} demand{list.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {demands.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!demands.isLoading && list.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          )}
          {list.map((d) => {
            const subject = (d as { subjects?: { name?: string } | null }).subjects?.name;
            const chapter = (d as { chapters?: { name?: string } | null }).chapters?.name;
            return (
              <div key={d.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{d.want}</span>
                  <Badge variant={d.status === "done" ? "default" : "secondary"}>
                    {d.status === "in_progress" ? "in progress" : d.status}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {nameOf(d.user_id)}
                  {subject ? ` • ${subject}` : ""}
                  {chapter ? ` • ${chapter}` : ""}
                </p>
                {d.details && <p className="text-sm">{d.details}</p>}
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== d.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: d.id, status: s })}
                    >
                      Mark {s === "in_progress" ? "in progress" : s}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
