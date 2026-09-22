import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, ArrowDown, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Card = { id: string; front: string; back: string; position: number };

export function FlashcardSetView({
  setId,
  isAdmin,
  onBack,
}: {
  setId: string;
  isAdmin: boolean;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ front: "", back: "" });
  const [newCard, setNewCard] = useState({ front: "", back: "" });
  const [manage, setManage] = useState(false);

  const set = useQuery({
    queryKey: ["flashcard-set", setId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select("id, title, is_published, subjects(name), chapters(name), topics(name)")
        .eq("id", setId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const cards = useQuery({
    queryKey: ["flashcard-set-cards", setId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id, front, back, position")
        .eq("set_id", setId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Card[];
    },
  });

  const list = useMemo(() => cards.data ?? [], [cards.data]);
  const total = list.length;
  const current = list[Math.min(index, Math.max(total - 1, 0))];

  const refresh = () => void qc.invalidateQueries({ queryKey: ["flashcard-set-cards", setId] });

  const save = useMutation({
    mutationFn: async ({ id, front, back }: { id: string; front: string; back: string }) => {
      const { error } = await supabase.from("flashcards").update({ front, back }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Card updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!newCard.front.trim() || !newCard.back.trim()) throw new Error("Fill in the question and the answer");
      const { error } = await supabase.from("flashcards").insert({
        set_id: setId,
        front: newCard.front.trim(),
        back: newCard.back.trim(),
        position: total,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewCard({ front: "", back: "" });
      toast.success("Card added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flashcards").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setIndex((i) => Math.max(0, Math.min(i, total - 2)));
      toast.success("Card deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const at = list.findIndex((c) => c.id === id);
      const to = at + dir;
      if (at < 0 || to < 0 || to >= list.length) return;
      const reordered = [...list];
      const [item] = reordered.splice(at, 1);
      reordered.splice(to, 0, item!);
      for (let i = 0; i < reordered.length; i++) {
        const card = reordered[i]!;
        if (card.position !== i) {
          const { error } = await supabase.from("flashcards").update({ position: i }).eq("id", card.id);
          if (error) throw new Error(error.message);
        }
      }
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const step = (dir: -1 | 1) => {
    setRevealed(false);
    setIndex((i) => Math.min(Math.max(i + dir, 0), Math.max(total - 1, 0)));
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All flashcard sets
        </Button>
        <h1 className="mt-2 font-display text-2xl font-semibold">{set.data?.title ?? "Flashcards"}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {set.data?.subjects?.name && <Badge variant="outline">{set.data.subjects.name}</Badge>}
          {set.data?.chapters?.name && <Badge variant="outline">{set.data.chapters.name}</Badge>}
          {set.data?.topics?.name && <Badge variant="outline">{set.data.topics.name}</Badge>}
        </div>
      </div>

      {cards.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading cards…</p>
      ) : total === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            This set has no cards yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span aria-live="polite">
              {Math.min(index + 1, total)} / {total}
            </span>
            <span>{revealed ? "Answer" : "Tap the card to reveal the answer"}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((Math.min(index, total - 1) + 1) / total) * 100}%` }}
            />
          </div>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setRevealed((r) => !r)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setRevealed((r) => !r);
              }
            }}
            className="cursor-pointer select-none transition-colors hover:border-primary"
          >
            <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
              <Badge variant={revealed ? "default" : "secondary"}>{revealed ? "Answer" : "Question"}</Badge>
              <p className="text-base leading-relaxed">{revealed ? current?.back : current?.front}</p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => step(-1)} disabled={index === 0}>
              Previous
            </Button>
            <Button variant="secondary" onClick={() => setRevealed((r) => !r)}>
              {revealed ? "Hide answer" : "Show answer"}
            </Button>
            <Button onClick={() => step(1)} disabled={index >= total - 1}>
              Next
            </Button>
          </div>
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Edit cards</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setManage((m) => !m)}>
              {manage ? "Done" : "Manage"}
            </Button>
          </CardHeader>
          {manage && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {list.map((c, i) => (
                  <div key={c.id} className="rounded-md border border-border p-3">
                    {editing === c.id ? (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          value={draft.front}
                          onChange={(e) => setDraft((d) => ({ ...d, front: e.target.value }))}
                        />
                        <Textarea
                          rows={2}
                          value={draft.back}
                          onChange={(e) => setDraft((d) => ({ ...d, back: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => save.mutate({ id: c.id, ...draft })}>
                            <Check className="mr-1.5 h-4 w-4" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            <X className="mr-1.5 h-4 w-4" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            Q{i + 1}. {c.front}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{c.back}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Move card up"
                            disabled={i === 0 || move.isPending}
                            onClick={() => move.mutate({ id: c.id, dir: -1 })}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Move card down"
                            disabled={i === total - 1 || move.isPending}
                            onClick={() => move.mutate({ id: c.id, dir: 1 })}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Edit card"
                            onClick={() => {
                              setEditing(c.id);
                              setDraft({ front: c.front, back: c.back });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete card"
                            onClick={() => remove.mutate(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>New question</Label>
                  <Input value={newCard.front} onChange={(e) => setNewCard((c) => ({ ...c, front: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>New answer</Label>
                  <Input value={newCard.back} onChange={(e) => setNewCard((c) => ({ ...c, back: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending}>
                <Plus className="mr-1.5 h-4 w-4" /> Add card to this set
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
