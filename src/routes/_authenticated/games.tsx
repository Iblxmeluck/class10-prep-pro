import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gamepad2, Flame, Search, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getGamesOverview, setGameEnabled } from "@/lib/games.functions";
import { GAMES, SUBJECT_FILTERS, type GameDef } from "@/lib/games.catalog";
import { GameRunner } from "@/components/games/GameRunner";
import { formatDuration, type GameScope } from "@/components/games/GameShared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({
    meta: [
      { title: "Learning Games — Class 10 Study Hub" },
      { name: "description", content: "Nine interactive CBSE Class 10 learning games built on your own questions and flashcards." },
      { property: "og:title", content: "Learning Games — Class 10 Study Hub" },
      { property: "og:description", content: "Play Study Battle, Memory Match, Knowledge Millionaire and more — all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamesPage,
});

type Difficulty = GameScope["difficulty"];

function GamesPage() {
  const loadOverview = useServerFn(getGamesOverview);
  const toggleGame = useServerFn(setGameEnabled);
  const queryClient = useQueryClient();

  const [active, setActive] = useState<GameDef | null>(null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState<(typeof SUBJECT_FILTERS)[number]>("All");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");

  const { data: overview, isLoading } = useQuery({
    queryKey: ["games-overview"],
    queryFn: () => loadOverview({ data: undefined }),
  });

  const toggle = useMutation({
    mutationFn: (vars: { gameKey: GameDef["key"]; enabled: boolean }) => toggleGame({ data: vars }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["games-overview"] });
      toast.success("Game availability updated");
    },
    onError: () => toast.error("Could not update this game"),
  });

  const isAdmin = !!overview?.isAdmin;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return GAMES.filter((g) => {
      if (!isAdmin && overview && overview.enabled[g.key] === false) return false;
      if (subject !== "All" && g.subjectName && !subject.toLowerCase().includes(g.subjectName.toLowerCase())) return false;
      if (!g.difficulties.includes(difficulty)) return false;
      if (term && !`${g.title} ${g.blurb}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [search, subject, difficulty, isAdmin, overview]);

  if (active) {
    return (
      <div className="mx-auto max-w-3xl">
        <GameRunner def={active} difficulty={difficulty} onBack={() => setActive(null)} />
      </div>
    );
  }

  const stats = overview?.stats;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl bg-gradient-to-br from-[oklch(0.54_0.26_285)] via-[oklch(0.65_0.29_319)] to-[oklch(0.64_0.2_254)] p-[1px]">
        <div className="rounded-2xl bg-card p-4 sm:p-5">
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold sm:text-2xl">
            <Gamepad2 className="h-6 w-6 text-[oklch(0.65_0.29_319)]" /> 🎮 Learning Games
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Learn, practice and challenge yourself through interactive games.</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <MiniStat emoji="🎯" label="Games played" value={stats ? String(stats.played) : "—"} />
            <MiniStat emoji="🏆" label="Best score" value={stats ? String(stats.best) : "—"} />
            <MiniStat emoji="🔥" label="Game streak" value={stats ? `${stats.streak}d` : "—"} />
            <MiniStat emoji="⏱️" label="Game time" value={stats ? formatDuration(stats.secondsTotal) : "—"} />
            <MiniStat
              emoji="⭐"
              label="Achievements"
              value={overview ? `${overview.achievements.filter((a) => a.unlocked).length}/${overview.achievements.length}` : "—"}
            />
          </div>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search games…" className="min-h-11 pl-9" />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SUBJECT_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                subject === s ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={cn(
                "min-h-9 flex-1 rounded-full border px-3 text-xs font-medium transition-colors",
                difficulty === d ? "border-transparent bg-secondary text-secondary-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading games…</p>
      ) : !visible.length ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No games match these filters.
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((g) => {
            const disabled = overview?.enabled[g.key] === false;
            return (
              <div key={g.key} className={cn("rounded-2xl bg-gradient-to-br p-[1px] transition-transform active:scale-[0.99]", g.gradient)}>
                <div className="flex h-full flex-col rounded-2xl bg-card p-4">
                  <span className="text-3xl">{g.emoji}</span>
                  <p className="mt-2 font-display text-base font-semibold">{g.title}</p>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{g.blurb}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                      <Trophy className="h-3 w-3" /> Best {overview?.bestByGame[g.key] ?? 0}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5">{overview?.playsByGame[g.key] ?? 0} plays</span>
                    {g.limitSeconds ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                        <Timer className="h-3 w-3" /> {g.limitSeconds}s
                      </span>
                    ) : null}
                    {g.subjectName ? <span className="rounded-full border border-border px-2 py-0.5">{g.subjectName}</span> : null}
                  </div>
                  <Button className="mt-3 min-h-11 w-full" disabled={disabled} onClick={() => setActive(g)}>
                    {disabled ? "Turned off by teacher" : "Play"}
                  </Button>
                  {isAdmin ? (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2">
                      <Label htmlFor={`enable-${g.key}`} className="text-xs text-muted-foreground">
                        Available to members
                      </Label>
                      <Switch
                        id={`enable-${g.key}`}
                        checked={overview?.enabled[g.key] !== false}
                        onCheckedChange={(checked) => toggle.mutate({ gameKey: g.key, enabled: checked })}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Flame className="h-4 w-4 text-[oklch(0.7_0.19_45)]" /> Game achievements
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(overview?.achievements ?? []).map((a) => (
            <div
              key={a.key}
              className={cn(
                "rounded-xl border p-3 text-center",
                a.unlocked ? "border-transparent bg-gradient-to-br from-[oklch(0.86_0.16_86)]/15 to-[oklch(0.7_0.19_45)]/15" : "border-border opacity-60",
              )}
            >
              <span className="text-2xl">{a.emoji}</span>
              <p className="mt-1 text-xs font-medium">{a.label}</p>
              <p className="text-[11px] text-muted-foreground">{a.unlocked ? "Unlocked" : "Locked"}</p>
            </div>
          ))}
        </div>
      </section>

      {overview?.recent.length ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-base font-semibold">Your recent games</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {overview.recent.map((r, i) => (
              <li key={`${r.game_key}-${i}`} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate">{GAMES.find((g) => g.key === r.game_key)?.title ?? r.game_key}</span>
                <span className="shrink-0 text-muted-foreground">
                  {r.correct}/{r.total} · {r.score} pts
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MiniStat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2.5 text-center">
      <span className="text-base">{emoji}</span>
      <p className="font-display text-base font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
