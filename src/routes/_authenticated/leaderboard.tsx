import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Medal } from "lucide-react";
import { toast } from "sonner";
import { getLeaderboard, saveLeaderboardPrefs } from "@/lib/mistakes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Weekly EXP leaderboard — CBSE 10 Prep" },
      { name: "description", content: "A friendly weekly class leaderboard of EXP earned, with nickname and opt-out privacy." },
      { property: "og:title", content: "Weekly EXP leaderboard — CBSE 10 Prep" },
      { property: "og:description", content: "See who earned the most EXP this week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Leaderboard,
});

type Metric = "exp" | "correct" | "attempted" | "accuracy" | "study" | "quizzes";
const METRICS: { id: Metric; label: string; hint: string }[] = [
  { id: "exp", label: "🌟 EXP", hint: "EXP earned since Monday." },
  { id: "correct", label: "🎯 Correct", hint: "Correct answers since Monday." },
  { id: "attempted", label: "📝 Attempted", hint: "Questions answered since Monday." },
  { id: "accuracy", label: "💯 Accuracy", hint: "% correct this week (min. 20 questions to qualify)." },
  { id: "study", label: "⏱️ Study time", hint: "Time on the study timer since Monday." },
  { id: "quizzes", label: "🏆 Quizzes & tests", hint: "Quizzes and tests completed since Monday." },
];
function fmtValue(m: Metric, v: number) {
  if (m === "exp") return `${v} EXP`;
  if (m === "accuracy") return `${v}%`;
  if (m === "study") { const h = Math.floor(v / 3600), mm = Math.floor((v % 3600) / 60); return h ? `${h}h ${mm}m` : `${mm}m`; }
  if (m === "correct") return `${v} correct`;
  if (m === "attempted") return `${v} answered`;
  return `${v} done`;
}

function Leaderboard() {
  const load = useServerFn(getLeaderboard);
  const save = useServerFn(saveLeaderboardPrefs);
  const qc = useQueryClient();
  const [metric, setMetric] = useState<Metric>("exp");
  const { data, isLoading } = useQuery({ queryKey: ["leaderboard", metric], queryFn: () => load({ data: { metric } }) });
  const [nick, setNick] = useState("");
  const [optOut, setOptOut] = useState(false);
  useEffect(() => { if (data) { setNick(data.prefs.nickname); setOptOut(data.prefs.optOut); } }, [data]);

  async function persist(o: boolean, n: string) {
    try { await save({ data: { optOut: o, nickname: n } }); toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["leaderboard"] }); }
    catch { toast.error("Could not save"); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Crown className="h-6 w-6" /> Weekly leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{METRICS.find((m) => m.id === metric)?.hint} Resets every Monday.</p>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {METRICS.map((m) => (
          <Button key={m.id} size="sm" variant={metric === m.id ? "default" : "outline"} className="shrink-0 rounded-full" onClick={() => setMetric(m.id)}>
            {m.label}
          </Button>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-medium">Hide me from the leaderboard</p><p className="text-xs text-muted-foreground">Others won't see your name or scores.</p></div>
          <Switch checked={optOut} onCheckedChange={(v) => { setOptOut(v); void persist(v, nick); }} />
        </div>
        <div className="flex gap-2">
          <Input placeholder="Nickname (optional)" maxLength={24} value={nick} onChange={(e) => setNick(e.target.value)} />
          <Button variant="outline" onClick={() => void persist(optOut, nick)}>Save</Button>
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data?.rows.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No one on this board yet this week. Be the first!</div>
      ) : (
        <ol className="grid gap-2">
          {data.rows.map((r, k) => (
            <li key={k} className={cn("flex items-center gap-3 rounded-xl border border-border bg-card p-3", r.is_me && "border-primary bg-primary/10")}>
              <span className="w-8 text-center font-display font-semibold">{Number(r.rank) <= 3 ? <Medal className="mx-auto h-5 w-5 text-primary" /> : r.rank}</span>
              <span className="flex-1 truncate font-medium">{r.name}{r.is_me ? " (you)" : ""}</span>
              <span className="font-display font-semibold">{fmtValue(metric, r.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
