import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MegaphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { SubjectChapterPicker } from "@/components/app/SubjectChapterPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const DEMAND_WANTS = [
  "Notes",
  "Quiz",
  "Questions",
  "YouTube video",
  "PDF resource",
  "Image resource",
  "Flashcards",
] as const;

export function RaiseDemandButton({ defaultWant }: { defaultWant?: (typeof DEMAND_WANTS)[number] }) {
  const { data: session } = useSessionInfo();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [chapterId, setChapterId] = useState<string | undefined>(undefined);
  const [want, setWant] = useState<string>(defaultWant ?? "Notes");
  const [details, setDetails] = useState("");

  const mine = useQuery({
    queryKey: ["my-demands", session?.userId],
    enabled: !!session?.userId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demands")
        .select("id, want, status, details, created_at")
        .eq("user_id", session!.userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const raise = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("demands").insert({
        user_id: session?.userId ?? "",
        subject_id: subjectId ?? null,
        chapter_id: chapterId ?? null,
        want,
        details: details.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demand sent to your teacher");
      setDetails("");
      qc.invalidateQueries({ queryKey: ["my-demands"] });
      qc.invalidateQueries({ queryKey: ["admin-demands"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (session?.isAdmin) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MegaphoneIcon className="mr-1.5 h-4 w-4" />
        Raise demand
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raise a demand</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <SubjectChapterPicker
              subjectId={subjectId}
              chapterId={chapterId}
              onSubjectChange={(id) => {
                setSubjectId(id);
                setChapterId(undefined);
              }}
              onChapterChange={setChapterId}
            />

            <div className="space-y-1.5">
              <Label>What do you need?</Label>
              <div className="flex flex-wrap gap-2">
                {DEMAND_WANTS.map((w) => (
                  <Button
                    key={w}
                    type="button"
                    size="sm"
                    variant={want === w ? "default" : "outline"}
                    onClick={() => setWant(w)}
                  >
                    {w}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demand-details">Anything more? (optional)</Label>
              <Textarea
                id="demand-details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Topic name, difficulty, exam date…"
              />
            </div>

            <Button
              className="w-full"
              disabled={!subjectId || raise.isPending}
              onClick={() => raise.mutate()}
            >
              Raise demand
            </Button>
            {!subjectId && <p className="text-xs text-muted-foreground">Choose a subject first.</p>}

            {(mine.data ?? []).length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-medium">Your recent demands</p>
                {(mine.data ?? []).map((d) => (
                  <div key={d.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{d.want}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={d.status === "done" ? "default" : "secondary"}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
