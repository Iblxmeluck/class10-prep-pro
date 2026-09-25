import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSubjects, useChapters } from "@/components/app/SubjectChapterPicker";
import { useTopics } from "@/components/app/TopicSelect";
import { RESOURCE_KINDS, dayDateFor, useEventPlan } from "@/components/app/EventPrep";
import { AutoPlanButton } from "@/components/app/AutoPlan";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({
    meta: [
      { title: "Exam Events — CBSE 10 Prep Admin" },
      { name: "description", content: "Create exam events, build day-by-day study plans and track member progress." },
      { property: "og:title", content: "Exam Events — CBSE 10 Prep Admin" },
      { property: "og:description", content: "Plan Half-Yearly, Pre-Board and Final exam preparation day by day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsAdmin,
});

const EVENT_TYPES = ["Half-Yearly", "Pre-Board", "Final Exam", "Unit Test", "Custom"];

function daysBetween(a: string, b: string) {
  const diff = (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000;
  return Math.floor(diff) + 1;
}

function EventsAdmin() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("");

  const events = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_events")
        .select("id, name, event_type, start_date, end_date, is_active")
        .order("start_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const [form, setForm] = useState({ name: "", event_type: "Pre-Board", start_date: "", end_date: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Give the event a name");
      if (!form.start_date || !form.end_date) throw new Error("Pick the start and end date");
      if (daysBetween(form.start_date, form.end_date) < 1) throw new Error("End date must be after the start date");
      const { data, error } = await supabase
        .from("exam_events")
        .insert({
          name: form.name.trim(),
          event_type: form.event_type,
          start_date: form.start_date,
          end_date: form.end_date,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => {
      setForm({ name: "", event_type: "Pre-Board", start_date: "", end_date: "" });
      setSelected(id);
      toast.success("Event created");
      void qc.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (v: { id: string; active: boolean }) => {
      const { error } = await supabase.from("exam_events").update({ is_active: v.active }).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-events"] });
      void qc.invalidateQueries({ queryKey: ["exam-events-active"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_events").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setSelected("");
      toast.success("Event deleted");
      void qc.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const current = (events.data ?? []).find((e) => e.id === selected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Exam events</h1>
        <p className="text-sm text-muted-foreground">
          Create an exam event, choose its syllabus, build the daily plan and track every member.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a new event</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Event name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pre-Board 2027"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="lg:col-span-5">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> Create event
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!(events.data ?? []).length && <p className="text-sm text-muted-foreground">No events yet.</p>}
          {(events.data ?? []).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(e.id)}>
                <span className="font-medium">{e.name}</span>{" "}
                <span className="text-muted-foreground">
                  · {e.event_type} · {e.start_date} → {e.end_date}
                </span>
              </button>
              <Badge variant={e.is_active ? "default" : "secondary"}>{e.is_active ? "Active" : "Archived"}</Badge>
              <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate({ id: e.id, active: !e.is_active })}>
                {e.is_active ? "Archive" : "Activate"}
              </Button>
              <Button size="sm" variant={selected === e.id ? "default" : "outline"} onClick={() => setSelected(e.id)}>
                Open
              </Button>
              <Button size="icon" variant="ghost" aria-label="Delete event" onClick={() => removeEvent.mutate(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {current && (
        <Tabs defaultValue="plan" className="space-y-4">
          <TabsList>
            <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
            <TabsTrigger value="plan">Build daily plan</TabsTrigger>
            <TabsTrigger value="tracking">Member tracking</TabsTrigger>
          </TabsList>
          <TabsContent value="syllabus">
            <SyllabusEditor eventId={current.id} />
          </TabsContent>
          <TabsContent value="plan">
            <PlanBuilder event={current} />
          </TabsContent>
          <TabsContent value="tracking">
            <EventTracking eventId={current.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SyllabusEditor({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState("");
  const chapters = useChapters(subjectId || null);

  const rows = useQuery({
    queryKey: ["event-syllabus", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_syllabus")
        .select("id, subject_id, chapter_id, subjects(name), chapters(name)")
        .eq("event_id", eventId);
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (chapterId: string | null) => {
      if (!subjectId) throw new Error("Pick a subject first");
      const { error } = await supabase
        .from("event_syllabus")
        .insert({ event_id: eventId, subject_id: subjectId, chapter_id: chapterId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["event-syllabus", eventId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_syllabus").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["event-syllabus", eventId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const chosen = new Set((rows.data ?? []).map((r) => r.chapter_id ?? ""));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Event syllabus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" disabled={!subjectId} onClick={() => add.mutate(null)}>
              Add whole subject
            </Button>
          </div>
        </div>

        {subjectId && (
          <div className="flex flex-wrap gap-2">
            {(chapters.data ?? []).map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={chosen.has(c.id) ? "default" : "outline"}
                onClick={() => add.mutate(c.id)}
                disabled={chosen.has(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {!(rows.data ?? []).length && <p className="text-sm text-muted-foreground">No syllabus chosen yet.</p>}
          {(rows.data ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="flex-1">
                {(r.subjects as { name?: string } | null)?.name ?? "Subject"}
                {r.chapter_id ? ` · ${(r.chapters as { name?: string } | null)?.name ?? ""}` : " · All chapters"}
              </span>
              <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => remove.mutate(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type EventRow = { id: string; name: string; event_type: string; start_date: string; end_date: string };

function PlanBuilder({ event }: { event: EventRow }) {
  const qc = useQueryClient();
  const plan = useEventPlan(event.id);
  const days = plan.data ?? [];
  const total = Math.max(1, daysBetween(event.start_date, event.end_date));

  const generate = useMutation({
    mutationFn: async () => {
      const existing = new Set(days.map((d) => d.day_number));
      const rows = Array.from({ length: total }, (_, i) => i + 1)
        .filter((n) => !existing.has(n))
        .map((n) => ({ event_id: event.id, day_number: n, day_date: dayDateFor(event, n) }));
      if (!rows.length) throw new Error("All days already exist");
      const { error } = await supabase.from("event_days").insert(rows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Days created");
      void qc.invalidateQueries({ queryKey: ["event-plan", event.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Daily plan · {total} days</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Manual Plan (Day 1…{total})
          </Button>
          <AutoPlanButton event={event} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!days.length && <p className="text-sm text-muted-foreground">No days yet — create them to start planning.</p>}
        {days.map((d) => (
          <DayEditor key={d.id} eventId={event.id} day={d} />
        ))}
      </CardContent>
    </Card>
  );
}

type PlanDay = NonNullable<ReturnType<typeof useEventPlan>["data"]>[number];

function DayEditor({ eventId, day }: { eventId: string; day: PlanDay }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["event-plan", eventId] });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("none");
  const subjects = useSubjects();
  const chapters = useChapters(subjectId || null);
  const topics = useTopics(chapterId || null);

  const addTask = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Give the task a title");
      const next = (day.event_tasks.reduce((m, t) => Math.max(m, t.sort_order), 0) || 0) + 1;
      const { error } = await supabase.from("event_tasks").insert({
        day_id: day.id,
        title: title.trim(),
        instructions: instructions.trim(),
        subject_id: subjectId || null,
        chapter_id: chapterId || null,
        topic_id: topicId !== "none" ? topicId : null,
        sort_order: next,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setTitle("");
      setInstructions("");
      toast.success("Task added");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async (v: { id: string; dir: -1 | 1 }) => {
      const list = day.event_tasks;
      const i = list.findIndex((t) => t.id === v.id);
      const j = i + v.dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      const a = list[i]!;
      const b = list[j]!;
      await supabase.from("event_tasks").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("event_tasks").update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: () => void refresh(),
  });

  const rename = useMutation({
    mutationFn: async (v: { id: string; title: string }) => {
      const { error } = await supabase.from("event_tasks").update({ title: v.title }).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const setDayTitle = useMutation({
    mutationFn: async (v: string) => {
      const { error } = await supabase.from("event_days").update({ title: v }).eq("id", day.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void refresh(),
  });

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display font-semibold">Day {day.day_number}</span>
        <span className="text-xs text-muted-foreground">{day.day_date}</span>
        <Input
          className="h-8 max-w-xs"
          defaultValue={day.title}
          placeholder="Day heading (optional)"
          onBlur={(e) => e.target.value !== day.title && setDayTitle.mutate(e.target.value)}
        />
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setOpen(!open)}>
          {open ? "Hide" : `Tasks (${day.event_tasks.length})`}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {day.event_tasks.map((t, i) => (
            <div key={t.id} className="rounded-lg border border-border p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="h-8 min-w-40 flex-1"
                  defaultValue={t.title}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== t.title && rename.mutate({ id: t.id, title: e.target.value.trim() })}
                />
                <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move.mutate({ id: t.id, dir: -1 })}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move down"
                  disabled={i === day.event_tasks.length - 1}
                  onClick={() => move.mutate({ id: t.id, dir: 1 })}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => removeTask.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <TaskResources task={t} onChanged={refresh} />
            </div>
          ))}

          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="text-sm font-medium">Add a task</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Revise Chemical Equations" />
              <Select
                value={subjectId}
                onValueChange={(v) => {
                  setSubjectId(v);
                  setChapterId("");
                  setTopicId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Subject (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {(subjects.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chapter (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {(chapters.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={topicId} onValueChange={setTopicId} disabled={!chapterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Topic (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No topic</SelectItem>
                  {(topics.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                className="sm:col-span-2"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions (optional)"
              />
            </div>
            <Button className="mt-2" size="sm" onClick={() => addTask.mutate()} disabled={addTask.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> Add task
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type PlanTask = PlanDay["event_tasks"][number];

function TaskResources({ task, onChanged }: { task: PlanTask; onChanged: () => void }) {
  const [kind, setKind] = useState<string>("note");
  const [refId, setRefId] = useState("");

  const options = useQuery({
    queryKey: ["event-resource-options", kind],
    queryFn: async (): Promise<{ id: string; label: string }[]> => {
      if (kind === "note" || kind === "video") {
        const { data } = await supabase.from("links").select("id, title").eq("kind", kind).order("title");
        return (data ?? []).map((r) => ({ id: r.id, label: r.title }));
      }
      if (kind === "resource") {
        const { data } = await supabase.from("resources").select("id, name").order("name");
        return (data ?? []).map((r) => ({ id: r.id, label: r.name }));
      }
      if (kind === "flashcards") {
        const { data } = await supabase.from("flashcard_sets").select("id, title").order("title");
        return (data ?? []).map((r) => ({ id: r.id, label: r.title }));
      }
      if (kind === "quiz") {
        const { data } = await supabase.from("quizzes").select("id, title").order("title");
        return (data ?? []).map((r) => ({ id: r.id, label: r.title }));
      }
      return [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (kind !== "questions" && !refId) throw new Error("Choose an existing resource");
      const label =
        kind === "questions"
          ? "Start questions"
          : ((options.data ?? []).find((o) => o.id === refId)?.label ?? "Open");
      const { error } = await supabase.from("event_task_resources").insert({
        task_id: task.id,
        kind,
        ref_id: kind === "questions" ? null : refId,
        label,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setRefId("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_task_resources").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(task.event_task_resources ?? []).map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
            {RESOURCE_KINDS.find((k) => k.value === r.kind)?.label ?? r.kind}: {r.label}
            <button type="button" aria-label="Remove resource" onClick={() => remove.mutate(r.id)}>
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={kind}
          onValueChange={(v) => {
            setKind(v);
            setRefId("");
          }}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {kind !== "questions" && (
          <Select value={refId} onValueChange={setRefId}>
            <SelectTrigger className="h-8 w-56">
              <SelectValue placeholder="Pick existing…" />
            </SelectTrigger>
            <SelectContent>
              {(options.data ?? []).map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant="outline" onClick={() => add.mutate()}>
          Link resource
        </Button>
      </div>
    </div>
  );
}

function EventTracking({ eventId }: { eventId: string }) {
  const plan = useEventPlan(eventId);
  const days = useMemo(() => plan.data ?? [], [plan.data]);
  const taskIds = useMemo(() => days.flatMap((d) => d.event_tasks.map((t) => t.id)), [days]);

  const members = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => (await supabase.from("profiles").select("id, display_name, username")).data ?? [],
  });

  const completions = useQuery({
    queryKey: ["event-all-completions", eventId, taskIds.length],
    enabled: taskIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_task_completions")
        .select("task_id, user_id, completed_at")
        .in("task_id", taskIds);
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayDay = days.find((d) => d.day_date === today);
  const todayTaskIds = new Set((todayDay?.event_tasks ?? []).map((t) => t.id));

  const rows = (members.data ?? []).map((m) => {
    const mine = (completions.data ?? []).filter((c) => c.user_id === m.id);
    const doneIds = new Set(mine.map((c) => c.task_id));
    const overall = taskIds.length ? Math.round((doneIds.size / taskIds.length) * 100) : 0;
    const todayTotal = todayTaskIds.size;
    const todayDone = [...todayTaskIds].filter((id) => doneIds.has(id)).length;
    const completedDays = days.filter((d) => d.event_tasks.length > 0 && d.event_tasks.every((t) => doneIds.has(t.id))).length;
    const last = mine.map((c) => c.completed_at).sort().at(-1);
    return {
      id: m.id,
      name: m.display_name || m.username,
      overall,
      today: todayTotal ? `${todayDone}/${todayTotal}` : "—",
      completedDays,
      remaining: taskIds.length - doneIds.size,
      last: last ? new Date(last).toLocaleString() : "—",
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" /> Member progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!taskIds.length && <p className="text-sm text-muted-foreground">Add tasks to the plan to start tracking.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border border-border px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 font-medium">{r.name}</span>
              <Badge variant="secondary">{r.overall}%</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Today {r.today} · {r.completedDays} days complete · {r.remaining} tasks remaining · last activity {r.last}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
