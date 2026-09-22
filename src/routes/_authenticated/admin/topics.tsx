import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/topics")({
  head: () => ({
    meta: [
      { title: "Topics — CBSE 10 Prep Admin" },
      { name: "description", content: "Create and manage the topics students see in the Topic Learning Hub." },
      { property: "og:title", content: "Topics — CBSE 10 Prep Admin" },
      { property: "og:description", content: "Organise topics under each chapter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopicsAdmin,
});

function TopicsAdmin() {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name").eq("subject_id", subjectId).order("sort_order")).data ?? [],
  });
  const topics = useQuery({
    queryKey: ["admin-topics", chapterId],
    enabled: !!chapterId,
    queryFn: async () =>
      (await supabase.from("topics").select("id, name, sort_order").eq("chapter_id", chapterId).order("sort_order"))
        .data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-topics", chapterId] });
  const fail = (e: Error) => toast.error(e.message);

  const add = useMutation({
    mutationFn: async () => {
      if (!chapterId) throw new Error("Pick a chapter first");
      if (!name.trim()) throw new Error("Give the topic a name");
      const next = ((topics.data ?? []).reduce((m, t) => Math.max(m, t.sort_order), 0) || 0) + 1;
      const { error } = await supabase
        .from("topics")
        .insert({ chapter_id: chapterId, name: name.trim(), sort_order: next });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setName("");
      toast.success("Topic added");
      void refresh();
    },
    onError: fail,
  });

  const rename = useMutation({
    mutationFn: async (v: { id: string; name: string }) => {
      if (!v.name.trim()) throw new Error("Name cannot be empty");
      const { error } = await supabase.from("topics").update({ name: v.name.trim() }).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Topic renamed");
      void refresh();
    },
    onError: fail,
  });

  const move = useMutation({
    mutationFn: async (v: { id: string; dir: -1 | 1 }) => {
      const list = topics.data ?? [];
      const i = list.findIndex((t) => t.id === v.id);
      const j = i + v.dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      const a = list[i]!;
      const b = list[j]!;
      await supabase.from("topics").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("topics").update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: () => void refresh(),
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Topic removed — its resources stay in place");
      void refresh();
    },
    onError: fail,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Topics</h1>
        <p className="text-sm text-muted-foreground">
          Topics power the Topic Learning Hub. Link resources to a topic from each content page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose a chapter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                setChapterId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Chapter</Label>
            <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                {(chapters.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-name">New topic</Label>
            <div className="flex gap-2">
              <Input
                id="topic-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Life Processes"
                disabled={!chapterId}
              />
              <Button onClick={() => add.mutate()} disabled={!chapterId || add.isPending}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {chapterId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topics in this chapter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topics.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !(topics.data ?? []).length ? (
              <p className="text-sm text-muted-foreground">No topics yet for this chapter.</p>
            ) : (
              (topics.data ?? []).map((t, i) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  {editing?.id === t.id ? (
                    <>
                      <Input
                        className="max-w-xs"
                        value={editing.name}
                        onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                      />
                      <Button size="icon" variant="ghost" aria-label="Save" onClick={() => rename.mutate(editing)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Cancel" onClick={() => setEditing(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{t.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Move up"
                        disabled={i === 0}
                        onClick={() => move.mutate({ id: t.id, dir: -1 })}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Move down"
                        disabled={i === (topics.data ?? []).length - 1}
                        onClick={() => move.mutate({ id: t.id, dir: 1 })}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Rename"
                        onClick={() => setEditing({ id: t.id, name: t.name })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete topic"
                        onClick={() => remove.mutate(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
