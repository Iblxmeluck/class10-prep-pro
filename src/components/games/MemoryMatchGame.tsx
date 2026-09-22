import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Timer } from "lucide-react";
import { toast } from "sonner";
import { getGamePairs, submitGameRound } from "@/lib/games.functions";
import type { GameDef } from "@/lib/games.catalog";
import { GamePanelHeader, GameProgressBar, GameResultPanel, type GameScope } from "@/components/games/GameShared";
import { cn } from "@/lib/utils";

type Card = { uid: string; pairId: string; text: string; side: "front" | "back" };
type Submitted = Awaited<ReturnType<typeof submitGameRound>>;

const PAIRS_BY_LEVEL = { Easy: 4, Medium: 6, Hard: 8 } as const;

/** Memory Match — face-down cards built from existing flashcard pairs. */
export function MemoryMatchGame({ def, scope, onBack, onRestart }: { def: GameDef; scope: GameScope; onBack: () => void; onRestart: () => void }) {
  const loadPairs = useServerFn(getGamePairs);
  const submit = useServerFn(submitGameRound);
  const queryClient = useQueryClient();

  const pairCount = PAIRS_BY_LEVEL[scope.difficulty];
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<Submitted | null>(null);
  const startedAt = useRef(Date.now());
  const sent = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["game-pairs", def.key, round, pairCount, scope.subjectId, scope.chapterId, scope.topicId],
    queryFn: () =>
      loadPairs({
        data: {
          count: pairCount,
          ...(scope.subjectId ? { subjectId: scope.subjectId } : {}),
          ...(scope.chapterId ? { chapterId: scope.chapterId } : {}),
          ...(scope.topicId ? { topicId: scope.topicId } : {}),
        },
      }),
  });

  const pairs = data?.pairs ?? [];

  const cards = useMemo<Card[]>(() => {
    const list: Card[] = [];
    for (const p of pairs) {
      list.push({ uid: `${p.id}-f`, pairId: p.id, text: p.front, side: "front" });
      list.push({ uid: `${p.id}-b`, pairId: p.id, text: p.back, side: "back" });
    }
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list;
  }, [pairs]);

  useEffect(() => {
    if (done || !cards.length) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [cards.length, done]);

  useEffect(() => {
    if (!pairs.length || matched.length !== pairs.length || sent.current) return;
    sent.current = true;
    const seconds = Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000));
    void (async () => {
      try {
        const result = await submit({
          data: {
            gameKey: "memory_match",
            seconds,
            correct: pairs.length,
            total: Math.max(pairs.length, attempts),
            points: Math.max(0, pairs.length * 20 - Math.max(0, attempts - pairs.length) * 2),
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched.length, pairs.length]);

  function flip(card: Card) {
    if (done || matched.includes(card.pairId) || flipped.includes(card.uid) || flipped.length === 2) return;
    const next = [...flipped, card.uid];
    setFlipped(next);
    if (next.length < 2) return;
    setAttempts((a) => a + 1);
    const [a, b] = next;
    const cardA = cards.find((c) => c.uid === a)!;
    const cardB = cards.find((c) => c.uid === b)!;
    if (cardA.pairId === cardB.pairId) {
      setMatched((m) => [...m, cardA.pairId]);
      setFlipped([]);
    } else {
      setTimeout(() => setFlipped([]), 750);
    }
  }

  function restart() {
    sent.current = false;
    setDone(null);
    setFlipped([]);
    setMatched([]);
    setAttempts(0);
    setRound((r) => r + 1);
    startedAt.current = Date.now();
    onRestart();
  }

  if (isLoading)
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <p className="text-sm text-muted-foreground">Loading cards…</p>
      </div>
    );

  if (pairs.length < 2)
    return (
      <div className="space-y-3">
        <GamePanelHeader def={def} onBack={onBack} />
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Not enough flashcards for this selection yet. Try another chapter or subject.
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
          wrong={Math.max(0, attempts - pairs.length)}
          total={done.total}
          seconds={done.seconds}
          personalBest={Math.max(done.previousBest, done.score)}
          beatenBest={done.beatenBest}
          onPlayAgain={restart}
          onBack={onBack}
        />
      </div>
    );

  const accuracy = attempts ? Math.round((matched.length / attempts) * 100) : 0;

  return (
    <div className="space-y-3">
      <GamePanelHeader
        def={def}
        onBack={onBack}
        right={
          <span className="inline-flex items-center gap-1 font-display font-semibold">
            <Timer className="h-4 w-4" /> {elapsed}s
          </span>
        }
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {matched.length}/{pairs.length} pairs · {attempts} tries
        </span>
        <span>{accuracy}% accuracy</span>
      </div>
      <GameProgressBar value={(matched.length / pairs.length) * 100} gradient={def.gradient} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => {
          const isOpen = flipped.includes(card.uid) || matched.includes(card.pairId);
          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => flip(card)}
              className={cn(
                "min-h-24 rounded-xl border p-2.5 text-left text-xs transition-all duration-200 [transform-style:preserve-3d] active:scale-95",
                isOpen
                  ? "border-transparent bg-gradient-to-br text-card-foreground [transform:rotateY(0deg)] " + def.gradient
                  : "border-border bg-muted/40 [transform:rotateY(8deg)]",
                matched.includes(card.pairId) && "opacity-60",
              )}
            >
              {isOpen ? (
                <span className="line-clamp-5 rounded-lg bg-card/85 p-1.5 leading-snug">{card.text}</span>
              ) : (
                <span className="grid h-full place-items-center font-display text-2xl">{def.emoji}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
