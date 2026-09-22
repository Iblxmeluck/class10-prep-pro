import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Constants } from "@/integrations/supabase/types";
import { generateQuestions } from "@/lib/ai.functions";
import { listAdminQuestions } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TopicSelect } from "@/components/app/TopicSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  head: () => ({
    meta: [
      { title: "Question Bank Admin — CBSE 10 Prep" },
      { name: "description", content: "Generate, review, publish and manage CBSE Class 10 questions." },
      { property: "og:title", content: "Question Bank Admin — CBSE 10 Prep" },
      { property: "og:description", content: "AI generation plus manual authoring for the Class 10 question bank." },
    ],
  }),
  component: QuestionsAdmin,
});

const QTYPES = Constants.public.Enums.question_type;
const DIFFICULTIES = Constants.public.Enums.difficulty;

function QuestionsAdmin() {
  const qc = useQueryClient();
  const generate = useServerFn(generateQuestions);

  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("none");
  const [qtype, setQtype] = useState<string>("MCQ");
  const [difficulty, setDifficulty] = useState<string>("Medium");
  const [count, setCount] = useState("5");
  const [marks, setMarks] = useState("1");
  const [statusFilter, setStatusFilter] = useState("draft");

  const [manualText, setManualText] = useState("");
  const [manualOptions, setManualOptions] = useState("");
  const [manualCorrect, setManualCorrect] = useState("0");
  const [manualExplanation, setManualExplanation] = useState("");

  const subjects = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const chapters = useQuery({
    queryKey: ["admin-chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, name")
        .eq("subject_id", subjectId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const loadQuestions = useServerFn(listAdminQuestions);
  const questions = useQuery({
    queryKey: ["admin-questions", statusFilter, subjectId, chapterId],
    queryFn: () =>
      loadQuestions({
        data: {
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(subjectId ? { subjectId } : {}),
          ...(chapterId ? { chapterId } : {}),
        },
      }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-questions"] });

  const runAi = useMutation({
    mutationFn: async () => {
      if (!subjectId || !chapterId) throw new Error("Choose a subject and chapter");
      return generate({
        data: {
          subjectId,
          chapterId,
          topicId: topicId === "none" ? null : topicId,
          qtype,
          difficulty: difficulty as "Medium",
          count: Number(count),
          marks: Number(marks),
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`${res.created} draft questions generated`);
      setStatusFilter("draft");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addManual = useMutation({
    mutationFn: async () => {
      if (!subjectId || !chapterId) throw new Error("Choose a subject and chapter");
      const options = manualOptions
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      const { error } = await supabase.from("questions").insert({
        subject_id: subjectId,
        chapter_id: chapterId,
        topic_id: topicId === "none" ? null : topicId,
        qtype: qtype as "MCQ",
        difficulty: difficulty as "Medium",
        marks: Number(marks),
        status: "published",
        question_text: manualText.trim(),
        options,
        correct_option: options.length ? Number(manualCorrect) : null,
        explanation: manualExplanation.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setManualText("");
      setManualOptions("");
      setManualExplanation("");
      toast.success("Question published");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" | "archived" }) => {
      const { error } = await supabase.from("questions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const publishAllDrafts = useMutation({
    mutationFn: async () => {
      let q = supabase.from("questions").update({ status: "published" }).eq("status", "draft");
      if (subjectId) q = q.eq("subject_id", subjectId);
      if (chapterId) q = q.eq("chapter_id", chapterId);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All draft questions published");
      setStatusFilter("published");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> AI question generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select
                  value={subjectId}
                  onValueChange={(v) => {
                    setSubjectId(v);
                    setChapterId("");
                    setTopicId("none");
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
                  }}
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
              <TopicSelect chapterId={chapterId || null} value={topicId} onChange={setTopicId} label="Topic (optional)" />
              <div className="space-y-1.5">
                <Label>Question type</Label>
                <Select value={qtype} onValueChange={setQtype}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QTYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="count">How many</Label>
                <Input id="count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="marks">Marks each</Label>
                <Input id="marks" type="number" min={1} max={10} value={marks} onChange={(e) => setMarks(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => runAi.mutate()} disabled={runAi.isPending} className="w-full">
              {runAi.isPending ? "Generating…" : "Generate draft questions"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={publishAllDrafts.isPending}
              onClick={() => publishAllDrafts.mutate()}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {publishAllDrafts.isPending ? "Publishing…" : "Publish all drafts"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Generated questions are saved as drafts. Publish them one by one, or publish every draft at once — the
              subject and chapter chosen above limit which drafts are published.
            </p>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a question manually</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="qtext">Question</Label>
              <Textarea id="qtext" value={manualText} onChange={(e) => setManualText(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qopts">Options (one per line, leave blank for subjective)</Label>
              <Textarea id="qopts" value={manualOptions} onChange={(e) => setManualOptions(e.target.value)} rows={4} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qcorrect">Correct option index (0-based)</Label>
                <Input id="qcorrect" type="number" min={0} value={manualCorrect} onChange={(e) => setManualCorrect(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qexp">Explanation</Label>
                <Input id="qexp" value={manualExplanation} onChange={(e) => setManualExplanation(e.target.value)} />
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => addManual.mutate()}
              disabled={!manualText.trim() || addManual.isPending}
            >
              Publish question
            </Button>
            <p className="text-xs text-muted-foreground">Uses the subject, chapter, type, difficulty and marks selected on the left.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Question bank</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {(questions.data ?? []).map((q) => (
            <div key={q.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="max-w-3xl text-sm">{q.question_text}</p>
                <div className="flex items-center gap-1">
                  {q.status !== "published" ? (
                    <Button size="sm" onClick={() => setStatus.mutate({ id: q.id, status: "published" })}>
                      Publish
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: q.id, status: "archived" })}>
                      Archive
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => removeQuestion.mutate(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{q.qtype}</Badge>
                <Badge variant="outline">{q.difficulty}</Badge>
                <Badge variant="outline">{q.marks} mark(s)</Badge>
                <Badge variant={q.status === "published" ? "default" : "outline"}>{q.status}</Badge>
                {q.ai_generated ? <Badge variant="secondary">AI</Badge> : null}
                <Badge variant="outline">{(q as { chapters?: { name?: string } | null }).chapters?.name ?? "—"}</Badge>
              </div>
              {Array.isArray(q.options) && q.options.length ? (
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {(q.options as string[]).map((o, i) => (
                    <li key={i} className={i === q.correct_option ? "font-medium text-foreground" : ""}>
                      {o}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ))}
          {!questions.data?.length ? <p className="text-sm text-muted-foreground">No questions match these filters.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
