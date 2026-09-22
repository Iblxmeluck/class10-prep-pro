import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Download, Eye, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getResourceLink } from "@/lib/resources.functions";
import { RaiseDemandButton } from "@/components/app/RaiseDemandButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Search = { topic?: string | undefined; kind?: "pdf" | "image" | undefined };

export const Route = createFileRoute("/_authenticated/resources")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    topic: typeof s['topic'] === "string" ? s['topic'] : undefined,
    kind: s['kind'] === "pdf" || s['kind'] === "image" ? s['kind'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Study Resources — CBSE 10 Prep" },
      { name: "description", content: "Chapter-wise CBSE Class 10 PDFs, notes and diagrams shared with you." },
      { property: "og:title", content: "Study Resources — CBSE 10 Prep" },
      { property: "og:description", content: "Open or download the study material assigned to your account." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const linkFn = useServerFn(getResourceLink);
  const { topic, kind } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [filterSubject, setFilterSubject] = useState("none");
  const [filterChapter, setFilterChapter] = useState("none");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters-flat"],
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name, subject_id").order("sort_order")).data ?? [],
  });
  const filterChapters = (chapters.data ?? []).filter(
    (c) => filterSubject === "none" || c.subject_id === filterSubject,
  );

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources", topic ?? "all", kind ?? "all", filterSubject, filterChapter],
    queryFn: async () => {
      let q = supabase
        .from("resources")
        .select("id, name, description, kind, size_bytes, created_at, subjects(name), chapters(name), topics(name)")
        .order("created_at", { ascending: false });
      if (topic) q = q.eq("topic_id", topic);
      if (kind) q = q.eq("kind", kind);
      if (filterSubject !== "none") q = q.eq("subject_id", filterSubject);
      if (filterChapter !== "none") q = q.eq("chapter_id", filterChapter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function open(resourceId: string, mode: "view" | "download") {
    try {
      const res = await linkFn({ data: { resourceId, mode } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open this file");
    }
  }

  return (
    <div className="space-y-6">
      {topic && (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/topics/$topicId" params={{ topicId: topic }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to topic
          </Link>
        </Button>
      )}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {kind === "pdf" ? "PDF resources" : kind === "image" ? "Image resources" : "Study resources"}
          </h1>
          <p className="text-sm text-muted-foreground">Notes, worksheets and diagrams shared with your account.</p>
        </div>
        <RaiseDemandButton defaultWant={kind === "image" ? "Image resource" : "PDF resource"} />
      </header>

      <div className="flex flex-wrap gap-2">
        {(["all", "pdf", "image"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={(kind ?? "all") === k ? "default" : "outline"}
            onClick={() => navigate({ search: { topic, kind: k === "all" ? undefined : k } })}
          >
            {k === "all" ? "All" : k === "pdf" ? "PDFs" : "Images"}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select
            value={filterSubject}
            onValueChange={(v) => {
              setFilterSubject(v);
              setFilterChapter("none");
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
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
          <Select value={filterChapter} onValueChange={setFilterChapter} disabled={filterSubject === "none"}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All chapters</SelectItem>
              {filterChapters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterSubject !== "none" || filterChapter !== "none") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterSubject("none");
              setFilterChapter("none");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading resources…</p>
      ) : !resources?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No resources are available for your account yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => {
            const subject = (r as { subjects?: { name?: string } | null }).subjects?.name;
            const chapter = (r as { chapters?: { name?: string } | null }).chapters?.name;
            const topicName = (r as { topics?: { name?: string } | null }).topics?.name;
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    {r.kind === "pdf" ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{r.name}</CardTitle>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {subject ? <Badge variant="secondary">{subject}</Badge> : null}
                    {chapter ? <Badge variant="outline">{chapter}</Badge> : null}
                    {topicName ? <Badge variant="outline">{topicName}</Badge> : null}
                    <Badge variant="outline">{Math.max(1, Math.round(r.size_bytes / 1024))} KB</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => open(r.id, "view")}>
                      <Eye className="mr-1.5 h-4 w-4" /> View
                    </Button>
                    <Button size="sm" onClick={() => open(r.id, "download")}>
                      <Download className="mr-1.5 h-4 w-4" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
