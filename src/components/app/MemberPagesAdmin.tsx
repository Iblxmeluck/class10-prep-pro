import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import {
  adminExpOverview,
  deleteCustomPage,
  setPageMemberAccess,
  setPageVisibility,
} from "@/lib/exp.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MemberPagesAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(adminExpOverview);
  const visFn = useServerFn(setPageVisibility);
  const accessFn = useServerFn(setPageMemberAccess);
  const delFn = useServerFn(deleteCustomPage);

  const { data } = useQuery({ queryKey: ["admin-exp"], queryFn: () => load({ data: {} as never }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-exp"] });

  const setVis = useMutation({
    mutationFn: (v: { pageId: string; visibility?: "all" | "selected"; isPublished?: boolean }) => visFn({ data: v }),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });
  const setAccess = useMutation({
    mutationFn: (v: { pageId: string; userId: string; granted: boolean }) => accessFn({ data: v }),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });
  const removePage = useMutation({
    mutationFn: (pageId: string) => delFn({ data: { pageId } }),
    onSuccess: () => {
      toast.success("Page deleted");
      refresh();
    },
  });

  const pages = data?.pages ?? [];
  const members = data?.members ?? [];
  const access = data?.access ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Member pages</CardTitle>
        <p className="text-sm text-muted-foreground">
          Control who can see each special page. You can grant access without a purchase, or take it away.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No special pages yet — create one from EXP &amp; Store as a “Special page” item.
          </p>
        ) : (
          pages.map((p) => {
            const granted = access.filter((a) => a.page_id === p.id).map((a) => a.user_id);
            const grantedNames = members.filter((m) => granted.includes(m.id));
            return (
              <div key={p.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">/p/{p.slug}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={p.visibility}
                      onValueChange={(v) => setVis.mutate({ pageId: p.id, visibility: v as "all" | "selected" })}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All members</SelectItem>
                        <SelectItem value="selected">Selected members</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVis.mutate({ pageId: p.id, isPublished: !p.is_published })}
                    >
                      {p.is_published ? (
                        <>
                          <Eye className="mr-1.5 h-4 w-4" /> Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1.5 h-4 w-4" /> Hidden
                        </>
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete page" onClick={() => removePage.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {p.visibility === "all" ? (
                  <p className="text-xs text-muted-foreground">👥 Available to: everyone</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      👥 Available to:{" "}
                      {grantedNames.length
                        ? grantedNames.map((m) => m.display_name || m.username).join(", ")
                        : "nobody yet"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m) => {
                        const on = granted.includes(m.id);
                        return (
                          <Button
                            key={m.id}
                            size="sm"
                            variant={on ? "default" : "outline"}
                            onClick={() => setAccess.mutate({ pageId: p.id, userId: m.id, granted: !on })}
                          >
                            {m.display_name || m.username}
                          </Button>
                        );
                      })}
                    </div>
                  </>
                )}
                {p.is_published ? null : <Badge variant="outline">Hidden from everyone</Badge>}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
