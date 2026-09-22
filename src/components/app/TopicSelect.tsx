import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Topics for one chapter, as a simple dropdown. "none" means "not linked to a topic". */
export function useTopics(chapterId?: string | null) {
  return useQuery({
    queryKey: ["topics", chapterId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("topics").select("id, name, chapter_id").order("sort_order");
      if (chapterId) q = q.eq("chapter_id", chapterId);
      return (await q).data ?? [];
    },
  });
}

export function TopicSelect({
  chapterId,
  value,
  onChange,
  label = "Topic",
}: {
  chapterId?: string | null;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const topics = useTopics(chapterId ?? null);
  const list = (topics.data ?? []).filter((t) => !chapterId || t.chapter_id === chapterId);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={!chapterId}>
        <SelectTrigger>
          <SelectValue placeholder={chapterId ? "No topic" : "Pick a chapter first"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No topic</SelectItem>
          {list.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
