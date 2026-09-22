import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GraduationCap, Lock, Clock, Star } from "lucide-react";
import { listStoreCourses, purchaseCourse, type StoreCourse } from "@/lib/courses.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Countdown, durationLabel } from "@/components/app/Countdown";

export function CourseStore() {
  const qc = useQueryClient();
  const load = useServerFn(listStoreCourses);
  const buy = useServerFn(purchaseCourse);
  const [selected, setSelected] = useState<StoreCourse | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["store-courses"], queryFn: () => load({ data: {} as never }) });

  const purchase = useMutation({
    mutationFn: (courseId: string) => buy({ data: { courseId } }),
    onSuccess: (res) => {
      setSelected(null);
      toast.success(res.alreadyOwned ? "You already have access" : "Course unlocked!");
      qc.invalidateQueries({ queryKey: ["store-courses"] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      qc.invalidateQueries({ queryKey: ["my-exp"] });
      qc.invalidateQueries({ queryKey: ["exp-store"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Purchase failed"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading courses…</p>;
  if (data.courses.length === 0) return null;

  const balance = data.balance;
  const enough = selected ? balance >= selected.exp_price : false;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Courses</h2>
        <p className="text-sm text-muted-foreground">Unlock a course with EXP for a limited time.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.courses.map((c) => (
          <Card key={c.id} className="flex flex-col overflow-hidden">
            {c.thumbnail_url ? (
              <img src={c.thumbnail_url} alt={c.name} className="h-36 w-full object-cover" loading="lazy" />
            ) : null}
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Access: {durationLabel(c.duration_value, c.duration_unit)}
                </p>
              </div>
              <Badge variant={c.hasAccess ? "secondary" : "outline"}>{c.exp_price} EXP</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              {c.description ? <p className="text-sm text-muted-foreground">{c.description}</p> : null}
              {c.hasAccess ? (
                <div className="space-y-2">
                  <Badge>✓ Purchased</Badge>
                  <p className="text-xs text-muted-foreground">
                    Access remaining: <Countdown expiresAt={c.expiresAt} />
                  </p>
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link to="/courses/$courseId" params={{ courseId: c.id }}>
                      Open course
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full sm:w-auto" onClick={() => setSelected(c)}>
                  Purchase with EXP
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected ? (
            enough ? (
              <>
                <DialogHeader>
                  <DialogTitle>Purchase {selected.name}?</DialogTitle>
                  <DialogDescription>
                    This starts your access right now and it cannot be paused.
                  </DialogDescription>
                </DialogHeader>
                <dl className="space-y-1.5 text-sm">
                  <Row label="Cost" value={`${selected.exp_price} EXP`} />
                  <Row label="Access" value={durationLabel(selected.duration_value, selected.duration_unit)} />
                  <Row label="Your EXP" value={`${balance.toLocaleString()} EXP`} />
                  <Row label="After purchase" value={`${(balance - selected.exp_price).toLocaleString()} EXP`} />
                </dl>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Cancel
                  </Button>
                  <Button disabled={purchase.isPending} onClick={() => purchase.mutate(selected.id)}>
                    <Star className="mr-1.5 h-4 w-4" /> Purchase
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Insufficient EXP
                  </DialogTitle>
                </DialogHeader>
                <dl className="space-y-1.5 text-sm">
                  <Row label="Course price" value={`${selected.exp_price} EXP`} />
                  <Row label="Your EXP" value={`${balance.toLocaleString()} EXP`} />
                  <Row label="You need" value={`${(selected.exp_price - balance).toLocaleString()} more EXP`} />
                </dl>
                <DialogFooter>
                  <Button onClick={() => setSelected(null)}>Close</Button>
                </DialogFooter>
              </>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
