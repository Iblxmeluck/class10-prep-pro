import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import { convertGamePoints, getExpStore, getGamePoints, purchaseStoreItem } from "@/lib/exp.functions";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ICONS = {
  note: BookOpen,
  pdf: FileText,
  video: Video,
  flashcards: Layers,
  course: GraduationCap,
  page: Sparkles,
} as const;

const TYPE_LABEL = {
  note: "Notes",
  pdf: "PDF / Document",
  video: "YouTube lecture",
  flashcards: "Flashcards",
  course: "Course",
  page: "Special page",
} as const;

type ItemType = keyof typeof ICONS;

export function ExpStore() {
  const qc = useQueryClient();
  const load = useServerFn(getExpStore);
  const buy = useServerFn(purchaseStoreItem);

  const { data, isLoading } = useQuery({ queryKey: ["exp-store"], queryFn: () => load({ data: {} as never }) });

  const purchase = useMutation({
    mutationFn: (itemId: string) => buy({ data: { itemId } }),
    onSuccess: (res) => {
      toast.success(res.alreadyOwned ? "You already own this" : "Unlocked! EXP deducted.");
      qc.invalidateQueries({ queryKey: ["exp-store"] });
      qc.invalidateQueries({ queryKey: ["my-pages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Purchase failed"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading store…</p>;

  return (
    <div className="space-y-6">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              <Star className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your EXP balance</p>
              <p className="font-display text-2xl font-semibold">{data.balance} EXP</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Earned in total: {data.lifetime} EXP</p>
        </CardContent>
      </Card>

      <GamePointsCard />

      <div>
        <h2 className="font-display text-lg font-semibold">Store</h2>
        <p className="text-sm text-muted-foreground">Spend EXP to unlock extra study material.</p>
      </div>

      {data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is in the store yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.items.map((item) => {
            const type = item.item_type as ItemType;
            const Icon = ICONS[type] ?? Sparkles;
            const page = (item as { custom_pages?: { name: string; slug: string } | null }).custom_pages;
            const link = (item as { links?: { url: string } | null }).links;
            const affordable = data.balance >= item.exp_price;
            return (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{TYPE_LABEL[type] ?? type}</p>
                  </div>
                  <Badge variant={item.purchased ? "secondary" : "outline"}>{item.exp_price} EXP</Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3">
                  {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                  {item.purchased ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge>Unlocked</Badge>
                      {page ? (
                        <Button asChild size="sm">
                          <Link to="/p/$slug" params={{ slug: page.slug }}>
                            Open page
                          </Link>
                        </Button>
                      ) : item.external_url || link?.url ? (
                        <Button
                          size="sm"
                          onClick={() => window.open((item.external_url || link?.url)!, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="mr-1.5 h-4 w-4" /> Open
                        </Button>
                      ) : type === "flashcards" ? (
                        <Button asChild size="sm">
                          <Link to="/flashcards">Open flashcards</Link>
                        </Button>
                      ) : type === "course" ? (
                        <Button asChild size="sm">
                          <Link to="/videos">Open courses</Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link to="/resources">Open resources</Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!affordable || purchase.isPending}
                      onClick={() => purchase.mutate(item.id)}
                    >
                      {affordable ? (
                        <>Buy for {item.exp_price} EXP</>
                      ) : (
                        <>
                          <Lock className="mr-1.5 h-4 w-4" /> Need {item.exp_price - data.balance} more EXP
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-display text-base font-semibold">Purchase history</h3>
          {data.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
                  <span className="truncate">
                    {(p as { store_items?: { title?: string } | null }).store_items?.title ?? "Item"}
                  </span>
                  <span className="shrink-0 text-muted-foreground">−{p.exp_spent} EXP</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-display text-base font-semibold">Recent EXP</h3>
          {data.ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No EXP activity yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {data.ledger.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
                  <span className="truncate capitalize">{l.reason.replace(/_/g, " ")}</span>
                  <span className={l.delta >= 0 ? "shrink-0 text-emerald-500" : "shrink-0 text-muted-foreground"}>
                    {l.delta >= 0 ? `+${l.delta}` : l.delta} EXP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
