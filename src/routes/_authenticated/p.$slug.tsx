import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/p/$slug")({
  head: () => ({
    meta: [
      { title: "Unlocked Page — CBSE 10 Prep" },
      { name: "description", content: "A special study page unlocked with your EXP." },
      { property: "og:title", content: "Unlocked Page — CBSE 10 Prep" },
      { property: "og:description", content: "Extra study material unlocked with EXP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomPage,
});

function CustomPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["custom-page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("custom_pages")
        .select("id, name, description, body")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!data)
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-3 py-10 text-center">
          <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This page is locked. Unlock it from the Store, or ask your teacher for access.
          </p>
          <Button asChild size="sm">
            <Link to="/todo">Go to Store</Link>
          </Button>
        </CardContent>
      </Card>
    );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">{data.name}</h1>
          {data.description ? <p className="text-sm text-muted-foreground">{data.description}</p> : null}
        </div>
      </header>
      {data.body ? (
        <Card>
          <CardContent className="whitespace-pre-wrap py-6 text-sm leading-relaxed">{data.body}</CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Your teacher hasn’t added content to this page yet.</p>
      )}
    </div>
  );
}
