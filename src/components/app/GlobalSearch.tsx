import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, FileQuestion, FileText, Video, NotebookPen, Compass, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type Result = { id: string; label: string; kind: string; icon: typeof Search; go: () => void };

export function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data } = useQuery({
    queryKey: ["global-search", debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const like = `%${debounced}%`;
      const [questions, links, resources, topics, sets] = await Promise.all([
        supabase.from("questions").select("id, question_text, subject_id, chapter_id").ilike("question_text", like).limit(4),
        supabase.from("links").select("id, title, kind, topic_id").ilike("title", like).limit(4),
        supabase.from("resources").select("id, name, kind, topic_id").ilike("name", like).limit(4),
        supabase.from("topics").select("id, name").ilike("name", like).limit(4),
        supabase.from("flashcard_sets").select("id, title").ilike("title", like).limit(4),
      ]);
      return { questions: questions.data ?? [], links: links.data ?? [], resources: resources.data ?? [], topics: topics.data ?? [], sets: sets.data ?? [] };
    },
  });

  const results = useMemo<Result[]>(() => {
    if (!data) return [];
    const out: Result[] = [];
    for (const q of data.questions)
      out.push({
        id: `q-${q.id}`,
        label: q.question_text.slice(0, 90),
        kind: "Question",
        icon: FileQuestion,
        go: () => void navigate({ to: "/practice", search: { subject: q.subject_id, chapter: q.chapter_id } }),
      });
    for (const t of data.topics)
      out.push({ id: `t-${t.id}`, label: t.name, kind: "Topic", icon: Compass, go: () => void navigate({ to: "/topics/$topicId", params: { topicId: t.id } }) });
    for (const l of data.links)
      out.push({
        id: `l-${l.id}`,
        label: l.title,
        kind: l.kind === "video" ? "Video" : "Note",
        icon: l.kind === "video" ? Video : NotebookPen,
        go: () => void navigate({ to: l.kind === "video" ? "/videos" : "/notes" }),
      });
    for (const r of data.resources)
      out.push({ id: `r-${r.id}`, label: r.name, kind: r.kind === "pdf" ? "PDF" : "Image", icon: FileText, go: () => void navigate({ to: "/resources" }) });
    for (const s of data.sets)
      out.push({ id: `s-${s.id}`, label: s.title, kind: "Flashcards", icon: Layers, go: () => void navigate({ to: "/flashcards", search: { set: s.id } }) });
    return out;
  }, [data, navigate]);

  return (
    <div ref={box} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Search the Study Hub"
        placeholder="Search questions, tests, topics, videos, PDFs…"
        className="h-10 rounded-full border-border/70 bg-background/60 pl-9"
      />
      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches for “{debounced}”.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTerm("");
                  r.go();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/20"
              >
                <r.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.kind}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
