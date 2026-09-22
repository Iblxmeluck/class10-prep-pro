import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Heart, Lightbulb, Scissors, SplitSquareHorizontal, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { checkGameAnswer, getGameQuestions, submitGameRound, useGameLifeline } from "@/lib/games.functions";
import type { GameDef } from "@/lib/games.catalog";
import { GamePanelHeader, GameProgressBar, GameResultPanel, type GameScope } from "@/components/games/GameShared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Answer = { questionId: string; selectedOption: number | null };
type Submitted = Awaited<ReturnType<typeof submitGameRound>>;

/** Shared engine for every question-based game (timer, lives, stages, lifelines). */
export function GameMcq({
  def,
  scope,
  onBack,
  onRestart,
}: {
  def: GameDef;
  scope: GameScope;
  onBack: () => void;
  onRestart: () => void;
}) {
  const loadQuestions = useServerFn(getGameQuestions);
  const submit = useServerFn(submitGameRound);
  const check = useServerFn(checkGameAnswer);
  const lifeline = useServerFn(useGameLifeline);
  const queryClient = useQueryClient();

  const instantFeedback = def.key === "science_lab" || !!def.lives;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [left, setLeft] = useState(def.limitSeconds ?? 0);
  const [lives, setLives] = useState(def.lives ?? 0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctOption: number | null; explanation: string } | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const [hint, setHint] = useState("");
  const [usedLifelines, setUsedLifelines] = useState<string[]>([]);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState<Submitted | null>(null);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(Date.now());
  const sent = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["game-questions", def.key, scope.subjectId, scope.chapterId, scope.topicId, scope.difficulty],
    queryFn: () =>
      loadQuestions({
        data: {
          count: def.count,
          difficulty: scope.difficulty,
          progressive: !!def.progressive,
          ...(scope.subjectId ? { subjectId: scope.subjectId } : def.subjectName ? { subjectName: def.subjectName } : {}),
          ...(scope.chapterId ? { chapterId: scope.chapterId } : {}),
          ...(scope.topicId ? { topicId: scope.topicId } : {}),
        },
      }),
  });

  const questions = data?.questions ?? [];

  const finish = useCallback(
    async (finalAnswers: Answer[], finalPoints: number) => {
      if (sent.current) return;
      sent.current = true;
      setSaving(true);
      try {
        const seconds = Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000));
        const result = await submit({
          data: {
            gameKey: def.key,
            seconds,
            answers: finalAnswers,
            ...(def.pointsPerCorrect ? { points: finalPoints } : {}),
            ...(scope.subjectId ? { subjectId: scope.subjectId } : {}),
            ...(scope.chapterId ? { chapterId: scope.chapterId } : {}),
            ...(scope.topicId ? { topicId: scope.topicId } : {}),
          },
        });
        setDone(result);
        await queryClient.invalidateQueries({ queryKey: ["games-overview"] });
      } catch {
        toast.error("Could not save this round");
        sent.current = false;
      } finally {
        setSaving(false);
      }
    },
    [def.key, def.pointsPerCorrect, queryClient, scope.chapterId, scope.subjectId, scope.topicId, submit],
  );

  useEffect(() => {
    if (def.limitSeconds === null || done || !questions.length) return;
    startedAt.current = Date.now();
    setLeft(def.limitSeconds);
    const t = setInterval(() => {
      const remaining = def.limitSeconds! - Math.round((Date.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(t);
        void finish(answersRef.current, pointsRef.current);
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length, def.limitSeconds]);

  const answersRef = useRef<Answer[]>([]);
  const pointsRef = useRef(0);
  answersRef.current = answers;
  pointsRef.current = points;

  const current = questions[index];
  const options = useMemo(() => current?.options ?? [], [current]);
  const stage = def.stages ? Math.min(def.stages, Math.floor((index / Math.max(1, questions.length)) * def.stages) + 1) : null;

  function nextQuestion(nextAnswers: Answer[], nextPoints: number, livesLeft: number) {
    setFeedback(null);
    setRemoved([]);
    setHint("");
    if (livesLeft <= 0 && def.lives) {
      void finish(nextAnswers, nextPoints);
      return;
    }
    if (index + 1 < questions.length) setIndex(index + 1);
    else void finish(nextAnswers, nextPoints);
  }

  async function pick(choice: number) {
    if (!current || feedback) return;
    const nextAnswers = [...answers, { questionId: current.id, selectedOption: choice }];
    setAnswers(nextAnswers);

    if (instantFeedback) {
      try {
        const res = await check({ data: { questionId: current.id, selectedOption: choice } });
        setFeedback(res);
        const nextLives = res.isCorrect ? lives : Math.max(0, lives - 1);
        setLives(nextLives);
        if (res.isCorrect && def.pointsPerCorrect) setPoints((p) => p + def.pointsPerCorrect! * (index + 1));
      } catch {
        nextQuestion(nextAnswers, points, lives);
      }
      return;
    }

    const nextPoints = def.pointsPerCorrect ? points : points;
    if (def.pointsPerCorrect) {
      // Millionaire ladder: the score is confirmed server-side on submit.
      const res = await check({ data: { questionId: current.id, selectedOption: choice } }).catch(() => null);
      const gained = res?.isCorrect ? def.pointsPerCorrect * (index + 1) : 0;
      setPoints((p) => p + gained);
      nextQuestion(nextAnswers, points + gained, lives);
      return;
    }
    nextQuestion(nextAnswers, nextPoints, lives);
  }

  async function takeLifeline(kind: "fifty" | "remove" | "hint") {
    if (!current || usedLifelines.includes(kind)) return;
    try {
      const res = await lifeline({ data: { questionId: current.id, kind } });
      setUsedLifelines((u) => [...u, kind]);
      if (res.kind === "hint") setHint(res.hint);
      else setRemoved((r) => [...new Set([...r, ...res.removed])]);
    } catch {
      toast.error("Lifeline unavailable for this question");
    }
  }

  function restart() {
    sent.current = false;
    setDone(null);
    setAnswers([]);
    setIndex(0);
    setLives(def.lives ?? 0);
    setPoints(0);
    setFeedback(null);
    setRemoved([]);
    setHint("");
    setUsedLifelines([]);
    startedAt.current = Date.now();
    setLeft(def.limitSeconds ?? 0);
    onRestart();
  }

  if (isLoading)
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <p className="text-sm text-muted-foreground">Loading questions…</p>
      </div>
    );

  if (!questions.length)
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No published questions match this selection yet. Try another chapter or difficulty.
        </div>
      </div>
    );

  if (done) {
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <GameResultPanel
          def={def}
          score={done.score}
          correct={done.correct}
          wrong={done.wrong}
          total={done.total}
          seconds={done.seconds}
          personalBest={Math.max(done.previousBest, done.score)}
          beatenBest={done.beatenBest}
          onPlayAgain={restart}
          onBack={onBack}
        >
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
                    <p className="mt-1 pl-6 text-xs text-muted-foreground">Correct answer: {q?.options[r.correctOption]}</p>
                  )}
                  {r.explanation ? <p className="mt-1 pl-6 text-xs text-muted-foreground">{r.explanation}</p> : null}
                </div>
              );
            })}
          </div>
        </GameResultPanel>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GamePanelHeader
        def={def}
        onBack={onBack}
        right={
          <>
            {def.limitSeconds !== null && (
              <span className={cn("inline-flex items-center gap-1 font-display font-semibold", left <= 10 && "text-[oklch(0.7_0.19_45)]")}>
                <Timer className="h-4 w-4" /> {left}s
              </span>
            )}
            {def.lives ? (
              <span className="inline-flex items-center gap-1">
                {Array.from({ length: def.lives }).map((_, i) => (
                  <Heart key={i} className={cn("h-4 w-4", i < lives ? "fill-[oklch(0.7_0.19_45)] text-[oklch(0.7_0.19_45)]" : "text-muted-foreground")} />
                ))}
              </span>
            ) : null}
            {def.pointsPerCorrect ? <span className="font-display font-semibold">{points}</span> : null}
          </>
        }
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {index + 1} / {questions.length}
          {stage ? ` · Stage ${stage} of ${def.stages}` : ""}
        </span>
        {data?.relaxedDifficulty ? <span>Mixed difficulty (not enough {scope.difficulty} questions)</span> : null}
      </div>
      <GameProgressBar value={((index + (feedback ? 1 : 0)) / questions.length) * 100} gradient={def.gradient} />

      <div className={cn("rounded-2xl bg-gradient-to-br p-[1px]", def.gradient)}>
        <div className="rounded-2xl bg-card p-4">
          <p className="font-medium">{current?.question_text}</p>
          <div className="mt-3 grid gap-2">
            {options.map((opt, i) => {
              const isRemoved = removed.includes(i);
              const isAnswerShown = feedback && feedback.correctOption === i;
              const isPickedWrong = feedback && !feedback.isCorrect && answers[answers.length - 1]?.selectedOption === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isRemoved || !!feedback}
                  onClick={() => void pick(i)}
                  className={cn(
                    "min-h-12 rounded-xl border border-border px-3 py-2.5 text-left text-sm transition-all active:scale-[0.99]",
                    !feedback && !isRemoved && "hover:border-primary",
                    isRemoved && "opacity-30 line-through",
                    isAnswerShown && "border-[oklch(0.74_0.16_162)] bg-[oklch(0.74_0.16_162)]/10",
                    isPickedWrong && "border-[oklch(0.7_0.19_45)] bg-[oklch(0.7_0.19_45)]/10",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {def.lifelines ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={usedLifelines.includes("fifty")} onClick={() => void takeLifeline("fifty")}>
                <SplitSquareHorizontal className="mr-1.5 h-4 w-4" /> 50 / 50
              </Button>
              <Button variant="outline" size="sm" disabled={usedLifelines.includes("remove")} onClick={() => void takeLifeline("remove")}>
                <Scissors className="mr-1.5 h-4 w-4" /> Remove wrong
              </Button>
              <Button variant="outline" size="sm" disabled={usedLifelines.includes("hint")} onClick={() => void takeLifeline("hint")}>
                <Lightbulb className="mr-1.5 h-4 w-4" /> Hint
              </Button>
            </div>
          ) : null}
          {hint ? <p className="mt-2 rounded-xl border border-border p-3 text-xs text-muted-foreground">{hint}</p> : null}

          {feedback ? (
            <div className="mt-3 space-y-2">
              <p className={cn("text-sm font-medium", feedback.isCorrect ? "text-[oklch(0.74_0.16_162)]" : "text-[oklch(0.7_0.19_45)]")}>
                {feedback.isCorrect ? "Correct!" : def.lives ? "Wrong — that costs a life." : "Not quite."}
              </p>
              {feedback.explanation ? <p className="text-xs text-muted-foreground">{feedback.explanation}</p> : null}
              <Button className="min-h-11 w-full" onClick={() => nextQuestion(answers, points, lives)}>
                {lives <= 0 && def.lives ? "See result" : index + 1 < questions.length ? "Next" : "Finish"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Button variant="ghost" size="sm" disabled={saving} onClick={() => void finish(answers, points)} className="w-full">
        {saving ? "Saving…" : "Finish now"}
      </Button>
    </div>
  );
}
