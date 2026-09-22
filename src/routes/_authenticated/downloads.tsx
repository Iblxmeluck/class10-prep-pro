import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — CBSE 10 Prep" },
      { name: "description", content: "Every PDF and image file you have downloaded, with dates." },
      { property: "og:title", content: "Downloads — CBSE 10 Prep" },
      { property: "og:description", content: "Track your downloaded study resources." },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const downloads = useQuery({
    queryKey: ["my-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("id, created_at, resources(name, kind)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Downloads</h1>
        <p className="text-sm text-muted-foreground">Your most recent resource downloads.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Download history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {downloads.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!downloads.isLoading && (downloads.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing downloaded yet.</p>
          )}
          {(downloads.data ?? []).map((d) => {
            const res = (d as { resources?: { name?: string; kind?: string } | null }).resources;
            return (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{res?.name ?? "Resource"}</span>
                {res?.kind && <Badge variant="secondary">{res.kind.toUpperCase()}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleString()}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
