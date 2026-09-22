import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopicSelect } from "@/components/app/TopicSelect";

export const Route = createFileRoute("/_authenticated/admin/quizzes")({
  head: () => ({
    meta: [
      { title: "Quiz Builder — CBSE 10 Prep" },
      { name: "description", content: "Create chapter-wise timed quizzes from the CBSE Class 10 question bank." },
      { property: "og:title", content: "Quiz Builder — CBSE 10 Prep" },
      { property: "og:description", content: "Build and publish chapter-wise timed quizzes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizBuilder,
});

function QuizBuilder() {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("none");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(15);
  const [picked, setPicked] = useState<string[]>([]);

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
  const questions = useQuery({
    queryKey: ["quiz-pool", chapterId],
    enabled: !!chapterId,
    queryFn: async () =>
      (
        await supabase
          .from("questions")
          .select("id, question_text, qtype, difficulty, marks")
          .eq("chapter_id", chapterId)
          .eq("status", "published")
          .order("created_at")
      ).data ?? [],
  });
  // Questions already placed in a quiz for this chapter, so they are not offered twice.
  const used = useQuery({
    queryKey: ["quiz-used", chapterId],
    enabled: !!chapterId,
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_questions")
        .select("question_id, questions!inner(chapter_id)")
        .eq("questions.chapter_id", chapterId);
      return new Set((data ?? []).map((r) => r.question_id));
    },
  });
  const quizzes = useQuery({
    queryKey: ["admin-quizzes", chapterId],
    enabled: !!chapterId,
    queryFn: async () =>
      (
        await supabase
          .from("quizzes")
          .select("id, title, quiz_number, source, duration_minutes, is_published, quiz_questions(count)")
          .eq("chapter_id", chapterId)
          .order("quiz_number")
      ).data ?? [],
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-quizzes", chapterId] });
    return qc.invalidateQueries({ queryKey: ["quiz-used", chapterId] });
  };

  const pool = (questions.data ?? []).filter((q) => !used.data?.has(q.id));
  const usedCount = (questions.data ?? []).length - pool.length;

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Give the quiz a title");
      if (picked.length === 0) throw new Error("Pick at least one question");
      const nextNumber = ((quizzes.data ?? []).reduce((m, q) => Math.max(m, q.quiz_number), 0) || 0) + 1;
      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({
          subject_id: subjectId,
          chapter_id: chapterId,
          topic_id: topicId === "none" ? null : topicId,
          title: title.trim(),
          quiz_number: nextNumber,
          source: "manual",
          duration_minutes: duration,
          is_published: true,
        })
        .select("id")
        .single();
      if (error || !quiz) throw new Error(error?.message ?? "Could not create quiz");
      const { error: linkErr } = await supabase
        .from("quiz_questions")
        .insert(picked.map((question_id, i) => ({ quiz_id: quiz.id, question_id, position: i + 1 })));
      if (linkErr) throw new Error(linkErr.message);
    },
    onSuccess: () => {
      toast.success("Quiz created");
      setTitle("");
      setPicked([]);
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (v: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("quizzes").update({ is_published: v.is_published }).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("quiz_questions").delete().eq("quiz_id", id);
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Quiz deleted");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Quiz builder</h1>
        <p className="text-sm text-muted-foreground">Create as many timed quizzes per chapter as you like.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose a chapter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                setChapterId("");
                setPicked([]);
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
            <Select
              value={chapterId}
              onValueChange={(v) => {
                setChapterId(v);
                setTopicId("none");
                setPicked([]);
              }}
              disabled={!subjectId}
            >
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
          <TopicSelect
            chapterId={chapterId || null}
            value={topicId}
            onChange={setTopicId}
            label="Topic for new quizzes (optional)"
          />
        </CardContent>
      </Card>

      {chapterId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Existing quizzes in this chapter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(quizzes.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No quizzes yet for this chapter.</p>
              )}
              {(quizzes.data ?? []).map((q) => (
                <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      Quiz {q.quiz_number}: {q.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.duration_minutes} min · {q.quiz_questions?.[0]?.count ?? 0} questions
                    </p>
                  </div>
                  <Badge variant={q.source === "ai" ? "secondary" : "outline"}>
                    {q.source === "ai" ? "AI" : "Manual"}
                  </Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Published</span>
                    <Switch
                      checked={q.is_published}
                      onCheckedChange={(v) => togglePublish.mutate({ id: q.id, is_published: v })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete quiz"
                      onClick={() => {
                        if (confirm(`Delete "${q.title}"? Past attempts stay recorded.`)) remove.mutate(q.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" /> New quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="q-title">Quiz title</Label>
                  <Input
                    id="q-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Chapter test — basics"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-dur">Duration (minutes)</Label>
                  <Input
                    id="q-dur"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Questions ({picked.length} selected)</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPicked(
                        picked.length === pool.length ? [] : pool.map((q) => q.id),
                      )
                    }
                  >
                    {picked.length === pool.length && picked.length > 0
                      ? "Clear all"
                      : "Select all"}
                  </Button>
                </div>
                <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                  {pool.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {usedCount > 0
                        ? `Every published question in this chapter is already used in a quiz (${usedCount}). Add new questions to build another quiz.`
                        : "No published questions in this chapter yet. Publish some in the question bank first."}
                    </p>
                  )}
                  {pool.map((q) => (
                    <label key={q.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        className="mt-0.5"
                        checked={picked.includes(q.id)}
                        onCheckedChange={() =>
                          setPicked((p) => (p.includes(q.id) ? p.filter((x) => x !== q.id) : [...p, q.id]))
                        }
                      />
                      <span className="min-w-0">
                        <span className="line-clamp-2">{q.question_text}</span>
                        <span className="text-xs text-muted-foreground">
                          {q.qtype} · {q.difficulty} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button disabled={create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Creating…" : "Create quiz"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
