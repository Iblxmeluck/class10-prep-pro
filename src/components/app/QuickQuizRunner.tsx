import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, RotateCcw, Timer, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { getChallengeSet, getChallengeStats, submitChallenge } from "@/lib/challenge.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickMode = "challenge" | "battle" | "memory" | "emergency";

type Props = {
  mode: QuickMode;
  count: number;
  /** null = untimed */
  limitSeconds: number | null;
  weakFirst?: boolean;
  subjectId?: string | undefined;
  chapterId?: string | undefined;
  /** optional content shown above each question (Memory Mode recall hint) */
  accent?: string;
};

export function QuickQuizRunner({ mode, count, limitSeconds, weakFirst, subjectId, chapterId, accent = "text-primary" }: Props) {
  const loadSet = useServerFn(getChallengeSet);
  const submit = useServerFn(submitChallenge);
  const queryClient = useQueryClient();

  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [left, setLeft] = useState(limitSeconds ?? 0);
  const [done, setDone] = useState<Awaited<ReturnType<typeof submitChallenge>> | null>(null);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(Date.now());
  const sent = useRef(false);

  const { data: stats } = useQuery({
    queryKey: ["challenge-stats", mode],
    queryFn: () => getChallengeStats({ data: { mode } }),
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["challenge-set", mode, round, subjectId, chapterId],
    queryFn: () =>
      loadSet({
        data: {
          count,
          weakFirst: !!weakFirst,
          ...(subjectId ? { subjectId } : {}),
          ...(chapterId ? { chapterId } : {}),
        },
      }),
  });

  const finish = useCallback(async () => {
    if (sent.current || !questions?.length) return;
    sent.current = true;
    setSaving(true);
    try {
      const seconds = Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000));
      const result = await submit({
        data: {
          mode,
          seconds,
          answers: questions.map((q) => ({ questionId: q.id, selectedOption: answers[q.id] ?? null })),
        },
      });
      setDone(result);
      await queryClient.invalidateQueries({ queryKey: ["challenge-stats", mode] });
    } catch {
      toast.error("Could not save this round");
      sent.current = false;
    } finally {
      setSaving(false);
    }
  }, [answers, mode, questions, queryClient, submit]);

  useEffect(() => {
    if (limitSeconds === null || done || !questions?.length) return;
    startedAt.current = Date.now();
    setLeft(limitSeconds);
    const t = setInterval(() => {
      const remaining = limitSeconds - Math.round((Date.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(t);
        void finish();
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, round, limitSeconds]);

  const current = questions?.[index];
  const options = useMemo(() => current?.options ?? [], [current]);

  function pick(choice: number) {
    if (!current) return;
    const next = { ...answers, [current.id]: choice };
    setAnswers(next);
    if (index + 1 < (questions?.length ?? 0)) setIndex(index + 1);
    else void finish();
  }

  function restart() {
    sent.current = false;
    setDone(null);
    setAnswers({});
    setIndex(0);
    setRound((r) => r + 1);
    startedAt.current = Date.now();
    setLeft(limitSeconds ?? 0);
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading questions…</p>;

  if (!questions?.length)
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No published questions are available for your account yet.
      </div>
    );

  if (done) {
    const pct = done.total ? Math.round((done.score / done.total) * 100) : 0;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <Trophy className={cn("mx-auto h-8 w-8", accent)} />
          <p className="mt-2 font-display text-3xl font-bold">
            {done.score}/{done.total}
          </p>
          <p className="text-sm text-muted-foreground">{pct}% correct</p>
          {mode === "battle" && (
            <p className="mt-2 text-sm">
              {done.beatenBest ? (
                <span className="font-medium text-[oklch(0.74_0.16_162)]">New personal best! Previous: {done.previousBest}</span>
              ) : (
                <span className="text-muted-foreground">Your best is {Math.max(done.previousBest, done.score)} — try again to beat it.</span>
              )}
            </p>
          )}
          <Button onClick={restart} className="mt-4 w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" /> Play again
          </Button>
        </div>
        <div className="space-y-2">
          {done.results.map((r, i) => {
            const q = questions.find((x) => x.id === r.questionId);
            return (
              <div key={r.questionId} className="rounded-xl border border-border bg-card p-3 text-sm">
                <p className="flex items-start gap-2 font-medium">
                  {r.isCorrect ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.74_0.16_162)]" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.7_0.19_45)]" />
                  )}
                  <span>
                    {i + 1}. {q?.question_text}
                  </span>
                </p>
                {!r.isCorrect && r.correctOption !== null && (
                  <p className="mt-1 pl-6 text-xs text-muted-foreground">
                    Correct answer: {q?.options[r.correctOption]}
                  </p>
                )}
                {r.explanation && <p className="mt-1 pl-6 text-xs text-muted-foreground">{r.explanation}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        {limitSeconds !== null && (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-display font-semibold", left <= 10 && "text-[oklch(0.7_0.19_45)]")}>
            <Timer className="h-4 w-4" /> {left}s
          </span>
        )}
        <span className="text-muted-foreground">
          Question {index + 1} / {questions.length}
        </span>
        {stats ? <span className="ml-auto text-xs text-muted-foreground">Best {stats.best}</span> : null}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[oklch(0.64_0.2_254)] to-[oklch(0.65_0.29_319)] transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-medium">{current?.question_text}</p>
        <div className="mt-3 grid gap-2">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              className="min-h-11 rounded-xl border border-border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary active:border-primary"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <Button variant="ghost" size="sm" disabled={saving} onClick={() => void finish()} className="w-full">
        {saving ? "Saving…" : "Finish now"}
      </Button>
    </div>
  );
}
