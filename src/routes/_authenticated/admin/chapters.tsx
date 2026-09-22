import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/chapters")({
  head: () => ({
    meta: [
      { title: "Chapters — CBSE 10 Prep Admin" },
      { name: "description", content: "Create and manage chapters for each CBSE Class 10 subject." },
      { property: "og:title", content: "Chapters — CBSE 10 Prep Admin" },
      { property: "og:description", content: "Organise chapters under each subject." },
    ],
  }),
  component: ChaptersAdmin,
});

function ChaptersAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const subjects = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const chapters = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, name, subject_id, subjects(name)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-chapters"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error("Pick a subject first");
      const { error } = await supabase.from("chapters").insert({
        name: name.trim(),
        subject_id: subjectId,
        sort_order: (chapters.data?.filter((c) => c.subject_id === subjectId).length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Chapter added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chapter deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chapters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid max-w-2xl gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
          <div className="space-y-1.5">
            <Label htmlFor="chapter">Chapter name</Label>
            <Input
              id="chapter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chemical Reactions"
            />
          </div>
          <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>
            Add
          </Button>
        </div>
        <ul className="space-y-1">
          {(chapters.data ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>
                {c.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {(c as { subjects?: { name?: string } | null }).subjects?.name}
                </span>
              </span>
              <Button size="icon" variant="ghost" aria-label="Delete chapter" onClick={() => remove.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!chapters.isLoading && (chapters.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No chapters yet.</p>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
