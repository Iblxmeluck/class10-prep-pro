import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Pencil, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { awardExpForEvent } from "@/lib/exp.functions";
import { ExpStore } from "@/components/app/ExpStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/todo")({
  head: () => ({
    meta: [
      { title: "To-Do — CBSE 10 Prep" },
      { name: "description", content: "Your daily study to-do history, newest day first, with completed tasks kept visible." },
      { property: "og:title", content: "To-Do — CBSE 10 Prep" },
      { property: "og:description", content: "Plan each study day and keep a full history of what you finished." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TodoPage,
});

type Todo = {
  id: string;
  task_date: string;
  content: string;
  is_done: boolean;
  sort_order: number;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function formatHeading(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const label = `${date.getDate()} ${date.toLocaleString("en-GB", { month: "short" }).toUpperCase()}`;
  return iso === todayISO() ? `${label} · TODAY` : label;
}

function TodoPage() {
  const { data: session } = useSessionInfo();
  const qc = useQueryClient();
  const award = useServerFn(awardExpForEvent);
  const [tab, setTab] = useState<"tasks" | "store">("tasks");
  const [date, setDate] = useState(todayISO());
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos", session?.userId],
    enabled: !!session?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("id, task_date, content, is_done, sort_order")
        .order("task_date", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Todo[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["todos"] });

  const addTask = useMutation({
    mutationFn: async () => {
      const value = text.trim();
      if (!value || !session?.userId) return;
      const max = todos.filter((t) => t.task_date === date).reduce((a, t) => Math.max(a, t.sort_order), 0);
      const { error } = await supabase
        .from("todos")
        .insert({ user_id: session.userId, task_date: date, content: value, sort_order: max + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      refresh();
    },
  });

  const toggle = useMutation({
    mutationFn: async (t: Todo) => {
      const { error } = await supabase.from("todos").update({ is_done: !t.is_done }).eq("id", t.id);
      if (error) throw error;
      if (!t.is_done) {
        try {
          await award({ data: { key: "todo_task", ref: t.id } });
        } catch {
          /* EXP is a bonus; never block the task */
        }
      }
    },
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["exp-store"] });
    },
  });

  const saveEdit = useMutation({
    mutationFn: async (id: string) => {
      const value = editText.trim();
      if (!value) return;
      const { error } = await supabase.from("todos").update({ content: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const days = Array.from(new Set(todos.map((t) => t.task_date))).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">To-Do</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your day-by-day study history. Nothing carries over — each day stands on its own.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "tasks" ? "default" : "outline"} onClick={() => setTab("tasks")}>
          <Check className="mr-1.5 h-4 w-4" /> Tasks
        </Button>
        <Button size="sm" variant={tab === "store" ? "default" : "outline"} onClick={() => setTab("store")}>
          <ShoppingBag className="mr-1.5 h-4 w-4" /> Store
        </Button>
      </div>

      {tab === "store" ? (
        <ExpStore />
      ) : (
        <>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          addTask.mutate();
        }}
      >
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sm:w-44"
          aria-label="Task date"
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          aria-label="Task"
        />
        <Button type="submit" disabled={!text.trim() || addTask.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet. Add your first one above.</p>
      ) : (
        <div className="space-y-10">
          {days.map((day) => {
            const items = todos.filter((t) => t.task_date === day);
            const done = items.filter((t) => t.is_done).length;
            return (
              <section key={day}>
                <div className="mb-3 flex items-baseline gap-3 border-b border-border pb-2">
                  <h2 className="font-display text-xl font-bold tracking-wide">{formatHeading(day)}</h2>
                  <span className="text-xs text-muted-foreground">
                    {done}/{items.length} done
                  </span>
                </div>
                <ul className="space-y-1">
                  {items.map((t) => (
                    <li key={t.id} className="group flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-muted/50">
                      <button
                        type="button"
                        onClick={() => toggle.mutate(t)}
                        aria-label={t.is_done ? "Mark as not done" : "Mark as done"}
                        aria-pressed={t.is_done}
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded border border-muted-foreground/50 transition-colors",
                          t.is_done && "border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        {t.is_done && <Check className="h-3.5 w-3.5" />}
                      </button>

                      {editingId === t.id ? (
                        <>
                          <Input
                            value={editText}
                            autoFocus
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit.mutate(t.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-8"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit.mutate(t.id)} aria-label="Save">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} aria-label="Cancel">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "min-w-0 flex-1 break-words text-sm",
                              t.is_done && "text-muted-foreground line-through",
                            )}
                          >
                            {t.content}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={() => {
                              setEditingId(t.id);
                              setEditText(t.content);
                            }}
                            aria-label="Edit task"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={() => remove.mutate(t.id)}
                            aria-label="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
