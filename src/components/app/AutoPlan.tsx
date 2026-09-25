import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dayDateFor } from "@/components/app/EventPrep";

type EventRow = { id: string; name: string; event_type: string; start_date: string; end_date: string };
type Res = { kind: string; ref_id: string | null; label: string };
type Chap = { id: string; name: string; subject_id: string; subjectName: string; res: Res[] };
type PreviewTask = { subjectId: string; subjectName: string; chapters: Chap[] };
type PreviewDay = { dayNumber: number; date: string; tasks: PreviewTask[] };

const KIND_LABEL: Record<string, string> = {
  note: "Notes",
  video: "Video Lectures",
  resource: "PDFs & Images",
  flashcards: "Flashcards",
  quiz: "Quiz",
  questions: "Questions",
};

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function dayNum(start: string, date: string) {
  return Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1;
}
function fmt(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function AutoPlanButton({ event }: { event: EventRow }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewDay[] | null>(null);

  async function build() {
    setLoading(true);
    try {
      const today = localToday();
      const start = today > event.start_date ? today : event.start_date;
      if (start > event.end_date) throw new Error("The exam date has already passed");
      const startN = dayNum(event.start_date, start);
      const endN = dayNum(event.start_date, event.end_date);
      const dayCount = endN - startN + 1;

      const { data: syl } = await supabase.from("event_syllabus").select("subject_id, chapter_id").eq("event_id", event.id);
      if (!syl?.length) throw new Error("Choose the syllabus first");
      const subjectIds = [...new Set(syl.map((s) => s.subject_id).filter(Boolean) as string[])];
      const [{ data: subs }, { data: allCh }] = await Promise.all([
        supabase.from("subjects").select("id, name, sort_order").in("id", subjectIds),
        supabase.from("chapters").select("id, name, subject_id, sort_order").in("subject_id", subjectIds).order("sort_order"),
      ]);
      const subName = new Map((subs ?? []).map((s) => [s.id, s.name]));
      const subOrder = new Map((subs ?? []).map((s) => [s.id, s.sort_order]));
      const whole = new Set(syl.filter((s) => !s.chapter_id).map((s) => s.subject_id));
      const picked = new Set(syl.map((s) => s.chapter_id).filter(Boolean));
      const chapters: Chap[] = (allCh ?? [])
        .filter((c) => whole.has(c.subject_id) || picked.has(c.id))
        .sort((a, b) => (subOrder.get(a.subject_id) ?? 0) - (subOrder.get(b.subject_id) ?? 0) || a.sort_order - b.sort_order)
        .map((c) => ({ id: c.id, name: c.name, subject_id: c.subject_id, subjectName: subName.get(c.subject_id) ?? "Subject", res: [] }));
      if (!chapters.length) throw new Error("No chapters found in the syllabus");

      const ids = chapters.map((c) => c.id);
      const [links, files, sets, quizzes, qs] = await Promise.all([
        supabase.from("links").select("id, title, kind, chapter_id").in("chapter_id", ids),
        supabase.from("resources").select("id, name, chapter_id").in("chapter_id", ids),
        supabase.from("flashcard_sets").select("id, title, chapter_id").eq("is_published", true).in("chapter_id", ids),
        supabase.from("quizzes").select("id, title, chapter_id").eq("is_published", true).in("chapter_id", ids),
        supabase.from("questions").select("chapter_id").eq("status", "published").in("chapter_id", ids),
      ]);
      const byId = new Map(chapters.map((c) => [c.id, c]));
      for (const l of links.data ?? []) byId.get(l.chapter_id!)?.res.push({ kind: l.kind, ref_id: l.id, label: l.title });
      for (const r of files.data ?? []) byId.get(r.chapter_id!)?.res.push({ kind: "resource", ref_id: r.id, label: r.name });
      for (const s of sets.data ?? []) byId.get(s.chapter_id!)?.res.push({ kind: "flashcards", ref_id: s.id, label: s.title });
      for (const q of quizzes.data ?? []) byId.get(q.chapter_id)?.res.push({ kind: "quiz", ref_id: q.id, label: q.title });
      const withQ = new Set((qs.data ?? []).map((q) => q.chapter_id));
      for (const c of chapters) if (withQ.has(c.id)) c.res.push({ kind: "questions", ref_id: null, label: `${c.name} questions` });

      // Even distribution: first (n % days) days get one extra chapter.
      const used = Math.min(dayCount, chapters.length);
      const base = Math.floor(chapters.length / used);
      const extra = chapters.length % used;
      const out: PreviewDay[] = [];
      let idx = 0;
      for (let i = 0; i < used; i++) {
        const slice = chapters.slice(idx, idx + base + (i < extra ? 1 : 0));
        idx += slice.length;
        const tasks: PreviewTask[] = [];
        for (const c of slice) {
          let t = tasks.find((x) => x.subjectId === c.subject_id);
          if (!t) tasks.push((t = { subjectId: c.subject_id, subjectName: c.subjectName, chapters: [] }));
          t.chapters.push(c);
        }
        const n = startN + i;
        out.push({ dayNumber: n, date: dayDateFor(event, n), tasks });
      }
      setPreview(out);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!preview) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("event_days").select("id, day_number").eq("event_id", event.id);
      const dayIds = new Map((existing ?? []).map((d) => [d.day_number, d.id]));
      const missing = preview.filter((d) => !dayIds.has(d.dayNumber));
      if (missing.length) {
        const { data, error } = await supabase
          .from("event_days")
          .insert(missing.map((d) => ({ event_id: event.id, day_number: d.dayNumber, day_date: d.date })))
          .select("id, day_number");
        if (error) throw new Error(error.message);
        for (const d of data ?? []) dayIds.set(d.day_number, d.id);
      }
      for (const d of preview) {
        const dayId = dayIds.get(d.dayNumber)!;
        const { data: cur } = await supabase.from("event_tasks").select("sort_order").eq("day_id", dayId);
        let order = (cur ?? []).reduce((m, t) => Math.max(m, t.sort_order), 0);
        for (const t of d.tasks) {
          const names = t.chapters.map((c) => c.name);
          const { data: task, error } = await supabase
            .from("event_tasks")
            .insert({
              day_id: dayId,
              title: `${t.subjectName}: Complete ${names.join(", ")}`,
              instructions: `Study these chapters:\n${names.map((n) => `• ${n}`).join("\n")}`,
              subject_id: t.subjectId,
              chapter_id: t.chapters.length === 1 ? t.chapters[0].id : null,
              sort_order: ++order,
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          const res = t.chapters.flatMap((c) => c.res.map((r) => ({ task_id: task.id, ...r })));
          if (res.length) {
            const { error: re } = await supabase.from("event_task_resources").insert(res);
            if (re) throw new Error(re.message);
          }
        }
      }
      toast.success("Automated plan created");
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ["event-plan", event.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={build} disabled={loading}>
        <Zap className="mr-1.5 h-4 w-4" /> {loading ? "Building…" : "Automate Plan"}
      </Button>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Automated plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(preview ?? []).map((d) => (
              <div key={d.dayNumber} className="rounded-lg border border-border p-3">
                <p className="font-semibold">
                  Day {d.dayNumber} — {fmt(d.date)}
                </p>
                {d.tasks.map((t) => {
                  const kinds = [...new Set(t.chapters.flatMap((c) => c.res.map((r) => r.kind)))];
                  return (
                    <div key={t.subjectId} className="mt-2 text-sm">
                      <p className="font-medium">{t.subjectName}</p>
                      <p className="text-muted-foreground">{t.chapters.map((c) => c.name).join(", ")}</p>
                      {kinds.length > 0 && (
                        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          {kinds.map((k) => (
                            <li key={k} className="flex items-center gap-1 text-primary">
                              <Check className="h-3.5 w-3.5" /> {KIND_LABEL[k] ?? k}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? "Creating…" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
