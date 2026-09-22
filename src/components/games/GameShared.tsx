import type { ReactNode } from "react";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import type { GameDef } from "@/lib/games.catalog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GameScope = {
  subjectId?: string | undefined;
  chapterId?: string | undefined;
  topicId?: string | undefined;
  difficulty: "Easy" | "Medium" | "Hard";
};

export function GamePanelHeader({ def, onBack, right }: { def: GameDef; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background/90 px-1 py-2 backdrop-blur">
      <Button variant="outline" size="sm" onClick={onBack} className="min-h-10 shrink-0">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Games
      </Button>
      <span className="truncate font-display text-sm font-semibold">
        {def.emoji} {def.title}
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-2 text-sm">{right}</div>
    </div>
  );
}

export function GameProgressBar({ value, gradient }: { value: number; gradient: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full bg-gradient-to-r transition-all", gradient)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function GameStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
      <p className={cn("font-display text-lg font-bold", accent)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function GameResultPanel({
  def,
  score,
  correct,
  wrong,
  total,
  seconds,
  personalBest,
  beatenBest,
  onPlayAgain,
  onBack,
  children,
}: {
  def: GameDef;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  seconds: number;
  personalBest: number;
  beatenBest: boolean;
  onPlayAgain: () => void;
  onBack: () => void;
  children?: ReactNode;
}) {
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className={cn("rounded-2xl bg-gradient-to-br p-[1px]", def.gradient)}>
        <div className="rounded-2xl bg-card p-5 text-center">
          <Trophy className={cn("mx-auto h-9 w-9", def.accent)} />
          <p className="mt-2 font-display text-4xl font-bold">{score}</p>
          <p className="text-sm text-muted-foreground">
            {correct}/{total} correct · {accuracy}% accuracy · {formatDuration(seconds)}
          </p>
          <p className="mt-2 text-sm">
            {beatenBest ? (
              <span className="font-medium text-[oklch(0.74_0.16_162)]">New personal best!</span>
            ) : (
              <span className="text-muted-foreground">Personal best: {personalBest}</span>
            )}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <GameStat label="Correct" value={String(correct)} accent="text-[oklch(0.74_0.16_162)]" />
            <GameStat label="Wrong" value={String(wrong)} accent="text-[oklch(0.7_0.19_45)]" />
            <GameStat label="Time" value={formatDuration(seconds)} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button onClick={onPlayAgain} className="min-h-11">
              <RotateCcw className="mr-2 h-4 w-4" /> Play again
            </Button>
            <Button variant="outline" onClick={onBack} className="min-h-11">
              Choose another game
            </Button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
