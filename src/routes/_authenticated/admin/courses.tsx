import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2, X } from "lucide-react";
import {
  adminCoursesOverview,
  deleteCourse,
  grantCourseAccess,
  revokeCourseAccess,
  saveCourse,
  setCourseFlags,
  type DurationUnit,
} from "@/lib/courses.functions";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { durationLabel } from "@/components/app/Countdown";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  head: () => ({
    meta: [
      { title: "Courses — CBSE 10 Prep" },
      { name: "description", content: "Create EXP courses with timed access and track member purchases." },
      { property: "og:title", content: "Courses — CBSE 10 Prep" },
      { property: "og:description", content: "Manage paid courses, prices, access duration and purchases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminCoursesPage,
});

const UNITS: DurationUnit[] = ["minute", "hour", "day", "week", "month"];

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  description: "",
  thumbnailUrl: "",
  courseUrl: "",
  body: "",
  expPrice: "500",
  durationValue: "30",
  durationUnit: "day" as DurationUnit,
  isActive: true,
  storeVisible: true,
};

function AdminCoursesPage() {
  const qc = useQueryClient();
  const load = useServerFn(adminCoursesOverview);
  const saveFn = useServerFn(saveCourse);
  const flagFn = useServerFn(setCourseFlags);
  const delFn = useServerFn(deleteCourse);
  const grantFn = useServerFn(grantCourseAccess);
  const revokeFn = useServerFn(revokeCourseAccess);

  const { data } = useQuery({ queryKey: ["admin-courses"], queryFn: () => load({ data: {} as never }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-courses"] });

  const [form, setForm] = useState({ ...EMPTY });
  const [grantCourse, setGrantCourse] = useState("");
  const [grantUser, setGrantUser] = useState("");

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name.trim(),
          description: form.description.trim(),
          thumbnailUrl: form.thumbnailUrl.trim() || null,
          courseUrl: form.courseUrl.trim() || null,
          body: form.body,
          expPrice: Number(form.expPrice) || 0,
          durationValue: Math.max(1, Number(form.durationValue) || 1),
          durationUnit: form.durationUnit,
          isActive: form.isActive,
          storeVisible: form.storeVisible,
        },
      }),
    onSuccess: () => {
      toast.success("Course saved");
      setForm({ ...EMPTY });
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const memberName = (id: string) => {
    const m = data?.members.find((x) => x.id === id);
    return m ? m.display_name || m.username : "Member";
  };
  const courseName = (id: string) => data?.courses.find((c) => c.id === id)?.name ?? "Course";
  const statusOf = (p: { status: string; expires_at: string | null }) =>
    p.status !== "active" ? "Cancelled" : !p.expires_at || new Date(p.expires_at) > new Date() ? "Active" : "Expired";

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-semibold sm:text-2xl">Courses</h1>
          <p className="text-sm text-muted-foreground">Sell courses for EXP with an exact access duration.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{form.id ? "Edit course" : "New course"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Course name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="AARAMBH 2026–27" />
            </div>
            <div className="space-y-1.5">
              <Label>EXP price</Label>
              <Input inputMode="numeric" value={form.expPrice} onChange={(e) => setForm({ ...form, expPrice: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Thumbnail image URL</Label>
              <Input value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Course website URL</Label>
              <Input value={form.courseUrl} onChange={(e) => setForm({ ...form, courseUrl: e.target.value })} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Duration value</Label>
              <Input inputMode="numeric" value={form.durationValue} onChange={(e) => setForm({ ...form, durationValue: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration unit</Label>
              <Select value={form.durationUnit} onValueChange={(v) => setForm({ ...form, durationUnit: v as DurationUnit })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Course notes / content shown on the page</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.storeVisible} onCheckedChange={(v) => setForm({ ...form, storeVisible: v })} />
              <Label>Show in store</Label>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
                <Plus className="mr-1.5 h-4 w-4" /> {form.id ? "Save changes" : "Create course"}
              </Button>
              {form.id ? (
                <Button variant="outline" onClick={() => setForm({ ...EMPTY })}>
                  <X className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.courses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses yet.</p>
            ) : (
              (data?.courses ?? []).map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.exp_price} EXP · {durationLabel(c.duration_value, c.duration_unit)}
                    </p>
                  </div>
                  <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Disabled"}</Badge>
                  <Badge variant={c.store_visible ? "secondary" : "outline"}>{c.store_visible ? "In store" : "Hidden"}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        id: c.id,
                        name: c.name,
                        description: c.description ?? "",
                        thumbnailUrl: c.thumbnail_url ?? "",
                        courseUrl: c.course_url ?? "",
                        body: c.body ?? "",
                        expPrice: String(c.exp_price),
                        durationValue: String(c.duration_value),
                        durationUnit: c.duration_unit as DurationUnit,
                        isActive: c.is_active,
                        storeVisible: c.store_visible,
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await flagFn({ data: { id: c.id, isActive: !c.is_active } });
                      refresh();
                    }}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await delFn({ data: { id: c.id } });
                      toast.success("Course deleted");
                      refresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grant a course to a member</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1 space-y-1.5">
              <Label>Course</Label>
              <Select value={grantCourse} onValueChange={setGrantCourse}>
                <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
                <SelectContent>
                  {(data?.courses ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-44 flex-1 space-y-1.5">
              <Label>Member</Label>
              <Select value={grantUser} onValueChange={setGrantUser}>
                <SelectTrigger><SelectValue placeholder="Choose member" /></SelectTrigger>
                <SelectContent>
                  {(data?.members ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.display_name || m.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!grantCourse || !grantUser}
              onClick={async () => {
                await grantFn({ data: { courseId: grantCourse, userId: grantUser, useDuration: true } });
                toast.success("Access granted");
                refresh();
              }}
            >
              Grant access
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchases</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {(data?.purchases ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-2">Member</th>
                    <th className="pb-2">Course</th>
                    <th className="pb-2">EXP paid</th>
                    <th className="pb-2">Purchased</th>
                    <th className="pb-2">Expires</th>
                    <th className="pb-2">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(data?.purchases ?? []).map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2">{memberName(p.user_id)}</td>
                      <td className="py-2">{courseName(p.course_id)}</td>
                      <td className="py-2">{p.exp_spent}</td>
                      <td className="py-2">{new Date(p.purchased_at).toLocaleString()}</td>
                      <td className="py-2">{p.expires_at ? new Date(p.expires_at).toLocaleString() : "—"}</td>
                      <td className="py-2">
                        <Badge variant={statusOf(p) === "Active" ? "default" : "outline"}>{statusOf(p)}</Badge>
                      </td>
                      <td className="py-2 text-right">
                        {statusOf(p) === "Active" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await revokeFn({ data: { accessId: p.id } });
                              refresh();
                            }}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
