import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Flame,
  Layers,
  NotebookPen,
  Play,
  Target,
  Trophy,
  Video,
  FileText,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EventRow = { id: string; name: string; event_type: string; start_date: string; end_date: string };

export const RESOURCE_KINDS = [
  { value: "note", label: "Notes" },
  { value: "video", label: "Video" },
  { value: "resource", label: "PDF / Image" },
  { value: "flashcards", label: "Flashcards" },
  { value: "quiz", label: "Quiz" },
  { value: "questions", label: "Practice questions" },
] as const;

type TaskResource = { id: string; kind: string; ref_id: string | null; label: string };
type Task = {
  id: string;
  title: string;
  instructions: string;
  subject_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  sort_order: number;
  event_task_resources: TaskResource[];
};
type Day = { id: string; day_number: number; day_date: string | null; title: string; event_tasks: Task[] };

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function dayDateFor(event: EventRow, dayNumber: number) {
  const d = new Date(`${event.start_date}T00:00:00`);
  d.setDate(d.getDate() + dayNumber - 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function useEventPlan(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-plan", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_days")
        .select(
          "id, day_number, day_date, title, event_tasks(id, title, instructions, subject_id, chapter_id, topic_id, sort_order, event_task_resources(id, kind, ref_id, label))",
        )
        .eq("event_id", eventId!)
        .order("day_number");
      if (error) throw new Error(error.message);
      return (data ?? []).map((d) => ({
        ...d,
        event_tasks: [...(d.event_tasks ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      })) as Day[];
    },
  });
}

export function useActiveEvents() {
  return useQuery({
    queryKey: ["exam-events-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_events")
        .select("id, name, event_type, start_date, end_date, is_active")
        .eq("is_active", true)
        .order("start_date", { ascending: false });
      return (data ?? []) as (EventRow & { is_active: boolean })[];
    },
  });
}

function ResourceButtons({ task, urls }: { task: Task; urls: Record<string, string> }) {
  const items = task.event_task_resources ?? [];
  if (!items.length && !task.chapter_id) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((r) => {
        const cls =
          "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs transition-colors hover:border-primary";
        if ((r.kind === "note" || r.kind === "video") && r.ref_id && urls[r.ref_id]) {
          return (
            <a key={r.id} href={urls[r.ref_id]} target="_blank" rel="noreferrer" className={cls}>
              {r.kind === "note" ? <NotebookPen className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
              {r.label || (r.kind === "note" ? "Open notes" : "Watch video")}
            </a>
          );
        }
        if (r.kind === "note")
          return (
            <Link key={r.id} to="/notes" className={cls}>
              <NotebookPen className="h-3.5 w-3.5" /> {r.label || "Open notes"}
            </Link>
          );
        if (r.kind === "video")
          return (
            <Link key={r.id} to="/videos" className={cls}>
              <Video className="h-3.5 w-3.5" /> {r.label || "Watch video"}
            </Link>
          );
        if (r.kind === "resource")
          return (
            <Link key={r.id} to="/resources" className={cls}>
              <FileText className="h-3.5 w-3.5" /> {r.label || "Open resource"}
            </Link>
          );
        if (r.kind === "flashcards")
          return (
            <Link key={r.id} to="/flashcards" className={cls}>
              <Layers className="h-3.5 w-3.5" /> {r.label || "Open flashcards"}
            </Link>
          );
        if (r.kind === "quiz")
          return (
            <Link key={r.id} to="/quizzes" className={cls}>
              <ClipboardList className="h-3.5 w-3.5" /> {r.label || "Start quiz"}
            </Link>
          );
        return (
          <Link
            key={r.id}
            to="/practice"
            search={{
              ...(task.subject_id ? { subject: task.subject_id } : {}),
              ...(task.chapter_id ? { chapter: task.chapter_id } : {}),
            }}
            className={cls}
          >
            <Play className="h-3.5 w-3.5" /> {r.label || "Start questions"}
          </Link>
        );
      })}
    </div>
  );
}

export function EventPrep({ events }: { events: EventRow[] }) {
  const qc = useQueryClient();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const event = events.find((e) => e.id === eventId) ?? events[0]!;
  const plan = useEventPlan(event.id);
  const days = plan.data ?? [];

  const today = todayISO();
  const todayIndex = useMemo(() => {
    const i = days.findIndex((d) => (d.day_date ?? dayDateFor(event, d.day_number)) === today);
    if (i >= 0) return i;
    const past = days.filter((d) => (d.day_date ?? dayDateFor(event, d.day_number)) < today).length;
    return Math.min(Math.max(past - 1, 0), Math.max(days.length - 1, 0));
  }, [days, event, today]);

  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const index = viewIndex ?? todayIndex;
  const day = days[index];

  const allTaskIds = days.flatMap((d) => d.event_tasks.map((t) => t.id));

  const completions = useQuery({
    queryKey: ["event-completions", event.id],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as string[];
      const { data } = await supabase.from("event_task_completions").select("task_id").eq("user_id", auth.user.id);
      return (data ?? []).map((r) => r.task_id);
    },
  });
  const doneSet = new Set(completions.data ?? []);

  const linkIds = days
    .flatMap((d) => d.event_tasks.flatMap((t) => t.event_task_resources ?? []))
    .filter((r) => (r.kind === "note" || r.kind === "video") && r.ref_id)
    .map((r) => r.ref_id!);
  const urlsQuery = useQuery({
    queryKey: ["event-link-urls", event.id, linkIds.length],
    enabled: linkIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("links").select("id, url").in("id", linkIds);
      return Object.fromEntries((data ?? []).map((l) => [l.id, l.url])) as Record<string, string>;
    },
  });

  const toggle = useMutation({
    mutationFn: async (v: { taskId: string; done: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again");
      if (v.done) {
        const { error } = await supabase
          .from("event_task_completions")
          .delete()
          .eq("task_id", v.taskId)
          .eq("user_id", auth.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("event_task_completions")
          .insert({ task_id: v.taskId, user_id: auth.user.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["event-completions", event.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const totalTasks = allTaskIds.length;
  const totalDone = allTaskIds.filter((id) => doneSet.has(id)).length;
  const overall = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;

  const dayTasks = day?.event_tasks ?? [];
  const dayDone = dayTasks.filter((t) => doneSet.has(t.id)).length;
  const dayPct = dayTasks.length ? Math.round((dayDone / dayTasks.length) * 100) : 0;

  const todayTasks = days[todayIndex]?.event_tasks ?? [];
  const todayPct = todayTasks.length
    ? Math.round((todayTasks.filter((t) => doneSet.has(t.id)).length / todayTasks.length) * 100)
    : 0;

  const completedDays = days.filter(
    (d) => d.event_tasks.length > 0 && d.event_tasks.every((t) => doneSet.has(t.id)),
  ).length;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(`${event.end_date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000),
  );

  const streak = useQuery({
    queryKey: ["study-streak-mini"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return 0;
      const { data } = await supabase
        .from("study_days")
        .select("study_date, seconds")
        .eq("user_id", auth.user.id)
        .order("study_date", { ascending: false })
        .limit(120);
      let count = 0;
      const cur = new Date(`${today}T00:00:00`);
      for (const row of data ?? []) {
        if (row.seconds < 600) continue;
        const expected = new Date(cur.getTime() - count * 86400000).toISOString().slice(0, 10);
        if (row.study_date === expected) count += 1;
        else if (count > 0) break;
      }
      return count;
    },
  });

  const dayDate = day ? (day.day_date ?? dayDateFor(event, day.day_number)) : null;
  const isUpcoming = !!dayDate && dayDate > today;
  const eventComplete = totalTasks > 0 && totalDone === totalTasks;

  return (
    <div className="space-y-4">
      <header className="dashboard-panel rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{event.event_type}</p>
            <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Target className="h-5 w-5 text-primary" /> {event.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {event.start_date} → {event.end_date}
            </p>
          </div>
          {events.length > 1 && (
            <Select
              value={event.id}
              onValueChange={(v) => {
                setEventId(v);
                setViewIndex(null);
              }}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat icon={<CalendarDays className="h-4 w-4" />} label="Days left" value={`${daysLeft}`} />
          <Stat icon={<Target className="h-4 w-4" />} label="Event progress" value={`${overall}%`} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Today" value={`${todayPct}%`} />
          <Stat icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak.data ?? 0}d`} />
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[oklch(0.64_0.2_254)] to-[oklch(0.65_0.29_319)] transition-all"
            style={{ width: `${overall}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {totalDone} of {totalTasks} tasks done · {completedDays} of {days.length} days complete
        </p>

        {eventComplete && (
          <p className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-center font-display font-semibold">
            🏆 Event Completed
          </p>
        )}
      </header>

      {!days.length ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Your teacher has not published the daily plan for this event yet.
        </div>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous day"
              disabled={index === 0}
              onClick={() => setViewIndex(Math.max(0, index - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 text-center">
              <p className="font-display font-semibold">
                {index === todayIndex ? "TODAY — " : ""}DAY {day?.day_number}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {dayDate}
                {day?.title ? ` · ${day.title}` : ""}
                {isUpcoming ? " · Upcoming" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next day"
              disabled={index >= days.length - 1}
              onClick={() => setViewIndex(Math.min(days.length - 1, index + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${dayPct}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {dayDone}/{dayTasks.length} tasks · {dayPct}%
          </p>

          <div className="mt-3 space-y-2">
            {dayTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks for this day.</p>}
            {dayTasks.map((t) => {
              const done = doneSet.has(t.id);
              return (
                <div key={t.id} className={cn("rounded-xl border border-border p-3", done && "opacity-70")}>
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ taskId: t.id, done })}
                    className="flex w-full items-start gap-2 text-left"
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.74_0.16_162)]" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-medium", done && "line-through")}>{t.title}</span>
                      {t.instructions && <span className="block text-xs text-muted-foreground">{t.instructions}</span>}
                    </span>
                  </button>
                  <ResourceButtons task={t} urls={urlsQuery.data ?? {}} />
                </div>
              );
            })}
          </div>

          {dayTasks.length > 0 && dayDone === dayTasks.length && (
            <p className="mt-3 rounded-xl border border-border bg-muted/40 p-2 text-center text-sm font-medium">
              ✅ Day Complete
            </p>
          )}

          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {days.map((d, i) => {
              const complete = d.event_tasks.length > 0 && d.event_tasks.every((t) => doneSet.has(t.id));
              const dd = d.day_date ?? dayDateFor(event, d.day_number);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setViewIndex(i)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-full border border-border px-3 text-xs",
                    i === index && "border-primary text-primary",
                    complete && "bg-[oklch(0.74_0.16_162)]/15",
                    dd > today && "opacity-60",
                  )}
                >
                  {complete ? "✓ " : ""}D{d.day_number}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="dashboard-stat rounded-xl border border-border p-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-0.5 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

export { Trophy };
