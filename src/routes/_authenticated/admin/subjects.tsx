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

export const Route = createFileRoute("/_authenticated/admin/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — CBSE 10 Prep Admin" },
      { name: "description", content: "Create and manage CBSE Class 10 subjects." },
      { property: "og:title", content: "Subjects — CBSE 10 Prep Admin" },
      { property: "og:description", content: "Organise the syllabus by subject." },
    ],
  }),
  component: SubjectsAdmin,
});

function SubjectsAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const subjects = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, sort_order").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-subjects"] });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subjects")
        .insert({ name: name.trim(), sort_order: (subjects.data?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Subject added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subjects</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">New subject</Label>
          <div className="flex max-w-md gap-2">
            <Input id="subject" value={name} onChange={(e) => setName(e.target.value)} placeholder="Science" />
            <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>
              Add
            </Button>
          </div>
        </div>
        <ul className="space-y-1">
          {(subjects.data ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              {s.name}
              <Button size="icon" variant="ghost" aria-label="Delete subject" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!subjects.isLoading && (subjects.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No subjects yet.</p>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
