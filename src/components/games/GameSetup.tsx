import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import type { GameDef } from "@/lib/games.catalog";
import type { GameScope } from "@/components/games/GameShared";
import { useChapters, useSubjects } from "@/components/app/SubjectChapterPicker";
import { useTopics } from "@/components/app/TopicSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Subject → Chapter → Topic + difficulty picker shown before a game round starts. */
export function GameSetup({ def, difficulty, onStart }: { def: GameDef; difficulty: GameScope["difficulty"]; onStart: (scope: GameScope) => void }) {
  const subjects = useSubjects();
  const lockedSubject = useMemo(
    () => (def.subjectName ? (subjects.data ?? []).find((s) => s.name.toLowerCase().includes(def.subjectName!.toLowerCase())) : undefined),
    [def.subjectName, subjects.data],
  );

  const [subjectId, setSubjectId] = useState<string>("all");
  const effectiveSubject = lockedSubject?.id ?? (subjectId === "all" ? undefined : subjectId);
  const chapters = useChapters(effectiveSubject ?? null);
  const [chapterId, setChapterId] = useState<string>("all");
  const effectiveChapter = chapterId === "all" ? undefined : chapterId;
  const topics = useTopics(effectiveChapter ?? null);
  const [topicId, setTopicId] = useState<string>("all");
  const [level, setLevel] = useState<GameScope["difficulty"]>(difficulty);

  return (
    <div className="space-y-4">
      <div className={cn("rounded-2xl bg-gradient-to-br p-[1px]", def.gradient)}>
        <div className="rounded-2xl bg-card p-4">
          <p className="font-display text-lg font-semibold">
            {def.emoji} {def.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{def.blurb}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Subject</Label>
          {lockedSubject ? (
            <div className="flex min-h-10 items-center rounded-md border border-border px-3 text-sm">{lockedSubject.name}</div>
          ) : (
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                setChapterId("all");
                setTopicId("all");
              }}
            >
              <SelectTrigger className="min-h-10">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Chapter</Label>
          <Select
            value={chapterId}
            onValueChange={(v) => {
              setChapterId(v);
              setTopicId("all");
            }}
            disabled={!effectiveSubject}
          >
            <SelectTrigger className="min-h-10">
              <SelectValue placeholder={effectiveSubject ? "All chapters" : "Pick a subject first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chapters</SelectItem>
              {(chapters.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Topic</Label>
          <Select value={topicId} onValueChange={setTopicId} disabled={!effectiveChapter || !(topics.data ?? []).length}>
            <SelectTrigger className="min-h-10">
              <SelectValue placeholder={effectiveChapter ? "All topics" : "Pick a chapter first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {(topics.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as GameScope["difficulty"])}>
            <SelectTrigger className="min-h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {def.difficulties.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        className="min-h-12 w-full text-base"
        onClick={() =>
          onStart({
            subjectId: effectiveSubject,
            chapterId: effectiveChapter,
            topicId: topicId === "all" ? undefined : topicId,
            difficulty: level,
          })
        }
      >
        <Play className="mr-2 h-5 w-5" /> Start {def.title}
      </Button>
    </div>
  );
}
