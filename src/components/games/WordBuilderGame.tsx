import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Delete, Flame } from "lucide-react";
import { toast } from "sonner";
import { getGamePairs, submitGameRound } from "@/lib/games.functions";
import type { GameDef } from "@/lib/games.catalog";
import { GamePanelHeader, GameProgressBar, GameResultPanel, type GameScope } from "@/components/games/GameShared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Submitted = Awaited<ReturnType<typeof submitGameRound>>;

function scramble(word: string): string[] {
  const letters = word.split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j]!, letters[i]!];
  }
  return letters;
}

/** Word Builder — rebuild terms taken from existing flashcards. */
export function WordBuilderGame({ def, scope, onBack, onRestart }: { def: GameDef; scope: GameScope; onBack: () => void; onRestart: () => void }) {
  const loadPairs = useServerFn(getGamePairs);
  const submit = useServerFn(submitGameRound);
  const queryClient = useQueryClient();

  const maxLength = scope.difficulty === "Easy" ? 8 : scope.difficulty === "Medium" ? 14 : 22;

  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [state, setState] = useState<"playing" | "right" | "wrong">("playing");
  const [done, setDone] = useState<Submitted | null>(null);
  const startedAt = useRef(Date.now());
  const sent = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["game-words", def.key, round, scope.subjectId, scope.chapterId, scope.topicId, maxLength],
    queryFn: () =>
      loadPairs({
        data: {
          count: 20,
          maxFrontLength: 160,
          ...(scope.subjectId ? { subjectId: scope.subjectId } : {}),
          ...(scope.chapterId ? { chapterId: scope.chapterId } : {}),
          ...(scope.topicId ? { topicId: scope.topicId } : {}),
        },
      }),
  });

  const items = useMemo(() => {
    const usable = (data?.pairs ?? [])
      .map((p) => ({ clue: p.front, answer: p.back.trim() }))
      .filter((p) => /^[\p{L}\p{N}\s-]+$/u.test(p.answer) && p.answer.replace(/\s/g, "").length >= 4 && p.answer.length <= maxLength);
    return usable.slice(0, def.count).map((p) => ({ ...p, letters: scramble(p.answer.replace(/\s+/g, " ")) }));
  }, [data, def.count, maxLength]);

  const item = items[index];
  const builtWord = built.map((i) => item?.letters[i] ?? "").join("");

  useEffect(() => {
    startedAt.current = Date.now();
  }, [round]);

  async function finish(finalCorrect: number, finalStreak: number) {
    if (sent.current) return;
    sent.current = true;
    const seconds = Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      const result = await submit({
        data: {
          gameKey: "word_builder",
          seconds,
          correct: finalCorrect,
          total: items.length,
          points: finalCorrect * 10 + finalStreak * 5,
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
    }
  }

  function submitWord() {
    if (!item || state !== "playing") return;
    const ok = builtWord.replace(/\s/g, "").toLowerCase() === item.answer.replace(/\s/g, "").toLowerCase();
    const nextCorrect = correct + (ok ? 1 : 0);
    const nextStreak = ok ? streak + 1 : 0;
    setState(ok ? "right" : "wrong");
    setCorrect(nextCorrect);
    setStreak(nextStreak);
    setBestStreak((b) => Math.max(b, nextStreak));
  }

  function next() {
    setBuilt([]);
    setState("playing");
    if (index + 1 < items.length) setIndex(index + 1);
    else void finish(correct, Math.max(bestStreak, streak));
  }

  function restart() {
    sent.current = false;
    setDone(null);
    setIndex(0);
    setBuilt([]);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setState("playing");
    setRound((r) => r + 1);
    onRestart();
  }

  if (isLoading)
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <p className="text-sm text-muted-foreground">Loading words…</p>
      </div>
    );

  if (!items.length)
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No short flashcard terms are available for this selection yet. Try another chapter or difficulty.
        </div>
      </div>
    );

  if (done)
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
        />
      </div>
    );

  return (
    <div className="space-y-3">
      <GamePanelHeader
        def={def}
        onBack={onBack}
        right={
          <span className="inline-flex items-center gap-1 font-display font-semibold">
            <Flame className="h-4 w-4 text-[oklch(0.7_0.19_45)]" /> {streak}
          </span>
        }
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Word {index + 1} / {items.length}
        </span>
        <span>{correct} correct</span>
      </div>
      <GameProgressBar value={((index + 1) / items.length) * 100} gradient={def.gradient} />

      <div className={cn("rounded-2xl bg-gradient-to-br p-[1px]", def.gradient)}>
        <div className="rounded-2xl bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Clue</p>
          <p className="mt-1 font-medium">{item?.clue}</p>

          <div className="mt-4 min-h-14 rounded-xl border border-dashed border-border p-3 text-center font-display text-xl font-semibold tracking-wide">
            {builtWord || <span className="text-sm font-normal text-muted-foreground">Tap the letters below</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(item?.letters ?? []).map((letter, i) => (
              <button
                key={`${letter}-${i}`}
                type="button"
                disabled={built.includes(i) || state !== "playing"}
                onClick={() => setBuilt((b) => [...b, i])}
                className={cn(
                  "min-h-11 min-w-11 rounded-xl border border-border px-3 font-display text-lg font-semibold transition-all active:scale-95",
                  built.includes(i) ? "opacity-25" : "hover:border-primary",
                )}
              >
                {letter === " " ? "␣" : letter}
              </button>
            ))}
          </div>

          {state === "playing" ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => setBuilt((b) => b.slice(0, -1))}>
                <Delete className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="min-h-11" onClick={() => setBuilt([])}>
                Clear
              </Button>
              <Button className="min-h-11" disabled={!built.length} onClick={submitWord}>
                Check
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <p className={cn("text-sm font-medium", state === "right" ? "text-[oklch(0.74_0.16_162)]" : "text-[oklch(0.7_0.19_45)]")}>
                {state === "right" ? "Correct!" : `The answer was “${item?.answer}”.`}
              </p>
              <Button className="min-h-11 w-full" onClick={next}>
                {index + 1 < items.length ? "Next word" : "Finish"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
