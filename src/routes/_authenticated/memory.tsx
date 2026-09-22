import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Brain, Check, Eye, RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/memory")({
  head: () => ({
    meta: [
      { title: "Memory Mode — Class 10 Study Hub" },
      { name: "description", content: "Study a few flashcards, hide them, then test how much you actually remember." },
      { property: "og:title", content: "Memory Mode — Class 10 Study Hub" },
      { property: "og:description", content: "Memorise then recall real flashcards from your Class 10 study material." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryPage,
});

const STUDY_SECONDS = 25;
const CARD_COUNT = 5;

function MemoryPage() {
  const { data: session } = useSessionInfo();
  const queryClient = useQueryClient();
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"study" | "recall" | "result">("study");
  const [left, setLeft] = useState(STUDY_SECONDS);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const { data: pool, isLoading } = useQuery({
    queryKey: ["memory-cards", round],
    queryFn: async () => {
      const { data } = await supabase.from("flashcards").select("id, front, back").limit(120);
      return data ?? [];
    },
  });

  const cards = useMemo(() => {
    const list = [...(pool ?? [])];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list.slice(0, CARD_COUNT);
  }, [pool]);

  useEffect(() => {
    if (phase !== "study" || !cards.length) return;
    setLeft(STUDY_SECONDS);
    const started = Date.now();
    const t = setInterval(() => {
      const remaining = STUDY_SECONDS - Math.round((Date.now() - started) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(t);
        setPhase("recall");
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase, cards.length, round]);

  async function mark(correct: boolean) {
    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);
    setRevealed(false);
    if (index + 1 < cards.length) {
      setIndex(index + 1);
      return;
    }
    setPhase("result");
    if (session?.userId) {
      await supabase.from("challenge_sessions").insert({
        user_id: session.userId,
        mode: "memory",
        score: nextScore,
        total: cards.length,
        seconds: STUDY_SECONDS,
      });
      await supabase.from("activity_logs").insert({
        user_id: session.userId,
        event: "Memory Mode completed",
        detail: `${nextScore}/${cards.length} recalled`,
      });
      await queryClient.invalidateQueries({ queryKey: ["challenge-stats", "memory"] });
    }
  }

  function restart() {
    setRound((r) => r + 1);
    setPhase("study");
    setIndex(0);
    setScore(0);
    setRevealed(false);
  }

  const card = cards[index];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Brain className="h-5 w-5 text-[oklch(0.54_0.26_285)]" /> Memory Mode
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Memorise the cards, then recall them from memory.</p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading flashcards…</p>
      ) : !cards.length ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No flashcards available yet.{" "}
          <Link to="/flashcards" className="text-primary">
            Create some first
          </Link>
          .
        </div>
      ) : phase === "study" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Memorise these {cards.length} cards</span>
            <span className="font-display font-semibold">{left}s</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.54_0.26_285)] to-[oklch(0.65_0.29_319)]"
              style={{ width: `${(left / STUDY_SECONDS) * 100}%` }}
            />
          </div>
          <div className="space-y-2">
            {cards.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-medium">{c.front}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.back}</p>
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => setPhase("recall")}>
            I'm ready — hide the cards
          </Button>
        </section>
      ) : phase === "recall" ? (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Recall {index + 1} / {cards.length}
          </p>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-medium">{card?.front}</p>
            {revealed ? (
              <p className="mt-3 rounded-xl border border-border p-3 text-sm">{card?.back}</p>
            ) : (
              <Button variant="outline" className="mt-3 w-full" onClick={() => setRevealed(true)}>
                <Eye className="mr-2 h-4 w-4" /> Show answer
              </Button>
            )}
          </div>
          {revealed && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => void mark(false)}>
                <X className="mr-2 h-4 w-4" /> Missed it
              </Button>
              <Button className="min-h-11" onClick={() => void mark(true)}>
                <Check className="mr-2 h-4 w-4" /> Remembered
              </Button>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <Brain className="mx-auto h-8 w-8 text-[oklch(0.54_0.26_285)]" />
          <p className="mt-2 font-display text-3xl font-bold">
            {score}/{cards.length}
          </p>
          <p className="text-sm text-muted-foreground">cards recalled</p>
          <Button className="mt-4" onClick={restart}>
            <RotateCcw className="mr-2 h-4 w-4" /> New round
          </Button>
        </section>
      )}
    </div>
  );
}
