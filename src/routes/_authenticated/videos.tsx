import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkLibrary } from "@/components/app/LinkLibrary";
import { RaiseDemandButton } from "@/components/app/RaiseDemandButton";
import { Courses } from "@/components/app/Courses";

type Search = { topic?: string | undefined };

export const Route = createFileRoute("/_authenticated/videos")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    topic: typeof s['topic'] === "string" ? s['topic'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Video Resources — CBSE 10 Prep" },
      { name: "description", content: "Chapter-wise CBSE Class 10 YouTube video lessons shared by your teacher." },
      { property: "og:title", content: "Video Resources — CBSE 10 Prep" },
      { property: "og:description", content: "Watch chapter-wise Class 10 video lessons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideosPage,
});

function VideosPage() {
  const { topic } = Route.useSearch();
  const [tab, setTab] = useState<"videos" | "courses">(topic ? "videos" : "courses");
  return (
    <div className="space-y-6">
      {topic && (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/topics/$topicId" params={{ topicId: topic }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to topic
          </Link>
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Video resources</h1>
          <p className="text-sm text-muted-foreground">YouTube lessons play right here, chapter by chapter.</p>
        </div>
        <RaiseDemandButton defaultWant="YouTube video" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "courses" ? "default" : "outline"} onClick={() => setTab("courses")}>
          Courses
        </Button>
        <Button size="sm" variant={tab === "videos" ? "default" : "outline"} onClick={() => setTab("videos")}>
          Video resources
        </Button>
      </div>

      {tab === "videos" ? (
        <LinkLibrary
          topicId={topic}
          kind="video"
          addTitle="Add a YouTube link"
          emptyText="No video lessons have been added yet."
          placeholder="https://www.youtube.com/watch?v=..."
        />
      ) : (
        <Courses />
      )}
    </div>
  );
}
