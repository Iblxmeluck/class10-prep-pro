import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CalendarDays, Layers, NotebookPen, Settings2 } from "lucide-react";
import { getEmergencyFocus } from "@/lib/challenge.functions";
import { QuickQuizRunner } from "@/components/app/QuickQuizRunner";
import { EventPrep, useActiveEvents } from "@/components/app/EventPrep";
import { useSessionInfo } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({
    meta: [
      { title: "Exam Emergency — Class 10 Study Hub" },
      { name: "description", content: "Urgent revision mode: your weakest chapters plus a rapid-fire question round." },
      { property: "og:title", content: "Exam Emergency — Class 10 Study Hub" },
      { property: "og:description", content: "Last-minute CBSE Class 10 revision focused on your weakest chapters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const { data: session } = useSessionInfo();
  const activeEvents = useActiveEvents();
  const events = activeEvents.data ?? [];
  const [showQuick, setShowQuick] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {session?.isAdmin && (
        <Link
          to="/admin/events"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs transition-colors hover:border-primary"
        >
          <Settings2 className="h-3.5 w-3.5" /> Manage events
        </Link>
      )}

      {events.length > 0 && !showQuick ? (
        <>
          <EventPrep events={events} />
          <button
            type="button"
            onClick={() => setShowQuick(true)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs transition-colors hover:border-primary"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Quick revision mode
          </button>
        </>
      ) : (
        <>
          {events.length > 0 && (
            <button
              type="button"
              onClick={() => setShowQuick(false)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs transition-colors hover:border-primary"
            >
              <CalendarDays className="h-3.5 w-3.5" /> Back to event plan
            </button>
          )}
          <QuickEmergency />
        </>
      )}
    </div>
  );
}

function QuickEmergency() {
  const { data } = useQuery({ queryKey: ["emergency-focus"], queryFn: () => getEmergencyFocus() });
  const focus = data?.focus ?? [];

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold">
          <AlertTriangle className="h-5 w-5 text-[oklch(0.7_0.19_45)]" /> Exam Emergency
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Short on time? Revise your weakest chapters first, then take a rapid round.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display font-semibold">Fix these first</h2>
        {focus.length ? (
          <div className="mt-3 space-y-2">
            {focus.map((f) => (
              <div key={f.chapterId} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{f.chapter}</p>
                <p className="text-xs text-muted-foreground">
                  {f.subject} · Accuracy {f.accuracy}% · {f.wrong} wrong of {f.total}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to="/practice"
                    search={{ subject: f.subjectId, chapter: f.chapterId }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
                  >
                    Practice <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to="/notes"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs"
                  >
                    <NotebookPen className="h-3.5 w-3.5" /> Notes
                  </Link>
                  <Link
                    to="/flashcards"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs"
                  >
                    <Layers className="h-3.5 w-3.5" /> Flashcards
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Once you attempt some questions, your weakest chapters will be listed here automatically.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-semibold">Rapid revision round</h2>
        <QuickQuizRunner mode="emergency" count={10} limitSeconds={null} weakFirst accent="text-[oklch(0.7_0.19_45)]" />
      </section>
    </div>
  );
}
