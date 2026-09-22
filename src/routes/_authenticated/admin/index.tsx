import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Content Admin — CBSE 10 Prep" },
      { name: "description", content: "Manage CBSE Class 10 subjects, chapters and topics." },
      { property: "og:title", content: "Content Admin — CBSE 10 Prep" },
      { property: "og:description", content: "Create and organise the syllabus structure." },
    ],
  }),
  component: ContentAdmin,
});

function ContentAdmin() {
  const qc = useQueryClient();
  const [subjectName, setSubjectName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [chapterSubject, setChapterSubject] = useState("");
  const [topicName, setTopicName] = useState("");
  const [topicChapter, setTopicChapter] = useState("");

  const subjects = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, sort_order").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const chapters = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, name, subject_id, sort_order, subjects(name)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const topics = useQuery({
    queryKey: ["admin-topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("id, name, chapter_id, chapters(name)").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-subjects"] });
    qc.invalidateQueries({ queryKey: ["admin-chapters"] });
    qc.invalidateQueries({ queryKey: ["admin-topics"] });
  };

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subjects")
        .insert({ name: subjectName.trim(), sort_order: (subjects.data?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubjectName("");
      toast.success("Subject added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addChapter = useMutation({
    mutationFn: async () => {
      if (!chapterSubject) throw new Error("Pick a subject first");
      const { error } = await supabase.from("chapters").insert({
        name: chapterName.trim(),
        subject_id: chapterSubject,
        sort_order: (chapters.data?.filter((c) => c.subject_id === chapterSubject).length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setChapterName("");
      toast.success("Chapter added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTopic = useMutation({
    mutationFn: async () => {
      if (!topicChapter) throw new Error("Pick a chapter first");
      const { error } = await supabase.from("topics").insert({ name: topicName.trim(), chapter_id: topicChapter });
      if (error) throw error;
    },
    onSuccess: () => {
      setTopicName("");
      toast.success("Topic added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async ({ table, id }: { table: "subjects" | "chapters" | "topics"; id: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subjects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">New subject</Label>
            <div className="flex gap-2">
              <Input id="subject" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Science" />
              <Button onClick={() => addSubject.mutate()} disabled={!subjectName.trim() || addSubject.isPending}>
                Add
              </Button>
            </div>
          </div>
          <ul className="space-y-1">
            {(subjects.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                {s.name}
                <Button size="icon" variant="ghost" onClick={() => remove.mutate({ table: "subjects", id: s.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chapters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={chapterSubject} onValueChange={setChapterSubject}>
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
            <div className="flex gap-2">
              <Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="Chemical Reactions" />
              <Button onClick={() => addChapter.mutate()} disabled={!chapterName.trim() || addChapter.isPending}>
                Add
              </Button>
            </div>
          </div>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {(chapters.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>
                  {c.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {(c as { subjects?: { name?: string } | null }).subjects?.name}
                  </span>
                </span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate({ table: "chapters", id: c.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chapter</Label>
            <Select value={topicChapter} onValueChange={setTopicChapter}>
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
            <div className="flex gap-2">
              <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Balancing equations" />
              <Button onClick={() => addTopic.mutate()} disabled={!topicName.trim() || addTopic.isPending}>
                Add
              </Button>
            </div>
          </div>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {(topics.data ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>
                  {t.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {(t as { chapters?: { name?: string } | null }).chapters?.name}
                  </span>
                </span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate({ table: "topics", id: t.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
