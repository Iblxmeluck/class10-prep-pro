import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data ?? [],
  });
}

export function useChapters(subjectId?: string | null) {
  return useQuery({
    queryKey: ["chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name").eq("subject_id", subjectId!).order("sort_order")).data ?? [],
  });
}

/**
 * Subject → Chapter selector. Subject is a plain dropdown; chapter is a searchable
 * combobox with an "All chapters" option. Works with native pickers on mobile.
 */
export function SubjectChapterPicker({
  subjectId,
  chapterId,
  onSubjectChange,
  onChapterChange,
}: {
  subjectId: string | undefined;
  chapterId: string | undefined;
  onSubjectChange: (id: string) => void;
  onChapterChange: (id: string | undefined) => void;
}) {
  const subjects = useSubjects();
  const chapters = useChapters(subjectId);
  const [open, setOpen] = useState(false);
  const list = chapters.data ?? [];
  const currentChapter = list.find((c) => c.id === chapterId);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Select value={subjectId ?? ""} onValueChange={onSubjectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={!subjectId}
              className="w-full justify-between font-normal"
            >
              <span className="truncate">{currentChapter?.name ?? "All chapters"}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search chapters…" />
              <CommandList>
                <CommandEmpty>No chapter found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__all__"
                    onSelect={() => {
                      onChapterChange(undefined);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !chapterId ? "opacity-100" : "opacity-0")} />
                    All chapters
                  </CommandItem>
                  {list.map((c, i) => (
                    <CommandItem
                      key={c.id}
                      value={`${i + 1} ${c.name}`}
                      onSelect={() => {
                        onChapterChange(c.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", chapterId === c.id ? "opacity-100" : "opacity-0")} />
                      <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="truncate">{c.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
