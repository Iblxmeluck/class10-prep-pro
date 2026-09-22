import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { QuickQuizRunner } from "@/components/app/QuickQuizRunner";

export const Route = createFileRoute("/_authenticated/challenge")({
  head: () => ({
    meta: [
      { title: "60-Second Challenge — Class 10 Study Hub" },
      { name: "description", content: "Answer as many CBSE Class 10 questions as you can in 60 seconds." },
      { property: "og:title", content: "60-Second Challenge — Class 10 Study Hub" },
      { property: "og:description", content: "A fast 60-second question sprint using your own question bank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChallengePage,
});

function ChallengePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Timer className="h-5 w-5 text-[oklch(0.86_0.16_86)]" /> 60-Second Challenge
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Answer as many questions as you can before the timer runs out.</p>
      </header>
      <QuickQuizRunner mode="challenge" count={15} limitSeconds={60} accent="text-[oklch(0.86_0.16_86)]" />
    </div>
  );
}
