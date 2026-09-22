import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopicSelect } from "@/components/app/TopicSelect";

export const Route = createFileRoute("/_authenticated/admin/resources")({
  head: () => ({
    meta: [
      { title: "Upload Resources — CBSE 10 Prep" },
      { name: "description", content: "Upload CBSE Class 10 study PDFs and images for your students." },
      { property: "og:title", content: "Upload Resources — CBSE 10 Prep" },
      { property: "og:description", content: "Attach notes, worksheets and diagrams to subjects and chapters." },
    ],
  }),
  component: ResourcesAdmin,
});

function ResourcesAdmin() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("none");
  const [chapterId, setChapterId] = useState("none");
  const [topicId, setTopicId] = useState("none");

  const subjects = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const chapters = useQuery({
    queryKey: ["admin-chapters-flat"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("id, name, subject_id").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const resources = useQuery({
    queryKey: ["admin-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("id, name, kind, size_bytes, storage_path, description, created_at, subjects(name), chapters(name), topics(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file first");
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isImage && !isPdf) throw new Error("Only PDF or image files are supported");

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${isPdf ? "pdf" : "image"}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("resources").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);

      const { error } = await supabase.from("resources").insert({
        name: name.trim() || file.name,
        kind: isPdf ? "pdf" : "image",
        description: description.trim(),
        storage_path: path,
        size_bytes: file.size,
        subject_id: subjectId === "none" ? null : subjectId,
        chapter_id: chapterId === "none" ? null : chapterId,
        topic_id: topicId === "none" ? null : topicId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Resource uploaded");
      setFile(null);
      setName("");
      setDescription("");
      void qc.invalidateQueries({ queryKey: ["admin-resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (r: { id: string; storage_path: string }) => {
      await supabase.storage.from("resources").remove([r.storage_path]);
      const { error } = await supabase.from("resources").delete().eq("id", r.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Resource deleted");
      void qc.invalidateQueries({ queryKey: ["admin-resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visibleChapters = (chapters.data ?? []).filter((c) => subjectId === "none" || c.subject_id === subjectId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" /> Upload a PDF or image
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-file">File</Label>
            <Input
              id="r-file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Title</Label>
            <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chapter 3 notes" />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                setChapterId("none");
                setTopicId("none");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All subjects</SelectItem>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Chapter</Label>
            <Select
              value={chapterId}
              onValueChange={(v) => {
                setChapterId(v);
                setTopicId("none");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any chapter</SelectItem>
                {visibleChapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TopicSelect chapterId={chapterId === "none" ? null : chapterId} value={topicId} onChange={setTopicId} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="r-desc">Description</Label>
            <Textarea id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Button disabled={upload.isPending || !file} onClick={() => upload.mutate()}>
              {upload.isPending ? "Uploading…" : "Upload resource"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(resources.data ?? []).map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm"
          >
            <Badge variant="secondary">{r.kind.toUpperCase()}</Badge>
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">
                {[r.subjects?.name, r.chapters?.name, r.topics?.name].filter(Boolean).join(" · ") || "All students with file access"} ·{" "}
                {Math.max(1, Math.round(Number(r.size_bytes) / 1024))} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              aria-label="Delete resource"
              onClick={() => del.mutate({ id: r.id, storage_path: r.storage_path })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {resources.data?.length === 0 && <p className="text-sm text-muted-foreground">No resources uploaded yet.</p>}
      </div>
    </div>
  );
}
