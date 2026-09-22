import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Brain,
  FileQuestion,
  FileText,
  HelpCircle,
  ImageIcon,
  NotebookPen,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/topics/$topicId")({
  head: () => ({
    meta: [
      { title: "Topic resources — CBSE 10 Prep" },
      {
        name: "description",
        content: "Videos, PDFs, images, notes, flashcards, questions and quizzes for this CBSE Class 10 topic.",
      },
      { property: "og:title", content: "Topic resources — CBSE 10 Prep" },
      { property: "og:description", content: "Everything for one topic, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopicHub,
});

function TopicHub() {
  const { topicId } = Route.useParams();

  const topic = useQuery({
    queryKey: ["topic", topicId],
    queryFn: async () =>
      (
        await supabase
          .from("topics")
          .select("id, name, chapter_id, chapters(id, name, subject_id, subjects(id, name))")
          .eq("id", topicId)
          .maybeSingle()
      ).data,
  });

  const counts = useQuery({
    queryKey: ["topic-counts", topicId],
    queryFn: async () => {
      const [videos, notes, pdfs, images, questions, quizzes, flashcards] = await Promise.all([
        supabase.from("links").select("id", { count: "exact", head: true }).eq("topic_id", topicId).eq("kind", "video"),
        supabase.from("links").select("id", { count: "exact", head: true }).eq("topic_id", topicId).eq("kind", "note"),
        supabase.from("resources").select("id", { count: "exact", head: true }).eq("topic_id", topicId).eq("kind", "pdf"),
        supabase
          .from("resources")
          .select("id", { count: "exact", head: true })
          .eq("topic_id", topicId)
          .eq("kind", "image"),
        supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("topic_id", topicId)
          .eq("status", "published"),
        supabase
          .from("quizzes")
          .select("id", { count: "exact", head: true })
          .eq("topic_id", topicId)
          .eq("is_published", true),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
      ]);
      return {
        videos: videos.count ?? 0,
        notes: notes.count ?? 0,
        pdfs: pdfs.count ?? 0,
        images: images.count ?? 0,
        questions: questions.count ?? 0,
        quizzes: quizzes.count ?? 0,
        flashcards: flashcards.count ?? 0,
      };
    },
  });

  const chapter = (topic.data as { chapters?: { id: string; name: string; subjects?: { id: string; name: string } } } | null | undefined)
    ?.chapters;
  const subject = chapter?.subjects;

  const c = counts.data;

  const tiles = [
    {
      icon: Video,
      emoji: "📺",
      title: "Video resources",
      action: "Watch videos",
      count: c?.videos,
      to: "/videos" as const,
      search: { topic: topicId },
    },
    {
      icon: FileText,
      emoji: "📄",
      title: "PDF resources",
      action: "View PDFs",
      count: c?.pdfs,
      to: "/resources" as const,
      search: { topic: topicId, kind: "pdf" },
    },
    {
      icon: ImageIcon,
      emoji: "🖼️",
      title: "Images",
      action: "View images",
      count: c?.images,
      to: "/resources" as const,
      search: { topic: topicId, kind: "image" },
    },
    {
      icon: NotebookPen,
      emoji: "📝",
      title: "Notes",
      action: "Read notes",
      count: c?.notes,
      to: "/notes" as const,
      search: { topic: topicId },
    },
    {
      icon: Brain,
      emoji: "🃏",
      title: "Flashcards",
      action: "Study flashcards",
      count: c?.flashcards,
      to: "/flashcards" as const,
      search: { topic: topicId },
    },
    {
      icon: HelpCircle,
      emoji: "❓",
      title: "Questions",
      action: "Practice questions",
      count: c?.questions,
      to: "/practice" as const,
      search: { subject: subject?.id, chapter: chapter?.id, topic: topicId },
    },
    {
      icon: FileQuestion,
      emoji: "🧠",
      title: "Quiz",
      action: "Start quiz",
      count: c?.quizzes,
      to: "/quizzes" as const,
      search: { subject: subject?.id, topic: topicId },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/topics" search={subject?.id ? { subject: subject.id } : {}}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All topics
          </Link>
        </Button>
        <h1 className="mt-2 font-display text-2xl font-semibold">
          {subject?.name ? `${subject.name} → ` : ""}
          {topic.data?.name ?? "Topic"}
        </h1>
        {chapter?.name && (
          <Badge variant="outline" className="mt-2">
            {chapter.name}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.title} className="flex h-full flex-col transition-colors hover:border-primary">
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-lg">{t.emoji}</span>
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {counts.isLoading ? "Counting…" : `${t.count ?? 0} available`}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="mt-auto w-full" variant={t.count ? "default" : "secondary"}>
                <Link to={t.to} search={t.search as never}>
                  <t.icon className="mr-1.5 h-4 w-4" /> {t.action}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
