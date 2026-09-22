import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Layers, Plus, RotateCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { TopicSelect } from "@/components/app/TopicSelect";
import { FlashcardSetView } from "@/components/app/FlashcardSetView";
import { RaiseDemandButton } from "@/components/app/RaiseDemandButton";
import { generateFlashcardSet } from "@/lib/flashcards.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Search = { topic?: string | undefined; set?: string | undefined };

export const Route = createFileRoute("/_authenticated/flashcards")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    topic: typeof s['topic'] === "string" ? s['topic'] : undefined,
    set: typeof s['set'] === "string" ? s['set'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Flashcards — CBSE 10 Prep" },
      { name: "description", content: "Flip through topic-wise CBSE Class 10 flashcards to revise quickly." },
      { property: "og:title", content: "Flashcards — CBSE 10 Prep" },
      { property: "og:description", content: "Quick topic-wise revision flashcards for Class 10." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session } = useSessionInfo();
  const isAdmin = Boolean(session?.isAdmin);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subjectId, setSubjectId] = useState("none");
  const [chapterId, setChapterId] = useState("none");
  const [topicId, setTopicId] = useState("none");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const [aiSubject, setAiSubject] = useState("none");
  const [aiChapter, setAiChapter] = useState("none");
  const [aiTopic, setAiTopic] = useState("none");
  const [aiCount, setAiCount] = useState(10);
  const [aiTitle, setAiTitle] = useState("");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters-flat"],
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name, subject_id").order("sort_order")).data ?? [],
  });

  const sets = useQuery({
    queryKey: ["flashcard-sets", search.topic ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("flashcard_sets")
        .select("id, title, ai_generated, created_at, subjects(name), chapters(name), topics(name)")
        .order("created_at", { ascending: false });
      if (search.topic) q = q.eq("topic_id", search.topic);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const cards = useQuery({
    queryKey: ["flashcards", search.topic ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("flashcards")
        .select("id, front, back, topic_id, subjects(name), chapters(name), topics(name)")
        .is("set_id", null)
        .order("created_at", { ascending: false });
      if (search.topic) q = q.eq("topic_id", search.topic);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!front.trim() || !back.trim()) throw new Error("Fill in both sides of the card");
      const { error } = await supabase.from("flashcards").insert({
        front: front.trim(),
        back: back.trim(),
        subject_id: subjectId === "none" ? null : subjectId,
        chapter_id: chapterId === "none" ? null : chapterId,
        topic_id: topicId === "none" ? null : topicId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Flashcard added");
      setFront("");
      setBack("");
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flashcards").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Flashcard removed");
      void qc.invalidateQueries({ queryKey: ["flashcards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delSet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flashcard_sets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Flashcard set removed");
      void qc.invalidateQueries({ queryKey: ["flashcard-sets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (aiSubject === "none" || aiChapter === "none") throw new Error("Pick a subject and a chapter first");
      return await generateFlashcardSet({
        data: {
          subjectId: aiSubject,
          chapterId: aiChapter,
          topicId: aiTopic === "none" ? null : aiTopic,
          count: aiCount,
          ...(aiTitle.trim() ? { title: aiTitle.trim() } : {}),
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`${r.created} flashcards generated`);
      setAiTitle("");
      void qc.invalidateQueries({ queryKey: ["flashcard-sets"] });
      void navigate({ to: "/flashcards", search: { set: r.setId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visibleChapters = useMemo(
    () => (chapters.data ?? []).filter((c) => subjectId === "none" || c.subject_id === subjectId),
    [chapters.data, subjectId],
  );
  const aiChapters = useMemo(
    () => (chapters.data ?? []).filter((c) => aiSubject === "none" || c.subject_id === aiSubject),
    [chapters.data, aiSubject],
  );

  if (search.set) {
    return (
      <FlashcardSetView
        setId={search.set}
        isAdmin={isAdmin}
        onBack={() => void navigate({ to: "/flashcards", search: search.topic ? { topic: search.topic } : {} })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Flashcards</h1>
          <p className="text-sm text-muted-foreground">Open a set to study one card at a time, or flip a single card.</p>
        </div>
        <RaiseDemandButton defaultWant="Flashcards" />
      </header>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" /> Generate a flashcard set with AI
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={aiSubject}
                onValueChange={(v) => {
                  setAiSubject(v);
                  setAiChapter("none");
                  setAiTopic("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pick a subject</SelectItem>
                  {(subjects.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chapter</Label>
              <Select
                value={aiChapter}
                onValueChange={(v) => {
                  setAiChapter(v);
                  setAiTopic("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pick a chapter</SelectItem>
                  {aiChapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TopicSelect chapterId={aiChapter === "none" ? null : aiChapter} value={aiTopic} onChange={setAiTopic} />
            <div className="space-y-1.5">
              <Label htmlFor="ai-count">Number of cards</Label>
              <Input
                id="ai-count"
                type="number"
                min={1}
                max={30}
                value={aiCount}
                onChange={(e) => setAiCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ai-title">Set title (optional)</Label>
              <Input id="ai-title" value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} />
            </div>
            <div>
              <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                {generate.isPending ? "Generating…" : "Generate flashcards"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Flashcard sets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sets.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading sets…</p>
          ) : !sets.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No flashcard sets{search.topic ? " for this topic" : ""} yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sets.data.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{s.title}</p>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete flashcard set"
                        onClick={() => delSet.mutate(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.ai_generated && <Badge variant="secondary">AI</Badge>}
                    {s.subjects?.name && <Badge variant="outline">{s.subjects.name}</Badge>}
                    {s.topics?.name && <Badge variant="outline">{s.topics.name}</Badge>}
                  </div>
                  <Button
                    size="sm"
                    className="mt-auto"
                    onClick={() => void navigate({ to: "/flashcards", search: { set: s.id } })}
                  >
                    Study this set
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Add a single flashcard
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Front (question / term)</Label>
              <Textarea rows={2} value={front} onChange={(e) => setFront(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Back (answer)</Label>
              <Textarea rows={2} value={back} onChange={(e) => setBack(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={subjectId}
                onValueChange={(v) => {
                  setSubjectId(v);
                  setChapterId("none");
                  setTopicId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {(subjects.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chapter</Label>
              <Select
                value={chapterId}
                onValueChange={(v) => {
                  setChapterId(v);
                  setTopicId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No chapter</SelectItem>
                  {visibleChapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TopicSelect chapterId={chapterId === "none" ? null : chapterId} value={topicId} onChange={setTopicId} />
            <div className="flex items-end">
              <Button onClick={() => add.mutate()} disabled={add.isPending}>
                {add.isPending ? "Saving…" : "Add flashcard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cards.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading flashcards…</p>
      ) : !cards.data?.length ? null : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.data.map((card) => {
            const isFlipped = !!flipped[card.id];
            return (
              <Card
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => setFlipped((p) => ({ ...p, [card.id]: !p[card.id] }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setFlipped((p) => ({ ...p, [card.id]: !p[card.id] }));
                }}
                className={cn(
                  "cursor-pointer select-none transition-colors hover:border-primary",
                  isFlipped && "border-primary bg-primary/5",
                )}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={isFlipped ? "default" : "secondary"}>{isFlipped ? "Answer" : "Question"}</Badge>
                    <div className="flex items-center gap-1">
                      <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete flashcard"
                          onClick={(e) => {
                            e.stopPropagation();
                            del.mutate(card.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="min-h-16 text-sm leading-relaxed">{isFlipped ? card.back : card.front}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {card.subjects?.name && <Badge variant="outline">{card.subjects.name}</Badge>}
                    {card.topics?.name && <Badge variant="outline">{card.topics.name}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
