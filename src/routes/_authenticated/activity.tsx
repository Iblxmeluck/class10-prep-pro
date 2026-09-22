import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MinusCircle, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "My Activity — CBSE 10 Prep" },
      { name: "description", content: "Review your CBSE Class 10 practice history, accuracy and downloads." },
      { property: "og:title", content: "My Activity — CBSE 10 Prep" },
      { property: "og:description", content: "Every question you attempted and every resource you opened." },
    ],
  }),
  component: ActivityPage,
});

const fmt = (iso: string) => new Date(iso).toLocaleString();

type AttemptRow = {
  id: string;
  created_at: string;
  is_correct: boolean;
  is_skipped: boolean;
  marks_awarded: number;
  time_spent_seconds: number;
  questions: {
    question_text: string;
    marks: number;
    subjects: { name: string } | null;
    chapters: { name: string } | null;
  } | null;
};

function ActivityPage() {
  const { data: session } = useSessionInfo();
  const qc = useQueryClient();

  const { data: logs } = useQuery({
    queryKey: ["my-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, created_at, event, detail")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["my-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_attempts")
        .select(
          "id, created_at, is_correct, is_skipped, marks_awarded, time_spent_seconds, questions(question_text, marks, subjects(name), chapters(name))",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as AttemptRow[];
    },
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (!session?.userId) throw new Error("Not signed in");
      const a = await supabase.from("question_attempts").delete().eq("user_id", session.userId);
      if (a.error) throw new Error(a.error.message);
      const l = await supabase.from("activity_logs").delete().eq("user_id", session.userId);
      if (l.error) throw new Error(l.error.message);
    },
    onSuccess: () => {
      toast.success("History cleared");
      void qc.invalidateQueries({ queryKey: ["my-logs"] });
      void qc.invalidateQueries({ queryKey: ["my-attempts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My activity</h1>
          <p className="text-sm text-muted-foreground">Your recent practice attempts and account events.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={clear.isPending}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Clear history
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear your activity history?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes your question attempts and account events. Quiz scores and study time are
                not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => clear.mutate()}>Clear history</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent question attempts</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead className="hidden md:table-cell">Subject</TableHead>
                <TableHead className="hidden lg:table-cell">Chapter</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="hidden sm:table-cell">Marks</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(attempts ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[220px] truncate sm:max-w-xs">
                    {a.questions?.question_text ?? "Question removed"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{a.questions?.subjects?.name ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{a.questions?.chapters?.name ?? "—"}</TableCell>
                  <TableCell>
                    {a.is_skipped ? (
                      <Badge variant="secondary" className="gap-1">
                        <MinusCircle className="h-3 w-3" /> Skipped
                      </Badge>
                    ) : a.is_correct ? (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                        <CheckCircle2 className="h-3 w-3" /> Correct
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Wrong
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {a.marks_awarded}/{a.questions?.marks ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{a.time_spent_seconds}s</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmt(a.created_at)}</TableCell>
                </TableRow>
              ))}
              {!attempts?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No attempts yet — start practicing to see them here.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(logs ?? []).map((l) => (
            <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0">
              <span className="text-sm">
                <strong className="font-medium">{l.event}</strong>
                {l.detail ? <span className="text-muted-foreground"> — {l.detail}</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">{fmt(l.created_at)}</span>
            </div>
          ))}
          {!logs?.length ? <p className="text-sm text-muted-foreground">Nothing logged yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
