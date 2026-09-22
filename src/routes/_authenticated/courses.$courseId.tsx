import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Clock, GraduationCap, Lock, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { getCourseForMember } from "@/lib/courses.functions";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Countdown } from "@/components/app/Countdown";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course — CBSE 10 Prep" },
      { name: "description", content: "Open a course you unlocked with EXP and see how much access time is left." },
      { property: "og:title", content: "Course — CBSE 10 Prep" },
      { property: "og:description", content: "Your unlocked course with a live access countdown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getCourseForMember);
  const [zoom, setZoom] = useState(1);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["course-access", courseId],
    queryFn: () => load({ data: { courseId } }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </AppShell>
    );
  }

  if (!data?.allowed) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Course Access Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your access to this course has expired, or you have not unlocked it yet.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/dashboard">Back to Study Hub</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/store">Go to EXP Store</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const course = data.course;
  const onExpire = () => {
    qc.invalidateQueries({ queryKey: ["my-courses"] });
    void refetch();
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold sm:text-2xl">{course.name}</h1>
              {course.description ? <p className="text-sm text-muted-foreground">{course.description}</p> : null}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Access remaining
            </p>
            <p className="font-semibold">
              <Countdown expiresAt={data.expiresAt} onExpire={onExpire} />
            </p>
          </div>
        </div>

        {course.body ? (
          <Card>
            <CardContent className="prose prose-sm max-w-none whitespace-pre-wrap py-5 dark:prose-invert">
              {course.body}
            </CardContent>
          </Card>
        ) : null}

        {course.course_url ? (
          <Card>
            <CardContent className="space-y-3 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="min-w-14 text-center text-sm font-medium tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={toggleFullscreen} className="ml-auto">
                  {isFullscreen ? <Minimize className="mr-1.5 h-4 w-4" /> : <Maximize className="mr-1.5 h-4 w-4" />}
                  {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                </Button>
              </div>
              <div
                ref={viewerRef}
                className={`overflow-auto rounded-lg border border-border bg-background ${isFullscreen ? "h-screen" : "h-[65vh]"}`}
              >
                <iframe
                  src={course.course_url}
                  title={course.name}
                  style={{
                    width: `${100 / zoom}%`,
                    height: `${(isFullscreen ? 100 : 65) / zoom}vh`,
                    transform: `scale(${zoom})`,
                    transformOrigin: "0 0",
                    border: "none",
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
