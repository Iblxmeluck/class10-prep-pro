import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, History, ListChecks, MinusCircle, Play, RotateCcw, XCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAttemptReview, getQuizForAttempt, submitQuizAttempt } from "@/lib/quiz.functions";
import { SubjectChapterPicker } from "@/components/app/SubjectChapterPicker";
import { RaiseDemandButton } from "@/components/app/RaiseDemandButton";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Search = {
  subject?: string | undefined;
  chapter?: string | undefined;
  topic?: string | undefined;
  quiz?: string | undefined;
};

export const Route = createFileRoute("/_authenticated/quizzes")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    subject: typeof s['subject'] === "string" ? s['subject'] : undefined,
    chapter: typeof s['chapter'] === "string" ? s['chapter'] : undefined,
    topic: typeof s['topic'] === "string" ? s['topic'] : undefined,
    quiz: typeof s['quiz'] === "string" ? s['quiz'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Quizzes — CBSE 10 Prep" },
      { name: "description", content: "Attempt timed chapter-wise CBSE Class 10 quizzes and review every past score." },
      { property: "og:title", content: "Quizzes — CBSE 10 Prep" },
      { property: "og:description", content: "Timed chapter-wise Class 10 quizzes with full attempt history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizzesPage,
});

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function QuizzesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });
  const subjectId = search.subject ?? subjects.data?.[0]?.id;

  const topic = useQuery({
    queryKey: ["topic", search.topic],
    enabled: !!search.topic,
    queryFn: async () => (await supabase.from("topics").select("id, name").eq("id", search.topic!).maybeSingle()).data,
  });

  if (search.quiz) {
    return (
      <QuizRunner
        quizId={search.quiz}
        onExit={() => navigate({ search: { subject: subjectId, chapter: search.chapter, topic: search.topic } })}
      />
    );
  }

  return (
    <div className="space-y-6">
      {search.topic && (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/topics/$topicId" params={{ topicId: search.topic }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to topic
          </Link>
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Quizzes</h1>
          <p className="text-sm text-muted-foreground">Timed chapter tests. Every attempt is saved.</p>
        </div>
        <RaiseDemandButton defaultWant="Quiz" />
      </div>

      <SubjectChapterPicker
        subjectId={subjectId}
        chapterId={search.chapter}
        onSubjectChange={(id) => navigate({ search: { subject: id } })}
        onChapterChange={(id) => navigate({ search: { subject: subjectId, chapter: id } })}
      />

      {topic.data && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>Topic: {topic.data.name}</Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate({ search: { subject: subjectId, chapter: search.chapter } })}
          >
            Clear topic filter
          </Button>
        </div>
      )}

      {subjectId && <ChapterQuizList subjectId={subjectId} chapterId={search.chapter} topicId={search.topic} />}
    </div>
  );
}

function ChapterQuizList({
  subjectId,
  chapterId,
  topicId,
}: {
  subjectId: string;
  chapterId?: string | undefined;
  topicId?: string | undefined;
}) {
  const navigate = Route.useNavigate();
  const { data: session } = useSessionInfo();
  const [historyQuiz, setHistoryQuiz] = useState<{ id: string; title: string } | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<string | null>(null);

  const chapters = useQuery({
    queryKey: ["chapters", subjectId],
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name").eq("subject_id", subjectId).order("sort_order")).data ?? [],
  });

  const quizzes = useQuery({
    queryKey: ["student-quizzes", subjectId, chapterId ?? "all", topicId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("quizzes")
        .select("id, title, quiz_number, chapter_id, source, duration_minutes, quiz_questions(count)")
        .eq("subject_id", subjectId)
        .eq("is_published", true)
        .order("quiz_number");
      if (chapterId) q = q.eq("chapter_id", chapterId);
      if (topicId) q = q.eq("topic_id", topicId);
      return (await q).data ?? [];
    },
  });

  const attempts = useQuery({
    queryKey: ["my-quiz-attempts", session?.userId],
    enabled: !!session?.userId,
    queryFn: async () =>
      (
        await supabase
          .from("quiz_attempts")
          .select("id, quiz_id, attempt_number, score, total_marks, correct_count, incorrect_count, skipped_count, time_taken_seconds, submitted_at")
          .eq("user_id", session!.userId)
          .order("attempt_number", { ascending: false })
      ).data ?? [],
  });

  const byChapter = useMemo(() => {
    const map = new Map<string, NonNullable<typeof quizzes.data>>();
    for (const q of quizzes.data ?? []) {
      const list = map.get(q.chapter_id) ?? [];
      list.push(q);
      map.set(q.chapter_id, list);
    }
    return map;
  }, [quizzes.data]);

  if (quizzes.isLoading || chapters.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const chaptersWithQuizzes = (chapters.data ?? []).filter((c) => byChapter.has(c.id));
  if (chaptersWithQuizzes.length === 0)
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No quizzes have been published {chapterId || topicId ? "for this selection" : "for this subject"} yet.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-8">
      {chaptersWithQuizzes.map((c) => (
        <section key={c.id} className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{c.name}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(byChapter.get(c.id) ?? []).map((q) => {
              const mine = (attempts.data ?? []).filter((a) => a.quiz_id === q.id);
              const best = mine.reduce((m, a) => Math.max(m, a.score), 0);
              return (
                <Card key={q.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Quiz {q.quiz_number}: {q.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" /> {q.duration_minutes} min
                      </Badge>
                      <Badge variant="outline">{q.quiz_questions?.[0]?.count ?? 0} questions</Badge>
                      {q.source === "ai" && <Badge variant="secondary">AI</Badge>}
                      {mine.length > 0 && <Badge>Best {best}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {mine.length === 0 ? (
                      <Button onClick={() => navigate({ search: (p) => ({ ...p, quiz: q.id }) })}>
                        <Play className="mr-2 h-4 w-4" /> Start quiz
                      </Button>
                    ) : (
                      <>
                        <Button onClick={() => navigate({ search: (p) => ({ ...p, quiz: q.id }) })}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Reattempt quiz
                        </Button>
                        <Button variant="outline" onClick={() => setHistoryQuiz({ id: q.id, title: q.title })}>
                          <History className="mr-2 h-4 w-4" /> Previous results
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <Dialog open={!!historyQuiz} onOpenChange={(o) => !o && setHistoryQuiz(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Past attempts — {historyQuiz?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(attempts.data ?? [])
              .filter((a) => a.quiz_id === historyQuiz?.id)
              .map((a) => (
                <div key={a.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Attempt {a.attempt_number}</p>
                    <p className="font-semibold">
                      {a.score}/{a.total_marks}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.submitted_at).toLocaleString()} · {fmt(a.time_taken_seconds)} taken
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.correct_count} correct · {a.incorrect_count} incorrect · {a.skipped_count} skipped
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setReviewAttempt(a.id)}>
                    <ListChecks className="mr-1.5 h-4 w-4" /> Review answers
                  </Button>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewAttempt} onOpenChange={(o) => !o && setReviewAttempt(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review answers</DialogTitle>
          </DialogHeader>
          {reviewAttempt && <AttemptReview attemptId={reviewAttempt} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuizRunner({ quizId, onExit }: { quizId: string; onExit: () => void }) {
  const qc = useQueryClient();
  const { data: session } = useSessionInfo();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<null | {
    attemptId: string;
    score: number;
    total: number;
    correct: number;
    incorrect: number;
    skipped: number;
  }>(null);

  const loadQuiz = useServerFn(getQuizForAttempt);
  const sendAttempt = useServerFn(submitQuizAttempt);

  const paper = useQuery({
    queryKey: ["quiz-paper", quizId],
    queryFn: () => loadQuiz({ data: { quizId } }),
  });
  const quiz = { data: paper.data?.quiz ?? undefined, isLoading: paper.isLoading };
  const questions = { data: paper.data?.questions ?? undefined, isLoading: paper.isLoading };

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt, result]);

  const limit = (quiz.data?.duration_minutes ?? 15) * 60;
  const remaining = Math.max(0, limit - elapsed);

  const submit = useMutation({
    mutationFn: async () => {
      if (!session?.userId) throw new Error("Not signed in");
      return sendAttempt({
        data: { quizId, answers, timeTakenSeconds: Math.min(elapsed, limit) },
      });
    },
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ["my-quiz-attempts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!result && remaining === 0 && (questions.data?.length ?? 0) > 0 && !submit.isPending) {
      submit.mutate();
    }
  }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  if (quiz.isLoading || questions.isLoading) return <p className="text-sm text-muted-foreground">Loading quiz…</p>;

  if (result)
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz submitted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">
              {result.score}
              <span className="text-lg text-muted-foreground">/{result.total}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {result.correct} correct · {result.incorrect} incorrect · {result.skipped} skipped · {fmt(elapsed)} taken
            </p>
            <Button onClick={onExit}>Back to quizzes</Button>
          </CardContent>
        </Card>
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Review answers</h2>
          <AttemptReview attemptId={result.attemptId} />
        </section>
      </div>
    );

  const list = questions.data ?? [];
  const current = list[index];
  const options = Array.isArray(current?.options) ? (current.options as string[]) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">
            Quiz {quiz.data?.quiz_number}: {quiz.data?.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Question {index + 1} of {list.length}
          </p>
        </div>
        <Badge className="ml-auto gap-1" variant={remaining < 60 ? "destructive" : "secondary"}>
          <Clock className="h-3 w-3" /> {fmt(remaining)}
        </Badge>
      </div>

      {current && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="font-medium">{current.question_text}</p>
            <div className="grid gap-2">
              {options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAnswers((p) => ({ ...p, [current.id]: i }))}
                  className={cn(
                    "rounded-lg border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-accent",
                    answers[current.id] === i && "border-primary bg-primary/10",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Previous
        </Button>
        <Button variant="outline" disabled={index >= list.length - 1} onClick={() => setIndex((i) => i + 1)}>
          Next
        </Button>
        <Button className="ml-auto" disabled={submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? "Submitting…" : "Submit quiz"}
        </Button>
      </div>
    </div>
  );
}

type ReviewFilter = "all" | "correct" | "incorrect";

function AttemptReview({ attemptId }: { attemptId: string }) {
  const load = useServerFn(getAttemptReview);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const review = useQuery({
    queryKey: ["attempt-review", attemptId],
    queryFn: () => load({ data: { attemptId } }),
  });

  if (review.isLoading) return <p className="text-sm text-muted-foreground">Loading your answers…</p>;
  if (review.isError || !review.data) return <p className="text-sm text-destructive">Could not load this attempt.</p>;

  const items = review.data.items;
  const shown = items.filter((it) =>
    filter === "all" ? true : filter === "correct" ? it.isCorrect : !it.isCorrect,
  );
  const letter = (i: number | null) => (i === null || i === undefined ? "—" : String.fromCharCode(65 + i));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", `All (${items.length})`],
            ["correct", `✅ Correct (${items.filter((i) => i.isCorrect).length})`],
            ["incorrect", `❌ Incorrect (${items.filter((i) => !i.isCorrect).length})`],
          ] as const
        ).map(([k, label]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
            {label}
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to show for this filter.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((it, n) => (
            <Card key={it.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-2">
                  {it.isSkipped ? (
                    <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : it.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <p className="font-medium leading-snug">
                    <span className="mr-1 text-muted-foreground">Q{n + 1}.</span>
                    {it.questionText}
                  </p>
                  <Badge className="ml-auto shrink-0" variant={it.isSkipped ? "outline" : it.isCorrect ? "default" : "destructive"}>
                    {it.isSkipped ? "Skipped" : it.isCorrect ? "Correct" : "Incorrect"}
                  </Badge>
                </div>
                <div className="grid gap-1.5">
                  {it.options.map((opt, i) => {
                    const isRight = i === it.correctOption;
                    const isMine = i === it.selectedOption;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "rounded-md border border-border px-3 py-2 text-sm",
                          isRight && "border-primary bg-primary/10",
                          isMine && !isRight && "border-destructive bg-destructive/10",
                        )}
                      >
                        <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {isRight && <span className="ml-2 text-xs text-primary">Correct answer</span>}
                        {isMine && !isRight && <span className="ml-2 text-xs text-destructive">Your answer</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Your answer: <span className="font-medium text-foreground">{letter(it.selectedOption)}</span>
                  </p>
                  <p>
                    Correct answer: <span className="font-medium text-foreground">{letter(it.correctOption)}</span>
                  </p>
                </div>
                {it.explanation ? (
                  <div className="rounded-md bg-secondary p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explanation</p>
                    <p className="mt-1">{it.explanation}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
