import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudyStatistics } from "@/components/study/StudyStatistics";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/tracking")({
  head: () => ({
    meta: [
      { title: "Student Tracking — CBSE 10 Prep" },
      { name: "description", content: "Track each student's quiz attempts, scores and chapter-wise progress." },
      { property: "og:title", content: "Student Tracking — CBSE 10 Prep" },
      { property: "og:description", content: "Per-student attempt history and performance trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackingPage,
});

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

function TrackingPage() {
  const [userId, setUserId] = useState("");

  const members = useQuery({
    queryKey: ["tracking-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, last_login_at")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const attempts = useQuery({
    queryKey: ["tracking-attempts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select(
          "id, attempt_number, score, total_marks, correct_count, incorrect_count, skipped_count, time_taken_seconds, submitted_at, quizzes(title, quiz_number, source, subjects(name), chapters(name))",
        )
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = attempts.data ?? [];
  const totalAttempts = rows.length;
  const avg =
    totalAttempts > 0
      ? Math.round(
          (rows.reduce((a, r) => a + (r.total_marks ? r.score / r.total_marks : 0), 0) / totalAttempts) * 100,
        )
      : 0;

  const byChapter = new Map<string, { attempts: number; best: number }>();
  for (const r of rows) {
    const key = `${r.quizzes?.subjects?.name ?? "—"} · ${r.quizzes?.chapters?.name ?? "—"}`;
    const pct = r.total_marks ? Math.round((r.score / r.total_marks) * 100) : 0;
    const cur = byChapter.get(key) ?? { attempts: 0, best: 0 };
    byChapter.set(key, { attempts: cur.attempts + 1, best: Math.max(cur.best, pct) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Student tracking</h1>
        <p className="text-sm text-muted-foreground">Attempt history and chapter-wise progress for each student.</p>
      </div>

      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue placeholder="Choose a student" />
        </SelectTrigger>
        <SelectContent>
          {(members.data ?? []).map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.display_name || m.username} (@{m.username})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {userId && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Last login</CardTitle>
            </CardHeader>
            <CardContent className="text-base font-medium">
              {(() => {
                const m = (members.data ?? []).find((x) => x.id === userId);
                return m?.last_login_at ? new Date(m.last_login_at).toLocaleString() : "Never signed in yet";
              })()}
            </CardContent>
          </Card>

          <StudyStatistics userId={userId} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total attempts</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{totalAttempts}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Average score</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{avg}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Chapters covered</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{byChapter.size}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chapter-by-chapter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {byChapter.size === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
              {[...byChapter.entries()].map(([chapter, v]) => (
                <div key={chapter} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span>{chapter}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="secondary">{v.attempts} attempts</Badge>
                    <span>best {v.best}%</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Every attempt</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Breakdown</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[16rem]">
                        <span className="block truncate">
                          Quiz {r.quizzes?.quiz_number}: {r.quizzes?.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.quizzes?.subjects?.name} · {r.quizzes?.chapters?.name} · {r.quizzes?.source === "ai" ? "AI" : "Manual"}
                        </span>
                      </TableCell>
                      <TableCell>#{r.attempt_number}</TableCell>
                      <TableCell>
                        {r.score}/{r.total_marks}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.correct_count} correct · {r.incorrect_count} wrong · {r.skipped_count} skipped
                      </TableCell>
                      <TableCell>{fmtTime(r.time_taken_seconds)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.submitted_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground">
                        No attempts recorded for this student yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
