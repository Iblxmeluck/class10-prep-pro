import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { NotebookTabs, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getMistakes, removeMistake } from "@/lib/mistakes.functions";
import { answerPracticeQuestion } from "@/lib/quiz.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mistakes")({
  head: () => ({
    meta: [
      { title: "Weak Spots notebook — CBSE 10 Prep" },
      { name: "description", content: "Every question you got wrong, saved so you can re-test only your mistakes." },
      { property: "og:title", content: "Weak Spots notebook — CBSE 10 Prep" },
      { property: "og:description", content: "Re-test only the questions you got wrong." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Mistakes,
});

function Mistakes() {
  const load = useServerFn(getMistakes);
  const remove = useServerFn(removeMistake);
  const send = useServerFn(answerPracticeQuestion);
  const qc = useQueryClient();
  const [subject, setSubject] = useState("all");
  const [quiz, setQuiz] = useState<string[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<{ isCorrect: boolean; correctOption: number | null; explanation: string } | null>(null);
  const [fixed, setFixed] = useState(0);
  const started = useRef(Date.now());

  const { data = [], isLoading } = useQuery({ queryKey: ["mistakes"], queryFn: () => load({ data: {} }) });
  const subjects = useMemo(() => [...new Set(data.map((m) => m.subject).filter(Boolean))], [data]);
  const list = subject === "all" ? data : data.filter((m) => m.subject === subject);
  const byId = useMemo(() => new Map(data.map((m) => [m.question_id, m])), [data]);

  function start() {
    setQuiz([...list].sort(() => Math.random() - 0.5).map((m) => m.question_id));
    setI(0); setPicked(null); setFb(null); setFixed(0); started.current = Date.now();
  }
  async function answer(c: number) {
    if (!quiz || fb) return;
    setPicked(c);
    try {
      const r = await send({ data: { questionId: quiz[i]!, selectedOption: c, timeSpentSeconds: Math.max(1, Math.round((Date.now() - started.current) / 1000)) } });
      setFb(r);
      if (r.isCorrect) setFixed((f) => f + 1);
    } catch { toast.error("Could not check answer"); }
  }
  function next() {
    setPicked(null); setFb(null); started.current = Date.now();
    if (quiz && i + 1 < quiz.length) setI(i + 1);
    else { setQuiz(null); void qc.invalidateQueries({ queryKey: ["mistakes"] }); toast.success(`Re-test done — ${fixed} mistake(s) fixed`); }
  }

  if (quiz) {
    const q = byId.get(quiz[i]!);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">Question {i + 1} of {quiz.length}</Badge>
          <Button variant="ghost" size="sm" onClick={() => { setQuiz(null); void qc.invalidateQueries({ queryKey: ["mistakes"] }); }}>Stop</Button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{q?.subject} · {q?.chapter}</p>
          <p className="mt-2 text-lg font-medium">{q?.question_text}</p>
          <div className="mt-4 grid gap-2">
            {q?.options.map((o, k) => (
              <button key={k} disabled={!!fb} onClick={() => void answer(k)}
                className={cn("min-h-12 rounded-lg border border-border px-4 py-3 text-left text-sm",
                  !fb && "hover:border-primary",
                  fb && fb.correctOption === k && "border-primary bg-primary/10",
                  fb && !fb.isCorrect && picked === k && "border-destructive bg-destructive/10")}>
                <span className="mr-2 font-semibold">{String.fromCharCode(65 + k)}.</span>{o}
              </button>
            ))}
          </div>
          {fb && (
            <div className="mt-4 rounded-lg bg-secondary p-4 text-sm">
              <p className="font-semibold">{fb.isCorrect ? "Fixed! Removed from your weak spots." : "Still tricky — it stays in your notebook."}</p>
              {fb.explanation && <p className="mt-1 text-muted-foreground">{fb.explanation}</p>}
              <Button className="mt-3" size="sm" onClick={next}>{i + 1 < quiz.length ? "Next" : "Finish"}</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><NotebookTabs className="h-6 w-6" /> Weak Spots notebook</h1>
        <p className="mt-1 text-sm text-muted-foreground">Questions you got wrong in quizzes, practice and games are saved here. Answer one correctly to clear it.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {["all", ...subjects].map((s) => (
          <Button key={s} size="sm" variant={subject === s ? "default" : "outline"} onClick={() => setSubject(s)}>{s === "all" ? "All subjects" : s}</Button>
        ))}
        <Button className="ml-auto" disabled={!list.length} onClick={start}><RotateCcw className="mr-1.5 h-4 w-4" /> Re-test {list.length} mistake(s)</Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !list.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No weak spots right now. Great work!</div>
      ) : (
        <div className="grid gap-2">
          {list.map((m) => (
            <div key={m.question_id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.question_text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.subject} · {m.chapter} · wrong {m.wrong_count}× · from {m.source}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Remove" onClick={async () => { await remove({ data: { questionId: m.question_id } }); void qc.invalidateQueries({ queryKey: ["mistakes"] }); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
