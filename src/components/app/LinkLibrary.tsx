import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Lock, Trash2, Plus } from "lucide-react";
import { Link as RouterLink } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopicSelect } from "@/components/app/TopicSelect";

export function youtubeEmbed(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/) ?? null;
  return m?.[1] ? `https://www.youtube.com/embed/${m[1]}` : null;
}

type Props = {
  kind: "note" | "video";
  addTitle: string;
  emptyText: string;
  placeholder: string;
  /** When set, only links tagged with this topic are listed (Topic Learning Hub). */
  topicId?: string | undefined;
};

export function LinkLibrary({ kind, addTitle, emptyText, placeholder, topicId: topicFilter }: Props) {
  const qc = useQueryClient();
  const { data: session } = useSessionInfo();
  const isAdmin = Boolean(session?.isAdmin);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("none");
  const [chapterId, setChapterId] = useState("none");
  const [topicId, setTopicId] = useState("none");
  const [filterSubject, setFilterSubject] = useState("none");
  const [filterChapter, setFilterChapter] = useState("none");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters-flat"],
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name, subject_id").order("sort_order")).data ?? [],
  });

  const links = useQuery({
    queryKey: ["links", kind, topicFilter ?? "all", filterSubject, filterChapter],
    queryFn: async () => {
      let q = supabase
        .from("links")
        .select("id, title, url, description, created_at, subjects(name), chapters(name), topics(name)")
        .eq("kind", kind)
        .order("created_at", { ascending: false });
      if (topicFilter) q = q.eq("topic_id", topicFilter);
      if (filterSubject !== "none") q = q.eq("subject_id", filterSubject);
      if (filterChapter !== "none") q = q.eq("chapter_id", filterChapter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Items an admin put in the EXP Store, plus what this member already unlocked. */
  const locks = useQuery({
    queryKey: ["link-locks"],
    queryFn: async () => {
      const [items, purchases] = await Promise.all([
        supabase.from("store_items").select("id, link_id, course_id, exp_price").eq("is_active", true),
        supabase.from("store_purchases").select("item_id"),
      ]);
      const owned = new Set((purchases.data ?? []).map((p) => p.item_id));
      const map = new Map<string, number>();
      const lockedCourses = new Map<string, number>();
      for (const i of items.data ?? []) {
        if (owned.has(i.id)) continue;
        if (i.link_id) map.set(i.link_id, i.exp_price);
        if (i.course_id) lockedCourses.set(i.course_id, i.exp_price);
      }
      // Videos that belong to a locked course stay locked here too.
      if (lockedCourses.size) {
        const { data: ls } = await supabase
          .from("course_lessons")
          .select("course_id, link_id")
          .in("course_id", [...lockedCourses.keys()]);
        for (const l of ls ?? []) {
          if (l.link_id && !map.has(l.link_id)) map.set(l.link_id, lockedCourses.get(l.course_id) ?? 0);
        }
      }
      return map;
    },
  });
  const lockedPrice = (id: string) => (isAdmin ? undefined : locks.data?.get(id));

  const add = useMutation({
    mutationFn: async () => {
      const clean = url.trim();
      if (!/^https?:\/\//i.test(clean)) throw new Error("Please paste a full link starting with https://");
      if (!title.trim()) throw new Error("Give it a title");
      const { error } = await supabase.from("links").insert({
        kind,
        title: title.trim(),
        url: clean,
        description: description.trim(),
        subject_id: subjectId === "none" ? null : subjectId,
        chapter_id: chapterId === "none" ? null : chapterId,
        topic_id: topicId === "none" ? null : topicId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Link added");
      setTitle("");
      setUrl("");
      setDescription("");
      void qc.invalidateQueries({ queryKey: ["links", kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("links").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Removed");
      void qc.invalidateQueries({ queryKey: ["links", kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visibleChapters = (chapters.data ?? []).filter((c) => subjectId === "none" || c.subject_id === subjectId);
  const filterChapters = (chapters.data ?? []).filter(
    (c) => filterSubject === "none" || c.subject_id === filterSubject,
  );

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> {addTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1 — full notes" />
            </div>
            <div className="space-y-1.5">
              <Label>Link</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={placeholder} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={subjectId}
                onValueChange={(v) => {
                  setSubjectId(v);
                  setChapterId("none");
                  setTopicId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All subjects</SelectItem>
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
              <Select
                value={chapterId}
                onValueChange={(v) => {
                  setChapterId(v);
                  setTopicId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All chapters</SelectItem>
                  {visibleChapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TopicSelect chapterId={chapterId === "none" ? null : chapterId} value={topicId} onChange={setTopicId} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                {add.isPending ? "Saving…" : "Add link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select
            value={filterSubject}
            onValueChange={(v) => {
              setFilterSubject(v);
              setFilterChapter("none");
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All subjects</SelectItem>
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
          <Select value={filterChapter} onValueChange={setFilterChapter} disabled={filterSubject === "none"}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All chapters</SelectItem>
              {filterChapters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterSubject !== "none" || filterChapter !== "none") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterSubject("none");
              setFilterChapter("none");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {links.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !links.data?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">{emptyText}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {links.data.map((l) => {
            const price = lockedPrice(l.id);
            const isLocked = price !== undefined;
            const embed = kind === "video" && !isLocked ? youtubeEmbed(l.url) : null;
            return (
              <Card key={l.id} className="overflow-hidden">
                {embed && (
                  <div className="aspect-video w-full bg-muted">
                    <iframe
                      src={embed}
                      title={l.title}
                      className="h-full w-full"
                      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{l.title}</p>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {l.description && <p className="text-sm text-muted-foreground">{l.description}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    {l.subjects?.name && <Badge variant="secondary">{l.subjects.name}</Badge>}
                    {l.chapters?.name && <Badge variant="outline">{l.chapters.name}</Badge>}
                    {l.topics?.name && <Badge variant="outline">{l.topics.name}</Badge>}
                    {isLocked && (
                      <Badge className="gap-1">
                        <Lock className="h-3 w-3" /> {price} EXP
                      </Badge>
                    )}
                  </div>
                  {isLocked ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3">
                      <p className="flex-1 text-sm text-muted-foreground">
                        Locked — unlock this in the EXP Store for {price} EXP.
                      </p>
                      <Button asChild size="sm">
                        <RouterLink to="/store">Unlock</RouterLink>
                      </Button>
                    </div>
                  ) : (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Open link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
