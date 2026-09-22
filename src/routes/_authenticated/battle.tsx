import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Swords } from "lucide-react";
import { getChallengeStats } from "@/lib/challenge.functions";
import { QuickQuizRunner } from "@/components/app/QuickQuizRunner";

export const Route = createFileRoute("/_authenticated/battle")({
  head: () => ({
    meta: [
      { title: "Study Battle — Class 10 Study Hub" },
      { name: "description", content: "Beat your own previous score in a 10-question Class 10 study battle." },
      { property: "og:title", content: "Study Battle — Class 10 Study Hub" },
      { property: "og:description", content: "Compete against your own best score on real practice questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BattlePage,
});

function BattlePage() {
  const { data: stats } = useQuery({
    queryKey: ["challenge-stats", "battle"],
    queryFn: () => getChallengeStats({ data: { mode: "battle" } }),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Swords className="h-5 w-5 text-[oklch(0.65_0.29_319)]" /> Study Battle
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Ten questions. Your only opponent is your previous best.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Best" value={stats ? String(stats.best) : "—"} />
          <Stat label="Last" value={stats?.last ? `${stats.last.score}/${stats.last.total}` : "—"} />
          <Stat label="Battles" value={stats ? String(stats.plays) : "—"} />
        </div>
      </header>
      <QuickQuizRunner mode="battle" count={10} limitSeconds={null} accent="text-[oklch(0.65_0.29_319)]" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2.5">
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
