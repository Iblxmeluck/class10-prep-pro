import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ExpStore } from "@/components/app/ExpStore";
import { CourseStore } from "@/components/app/CourseStore";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({
    meta: [
      { title: "EXP Store — CBSE 10 Prep" },
      { name: "description", content: "Spend your EXP on notes, flashcards and time-limited courses." },
      { property: "og:title", content: "EXP Store — CBSE 10 Prep" },
      { property: "og:description", content: "Unlock study material and courses with the EXP you earn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <CourseStore />
        <ExpStore />
      </div>
    </AppShell>
  );
}
