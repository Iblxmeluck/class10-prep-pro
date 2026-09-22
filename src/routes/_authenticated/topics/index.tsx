import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Search = { subject?: string | undefined };

export const Route = createFileRoute("/_authenticated/topics/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    subject: typeof s['subject'] === "string" ? s['subject'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Topic Learning Hub — CBSE 10 Prep" },
      {
        name: "description",
        content: "Pick a subject and topic to open every video, PDF, note, flashcard, question and quiz in one place.",
      },
      { property: "og:title", content: "Topic Learning Hub — CBSE 10 Prep" },
      { property: "og:description", content: "One learning destination for each CBSE Class 10 topic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopicIndex,
});

function TopicIndex() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });

  const subjectId = search.subject ?? subjects.data?.[0]?.id;

  const chapters = useQuery({
    queryKey: ["chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name").eq("subject_id", subjectId!).order("sort_order")).data ?? [],
  });

  const chapterIds = (chapters.data ?? []).map((c) => c.id);

  const topics = useQuery({
    queryKey: ["topics-for-subject", subjectId, chapterIds.length],
    enabled: chapterIds.length > 0,
    queryFn: async () =>
      (await supabase.from("topics").select("id, name, chapter_id").in("chapter_id", chapterIds).order("sort_order"))
        .data ?? [],
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Topic Learning Hub</h1>
        <p className="text-sm text-muted-foreground">
          Choose a subject, then a topic — every resource for that topic sits on one page.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(subjects.data ?? []).map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === subjectId ? "default" : "outline"}
            onClick={() => navigate({ search: { subject: s.id } })}
          >
            {s.name}
          </Button>
        ))}
      </div>

      {topics.isLoading || chapters.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading topics…</p>
      ) : !(topics.data ?? []).length ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No topics have been added for this subject yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(chapters.data ?? [])
            .filter((c) => (topics.data ?? []).some((t) => t.chapter_id === c.id))
            .map((c) => (
              <section key={c.id} className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <BookOpen className="h-4 w-4 text-primary" /> {c.name}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(topics.data ?? [])
                    .filter((t) => t.chapter_id === c.id)
                    .map((t) => (
                      <Link key={t.id} to="/topics/$topicId" params={{ topicId: t.id }} className="group">
                        <Card className="h-full transition-colors group-hover:border-primary">
                          <CardContent className="flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{t.name}</p>
                              <Badge variant="outline" className="mt-1.5">
                                {c.name}
                              </Badge>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
