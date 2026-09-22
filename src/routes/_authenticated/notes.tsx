import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkLibrary } from "@/components/app/LinkLibrary";
import { RaiseDemandButton } from "@/components/app/RaiseDemandButton";

type Search = { topic?: string | undefined };

export const Route = createFileRoute("/_authenticated/notes")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    topic: typeof s['topic'] === "string" ? s['topic'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Notes — CBSE 10 Prep" },
      { name: "description", content: "Chapter-wise CBSE Class 10 revision notes shared as Google Drive or web links." },
      { property: "og:title", content: "Notes — CBSE 10 Prep" },
      { property: "og:description", content: "Read chapter-wise Class 10 revision notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { topic } = Route.useSearch();
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
          <h1 className="font-display text-2xl font-semibold">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Revision notes shared as Google Drive or any web link.
          </p>
        </div>
        <RaiseDemandButton defaultWant="Notes" />
      </div>
      <LinkLibrary
        topicId={topic}
        kind="note"
        addTitle="Add a notes link"
        emptyText="No notes have been shared yet."
        placeholder="https://drive.google.com/..."
      />
    </div>
  );
}
