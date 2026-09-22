import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Circle,
  ImageIcon,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Course = {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string | null;
  is_published: boolean;
  sort_order: number;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  info: string;
  position: number;
  link_id: string | null;
  video_url: string | null;
};

const THUMB_BUCKET = "course-thumbnails";

function useCourses(isAdmin: boolean) {
  return useQuery({
    queryKey: ["courses", isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, description, thumbnail_url, is_published, sort_order")
        .order("sort_order")
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as Course[];
    },
  });
}

function useLessons(courseIds: string[]) {
  return useQuery({
    queryKey: ["course-lessons", courseIds.join(",")],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, course_id, title, info, position, link_id, video_url")
        .in("course_id", courseIds)
        .order("position");
      if (error) throw new Error(error.message);
      return (data ?? []) as Lesson[];
    },
  });
}

function useMyProgress() {
  return useQuery({
    queryKey: ["course-progress"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as string[];
      const { data } = await supabase.from("course_lesson_progress").select("lesson_id").eq("user_id", auth.user.id);
      return (data ?? []).map((r) => r.lesson_id);
    },
  });
}

function useVideoLinks() {
  return useQuery({
    queryKey: ["video-links-all"],
    queryFn: async () => {
      const { data } = await supabase.from("links").select("id, title, url").eq("kind", "video").order("title");
      return (data ?? []) as { id: string; title: string; url: string }[];
    },
  });
}

function useThumb(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//.test(path)) {
      setUrl(path);
      return;
    }
    void supabase.storage
      .from(THUMB_BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

function Thumb({ path, className }: { path: string | null; className?: string }) {
  const url = useThumb(path);
  if (!url)
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <ImageIcon className="h-6 w-6" />
      </div>
    );
  return <img src={url} alt="" className={cn("object-cover", className)} />;
}

export function Courses() {
  const { data: session } = useSessionInfo();
  const isAdmin = Boolean(session?.isAdmin);
  const courses = useCourses(isAdmin);
  const list = courses.data ?? [];
  const lessons = useLessons(list.map((c) => c.id));
  const progress = useMyProgress();
  const [openId, setOpenId] = useState<string | null>(null);

  const lessonsByCourse = useMemo(() => {
    const m = new Map<string, Lesson[]>();
    for (const l of lessons.data ?? []) m.set(l.course_id, [...(m.get(l.course_id) ?? []), l]);
    return m;
  }, [lessons.data]);

  const open = list.find((c) => c.id === openId);
  if (open)
    return (
      <CourseDetail
        course={open}
        lessons={lessonsByCourse.get(open.id) ?? []}
        done={new Set(progress.data ?? [])}
        onBack={() => setOpenId(null)}
      />
    );

  return (
    <div className="space-y-4">
      {isAdmin && <CourseAdmin courses={list} lessonsByCourse={lessonsByCourse} />}

      {courses.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading courses…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No courses have been published yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const ls = lessonsByCourse.get(c.id) ?? [];
            const doneCount = ls.filter((l) => (progress.data ?? []).includes(l.id)).length;
            const pct = ls.length ? Math.round((doneCount / ls.length) * 100) : 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenId(c.id)}
                className="overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors hover:border-primary"
              >
                <Thumb path={c.thumbnail_url} className="h-36 w-full" />
                <div className="p-3">
                  <p className="font-display font-semibold">{c.name}</p>
                  {c.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" /> {ls.length} lesson{ls.length === 1 ? "" : "s"}
                    {!c.is_published && <span className="text-[oklch(0.7_0.19_45)]">· Draft</span>}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {doneCount}/{ls.length} complete · {pct}%
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseDetail({
  course,
  lessons,
  done,
  onBack,
}: {
  course: Course;
  lessons: Lesson[];
  done: Set<string>;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const links = useVideoLinks();
  const [started, setStarted] = useState(false);
  const urlFor = (l: Lesson) => l.video_url || links.data?.find((k) => k.id === l.link_id)?.url || null;

  const toggle = useMutation({
    mutationFn: async (v: { lessonId: string; isDone: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again");
      if (v.isDone) {
        const { error } = await supabase
          .from("course_lesson_progress")
          .delete()
          .eq("lesson_id", v.lessonId)
          .eq("user_id", auth.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("course_lesson_progress")
          .insert({ lesson_id: v.lessonId, user_id: auth.user.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["course-progress"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const doneCount = lessons.filter((l) => done.has(l.id)).length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to courses
      </Button>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <Thumb path={course.thumbnail_url} className="aspect-video w-full" />
        <div className="p-4">
          <h2 className="font-display text-xl font-semibold">{course.name}</h2>
          {course.description && <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {doneCount} of {lessons.length} lessons complete · {pct}%
          </p>
          {!started && lessons.length > 0 && (
            <Button className="mt-3" onClick={() => setStarted(true)}>
              <Play className="mr-1.5 h-4 w-4" /> Start course
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-display font-semibold">Lessons</h3>
        {lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons added yet.</p>}
        {lessons.map((l, i) => {
          const isDone = done.has(l.id);
          const url = urlFor(l);
          return (
            <div key={l.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <button
                type="button"
                aria-label={isDone ? "Mark as not done" : "Mark as done"}
                onClick={() => toggle.mutate({ lessonId: l.id, isDone })}
                className="mt-0.5 shrink-0"
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-[oklch(0.74_0.16_162)]" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", isDone && "line-through opacity-70")}>
                  {String(i + 1).padStart(2, "0")} — {l.title}
                </p>
                {l.info && <p className="text-xs text-muted-foreground">{l.info}</p>}
              </div>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
                >
                  <Play className="h-3.5 w-3.5" /> Watch video
                </a>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">No video yet</span>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function CourseAdmin({
  courses,
  lessonsByCourse,
}: {
  courses: Course[];
  lessonsByCourse: Map<string, Lesson[]>;
}) {
  const qc = useQueryClient();
  const links = useVideoLinks();
  const [form, setForm] = useState({ name: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState({ title: "", info: "", link_id: "", video_url: "" });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["courses"] });
    void qc.invalidateQueries({ queryKey: ["course-lessons"] });
  };

  const uploadThumb = async (courseId: string, f: File) => {
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${courseId}/thumb-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(THUMB_BUCKET).upload(path, f, { upsert: true });
    if (error) throw new Error(error.message);
    return path;
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Give the course a name");
      const { data, error } = await supabase
        .from("courses")
        .insert({ name: form.name.trim(), description: form.description.trim(), sort_order: courses.length })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (file) {
        const path = await uploadThumb(data.id, file);
        await supabase.from("courses").update({ thumbnail_url: path }).eq("id", data.id);
      }
      return data.id;
    },
    onSuccess: (id) => {
      setForm({ name: "", description: "" });
      setFile(null);
      setEditId(id);
      refresh();
      toast.success("Course created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<Course>; thumb?: File | null }) => {
      const patch = { ...v.patch };
      if (v.thumb) patch.thumbnail_url = await uploadThumb(v.id, v.thumb);
      const { error } = await supabase.from("courses").update(patch).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEditId(null);
      refresh();
      toast.success("Course deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLesson = useMutation({
    mutationFn: async (courseId: string) => {
      if (!lessonDraft.title.trim()) throw new Error("Give the lesson a title");
      const count = (lessonsByCourse.get(courseId) ?? []).length;
      const { error } = await supabase.from("course_lessons").insert({
        course_id: courseId,
        title: lessonDraft.title.trim(),
        info: lessonDraft.info.trim(),
        position: count,
        link_id: lessonDraft.link_id || null,
        video_url: lessonDraft.video_url.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setLessonDraft({ title: "", info: "", link_id: "", video_url: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_lessons").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async (v: { list: Lesson[]; index: number; dir: -1 | 1 }) => {
      const target = v.index + v.dir;
      const a = v.list[v.index];
      const b = v.list[target];
      if (!a || !b) return;
      await supabase.from("course_lessons").update({ position: b.position }).eq("id", a.id);
      await supabase.from("course_lessons").update({ position: a.position }).eq("id", b.id);
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const editing = courses.find((c) => c.id === editId) ?? null;
  const editingLessons = editing ? (lessonsByCourse.get(editing.id) ?? []) : [];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display font-semibold">Create a course</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="course-name">Course name</Label>
          <Input
            id="course-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Democracy — full course"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-thumb">Thumbnail image</Label>
          <Input
            id="course-thumb"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="course-desc">Short description</Label>
        <Textarea
          id="course-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
        />
      </div>
      <Button onClick={() => create.mutate()} disabled={create.isPending}>
        <Plus className="mr-1.5 h-4 w-4" /> Create course
      </Button>

      {courses.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <Label>Manage a course</Label>
          <Select value={editId ?? ""} onValueChange={(v) => setEditId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.is_published ? "" : " (draft)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {editing && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                defaultValue={editing.name}
                onBlur={(e) => update.mutate({ id: editing.id, patch: { name: e.target.value } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-thumb">Replace thumbnail</Label>
              <Input
                id="edit-thumb"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) update.mutate({ id: editing.id, patch: {}, thumb: f });
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              defaultValue={editing.description}
              rows={2}
              onBlur={(e) => update.mutate({ id: editing.id, patch: { description: e.target.value } })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={editing.is_published}
                onCheckedChange={(v) => update.mutate({ id: editing.id, patch: { is_published: v } })}
              />
              Published
            </label>
            <Button variant="destructive" size="sm" onClick={() => removeCourse.mutate(editing.id)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete course
            </Button>
          </div>

          <div className="space-y-2">
            <p className="font-display text-sm font-semibold">Lessons</p>
            {editingLessons.map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {String(i + 1).padStart(2, "0")} — {l.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move.mutate({ list: editingLessons, index: i, dir: -1 })}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  disabled={i === editingLessons.length - 1}
                  onClick={() => move.mutate({ list: editingLessons, index: i, dir: 1 })}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete lesson" onClick={() => removeLesson.mutate(l.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Lesson title"
                value={lessonDraft.title}
                onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })}
              />
              <Input
                placeholder="Lesson info (optional)"
                value={lessonDraft.info}
                onChange={(e) => setLessonDraft({ ...lessonDraft, info: e.target.value })}
              />
              <Select
                value={lessonDraft.link_id || "none"}
                onValueChange={(v) => setLessonDraft({ ...lessonDraft, link_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Existing video resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No existing resource</SelectItem>
                  {(links.data ?? []).map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or paste a video link"
                value={lessonDraft.video_url}
                onChange={(e) => setLessonDraft({ ...lessonDraft, video_url: e.target.value })}
              />
            </div>
            <Button size="sm" onClick={() => addLesson.mutate(editing.id)} disabled={addLesson.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> Add lesson
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
