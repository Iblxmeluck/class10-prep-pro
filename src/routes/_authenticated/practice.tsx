import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SubjectChapterPicker } from "@/components/app/SubjectChapterPicker";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { answerPracticeQuestion, getPracticeQuestions } from "@/lib/quiz.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Search = { subject?: string | undefined; chapter?: string | undefined; topic?: string | undefined };

export const Route = createFileRoute("/_authenticated/practice")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    subject: typeof s['subject'] === "string" ? s['subject'] : undefined,
    chapter: typeof s['chapter'] === "string" ? s['chapter'] : undefined,
    topic: typeof s['topic'] === "string" ? s['topic'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Practice — CBSE 10 Prep" },
      { name: "description", content: "Attempt chapter-wise CBSE Class 10 questions with instant answers and explanations." },
      { property: "og:title", content: "Practice — CBSE 10 Prep" },
      { property: "og:description", content: "Chapter-wise CBSE Class 10 practice with instant feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Practice,
});

function Practice() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctOption: number | null;
    explanation: string;
  } | null>(null);
  const startedAt = useRef(Date.now());

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });

  const subjectId = search.subject ?? subjects?.[0]?.id;

  const { data: topic } = useQuery({
    queryKey: ["topic", search.topic],
    enabled: !!search.topic,
    queryFn: async () => (await supabase.from("topics").select("id, name").eq("id", search.topic!).maybeSingle()).data,
  });

  const loadQuestions = useServerFn(getPracticeQuestions);
  const sendAnswer = useServerFn(answerPracticeQuestion);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["practice-questions", subjectId, search.chapter, search.topic],
    enabled: !!subjectId,
    queryFn: () =>
      loadQuestions({
        data: {
          subjectId: subjectId!,
          ...(search.chapter ? { chapterId: search.chapter } : {}),
          ...(search.topic ? { topicId: search.topic } : {}),
        },
      }),
  });

  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    startedAt.current = Date.now();
  }, [subjectId, search.chapter, search.topic]);

  const current = questions?.[index];
  const options = useMemo(() => (Array.isArray(current?.options) ? (current.options as string[]) : []), [current]);

  async function answer(choice: number) {
    if (revealed || !current) return;
    setSelected(choice);
    setRevealed(true);
    const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      const res = await sendAnswer({
        data: { questionId: current.id, selectedOption: choice, timeSpentSeconds: seconds },
      });
      setFeedback(res);
    } catch {
      toast.error("Could not save your attempt");
    }
  }

  function next() {
    setSelected(null);
    setRevealed(false);
    setFeedback(null);
    startedAt.current = Date.now();
    setIndex((i) => i + 1);
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
      <div>
        <h1 className="font-display text-2xl font-semibold">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a subject and chapter, then answer at your own pace.</p>
      </div>

      <SubjectChapterPicker
        subjectId={subjectId}
        chapterId={search.chapter}
        onSubjectChange={(id) => navigate({ search: { subject: id } })}
        onChapterChange={(id) => navigate({ search: { subject: subjectId, chapter: id } })}
      />

      {topic && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>Topic: {topic.name}</Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate({ search: { subject: subjectId, chapter: search.chapter } })}
          >
            Clear topic filter
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading questions…</p>
      ) : !current ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {questions?.length
            ? "You've finished every question here. Great work!"
            : "No published questions are available for your access right now."}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">
              Question {index + 1} of {questions!.length}
            </Badge>
            <Badge variant="outline">{current.qtype}</Badge>
            <Badge variant="outline">{current.difficulty}</Badge>
            <Badge variant="outline">{current.marks} mark(s)</Badge>
          </div>
          <p className="mt-4 text-lg font-medium leading-relaxed">{current.question_text}</p>
          <div className="mt-5 grid gap-2">
            {options.map((opt, i) => {
              const isAnswer = revealed && feedback !== null && i === feedback.correctOption;
              const isWrong = revealed && i === selected && feedback !== null && i !== feedback.correctOption;
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={revealed}
                  className={cn(
                    "rounded-lg border border-border px-4 py-3 text-left text-sm transition-colors",
                    !revealed && "hover:border-primary hover:bg-accent/40",
                    isAnswer && "border-primary bg-primary/10",
                    isWrong && "border-destructive bg-destructive/10",
                  )}
                >
                  <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {revealed && (
            <div className="mt-5 rounded-lg bg-secondary p-4 text-sm">
              <p className="font-semibold">
                {feedback === null ? "Checking…" : feedback.isCorrect ? "Correct!" : "Not quite."}
              </p>
              {feedback?.explanation && <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>}
              <Button className="mt-4" size="sm" onClick={next}>
                Next question
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
