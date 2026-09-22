import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/tracker")({
  component: TrackerPage,
  head: () => ({
    meta: [
      { title: "Chapter-wise Tracker | CBSE Class 10 Study Hub" },
      {
        name: "description",
        content:
          "Track chapter-by-chapter completion across Maths, Science, SST and Languages with your own progress bar.",
      },
      { property: "og:title", content: "Chapter-wise Tracker | CBSE Class 10 Study Hub" },
      {
        property: "og:description",
        content: "Tick off NCERT, lectures, question banks and more, chapter by chapter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type GroupKey = "maths" | "science" | "sst" | "lang";

const GROUPS: { key: GroupKey; label: string; subjects: string[] }[] = [
  { key: "maths", label: "Maths", subjects: ["Mathematics", "Maths"] },
  { key: "science", label: "Science", subjects: ["Science"] },
  { key: "sst", label: "SST", subjects: ["Social Science", "SST"] },
  { key: "lang", label: "Languages/IT", subjects: ["English", "Hindi", "IT", "Information Technology"] },
];

type Column = { id: string; group_key: string; name: string; sort_order: number };
type Chapter = { id: string; name: string; subject_id: string; sort_order: number };
type Subject = { id: string; name: string };

function TrackerPage() {
  const [tab, setTab] = useState<GroupKey>("maths");

  return (
    <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Chapter-wise tracker</h1>
          <p className="text-sm text-muted-foreground">
            Tick what you have finished. Your progress is saved automatically to your account.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as GroupKey)}>
          <TabsList className="flex w-full flex-wrap justify-start">
            {GROUPS.map((g) => (
              <TabsTrigger key={g.key} value={g.key}>
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GROUPS.map((g) => (
            <TabsContent key={g.key} value={g.key} className="mt-6">
              <GroupView groupKey={g.key} subjectNames={g.subjects} />
            </TabsContent>
          ))}
        </Tabs>
    </div>
  );
}

function GroupView({ groupKey, subjectNames }: { groupKey: GroupKey; subjectNames: string[] }) {
  const qc = useQueryClient();
  const { data: session } = useSessionInfo();
  const isAdmin = Boolean(session?.isAdmin);
  const userId = session?.userId ?? "";

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => ((await supabase.from("subjects").select("id, name").order("sort_order")).data ??
      []) as Subject[],
  });

  const groupSubjects = (subjects.data ?? []).filter((s) =>
    subjectNames.some((n) => n.toLowerCase() === s.name.toLowerCase()),
  );
  const subjectIds = groupSubjects.map((s) => s.id);

  const chapters = useQuery({
    queryKey: ["tracker-chapters", subjectIds.join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () =>
      ((
        await supabase
          .from("chapters")
          .select("id, name, subject_id, sort_order")
          .in("subject_id", subjectIds)
          .order("sort_order")
      ).data ?? []) as Chapter[],
  });

  const columns = useQuery({
    queryKey: ["tracker-columns", groupKey],
    queryFn: async () =>
      ((
        await supabase
          .from("tracker_columns")
          .select("id, group_key, name, sort_order")
          .eq("group_key", groupKey)
          .order("sort_order")
      ).data ?? []) as Column[],
  });

  const progress = useQuery({
    queryKey: ["tracker-progress", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("tracker_progress")
        .select("chapter_id, column_id, checked")
        .eq("user_id", userId);
      return data ?? [];
    },
  });

  const checkedSet = useMemo(() => {
    const s = new Set<string>();
    for (const row of progress.data ?? []) if (row.checked) s.add(`${row.chapter_id}:${row.column_id}`);
    return s;
  }, [progress.data]);

  const toggle = useMutation({
    mutationFn: async (v: { chapterId: string; columnId: string; checked: boolean }) => {
      const { error } = await supabase.from("tracker_progress").upsert(
        {
          user_id: userId,
          chapter_id: v.chapterId,
          column_id: v.columnId,
          checked: v.checked,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,chapter_id,column_id" },
      );
      if (error) throw new Error(error.message);
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["tracker-progress", userId] });
      const prev = qc.getQueryData<{ chapter_id: string; column_id: string; checked: boolean }[]>([
        "tracker-progress",
        userId,
      ]);
      qc.setQueryData<{ chapter_id: string; column_id: string; checked: boolean }[]>(
        ["tracker-progress", userId],
        (old) => {
          const list = (old ?? []).filter((r) => !(r.chapter_id === v.chapterId && r.column_id === v.columnId));
          return [...list, { chapter_id: v.chapterId, column_id: v.columnId, checked: v.checked }];
        },
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tracker-progress", userId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["tracker-progress", userId] }),
  });

  const cols = columns.data ?? [];

  if (subjects.isLoading || chapters.isLoading || columns.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!groupSubjects.length)
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No subjects found for this tab yet.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-8">
      {isAdmin && <ColumnManager groupKey={groupKey} columns={cols} />}

      {groupSubjects.map((subject) => {
        const list = (chapters.data ?? []).filter((c) => c.subject_id === subject.id);
        const total = list.length * cols.length;
        const done = list.reduce(
          (acc, c) => acc + cols.filter((col) => checkedSet.has(`${c.id}:${col.id}`)).length,
          0,
        );
        const pct = total ? Math.round((done / total) * 100) : 0;

        return (
          <Card key={subject.id}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{subject.name}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {done} / {total} done · {pct}%
                </span>
              </div>
              <Progress value={pct} />
            </CardHeader>
            <CardContent className="p-0">
              {!list.length || !cols.length ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  {cols.length ? "No chapters added yet." : "No columns configured yet."}
                </p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="w-16 px-4 py-3 font-medium">Ch. No</th>
                        <th className="min-w-[220px] px-4 py-3 font-medium">Chapter name</th>
                        {cols.map((col) => (
                          <th key={col.id} className="px-4 py-3 text-center font-medium">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((c, i) => (
                        <tr key={c.id} className="border-b border-border/60 transition-colors hover:bg-muted/50">
                          <td className="px-4 py-3 text-muted-foreground">{c.sort_order || i + 1}</td>
                          <td className="px-4 py-3">{c.name}</td>
                          {cols.map((col) => {
                            const key = `${c.id}:${col.id}`;
                            return (
                              <td key={col.id} className="px-4 py-3 text-center">
                                <Checkbox
                                  checked={checkedSet.has(key)}
                                  aria-label={`${c.name} — ${col.name}`}
                                  onCheckedChange={(v) =>
                                    toggle.mutate({ chapterId: c.id, columnId: col.id, checked: v === true })
                                  }
                                  className="transition-transform data-[state=checked]:scale-110"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ColumnManager({ groupKey, columns }: { groupKey: GroupKey; columns: Column[] }) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["tracker-columns", groupKey] });

  const add = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error("Type a column name first");
      const next = Math.max(0, ...columns.map((c) => c.sort_order)) + 1;
      const { error } = await supabase.from("tracker_columns").insert({ group_key: groupKey, name, sort_order: next });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewName("");
      toast.success("Column added");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async (v: { id: string; name: string }) => {
      const name = v.name.trim();
      if (!name) throw new Error("Name cannot be empty");
      const { error } = await supabase.from("tracker_columns").update({ name }).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEditingId(null);
      toast.success("Column renamed");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tracker_columns").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Column removed");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async (v: { id: string; dir: -1 | 1 }) => {
      const idx = columns.findIndex((c) => c.id === v.id);
      if (idx < 0 || idx + v.dir < 0 || idx + v.dir >= columns.length) return;
      const next = [...columns];
      const [item] = next.splice(idx, 1);
      next.splice(idx + v.dir, 0, item!);
      // Renumber every column so positions stay unique even if two shared a number before.
      const results = await Promise.all(
        next.map((c, i) => supabase.from("tracker_columns").update({ sort_order: i + 1 }).eq("id", c.id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Columns for this tab</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {columns.map((col, i) => (
            <div key={col.id} className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1">
              {editingId === col.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 w-36"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") rename.mutate({ id: col.id, name: editValue });
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => rename.mutate({ id: col.id, name: editValue })}>
                    <Check className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="px-1 text-sm">{col.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={i === 0}
                    onClick={() => move.mutate({ id: col.id, dir: -1 })}
                    aria-label="Move left"
                  >
                    <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={i === columns.length - 1}
                    onClick={() => move.mutate({ id: col.id, dir: 1 })}
                    aria-label="Move right"
                  >
                    <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingId(col.id);
                      setEditValue(col.name);
                    }}
                    aria-label="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => remove.mutate(col.id)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New column name"
            className="w-52"
            onKeyDown={(e) => {
              if (e.key === "Enter") add.mutate();
            }}
          />
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Add column
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
