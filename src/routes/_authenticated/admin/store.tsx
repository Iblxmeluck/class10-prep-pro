import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Power, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adjustMemberExp,
  adminExpOverview,
  deleteStoreItem,
  saveStoreItem,
  setExpRule,
  setStoreItemActive,
} from "@/lib/exp.functions";
import { MemberPagesAdmin } from "@/components/app/MemberPagesAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/store")({
  head: () => ({
    meta: [
      { title: "EXP & Store — CBSE 10 Prep" },
      { name: "description", content: "Create EXP store items, set EXP rewards and manage special member pages." },
      { property: "og:title", content: "EXP & Store — CBSE 10 Prep" },
      { property: "og:description", content: "Set EXP prices, rewards and unlockable pages for your students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreAdminPage,
});

type ItemType = "note" | "pdf" | "video" | "flashcards" | "course" | "page";

function StoreAdminPage() {
  const qc = useQueryClient();
  const load = useServerFn(adminExpOverview);
  const saveFn = useServerFn(saveStoreItem);
  const activeFn = useServerFn(setStoreItemActive);
  const delFn = useServerFn(deleteStoreItem);
  const ruleFn = useServerFn(setExpRule);
  const adjustFn = useServerFn(adjustMemberExp);

  const { data } = useQuery({ queryKey: ["admin-exp"], queryFn: () => load({ data: {} as never }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-exp"] });

  const links = useQuery({
    queryKey: ["all-links"],
    queryFn: async () => (await supabase.from("links").select("id, title, kind").order("title")).data ?? [],
  });
  const resources = useQuery({
    queryKey: ["all-resources"],
    queryFn: async () => (await supabase.from("resources").select("id, name, kind").order("name")).data ?? [],
  });
  const sets = useQuery({
    queryKey: ["all-sets"],
    queryFn: async () => (await supabase.from("flashcard_sets").select("id, title").order("title")).data ?? [],
  });
  const courses = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, name").order("name")).data ?? [],
  });

  const [type, setType] = useState<ItemType>("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("100");
  const [refId, setRefId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [pageName, setPageName] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageBody, setPageBody] = useState("");
  const [pageVis, setPageVis] = useState<"all" | "selected">("selected");
  const [pageMembers, setPageMembers] = useState<string[]>([]);
  const [adjustUser, setAdjustUser] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("50");

  const save = useMutation({
    mutationFn: async () => {
      const exp = Number(price) || 0;
      await saveFn({
        data: {
          title: title.trim(),
          description: description.trim(),
          itemType: type,
          expPrice: exp,
          isActive: true,
          linkId: type === "note" || type === "video" ? refId || null : null,
          resourceId: type === "pdf" ? refId || null : null,
          flashcardSetId: type === "flashcards" ? refId || null : null,
          courseId: type === "course" ? refId || null : null,
          externalUrl: externalUrl.trim() || null,
          ...(type === "page"
            ? {
                page: {
                  name: pageName.trim(),
                  slug: pageSlug.trim().toLowerCase(),
                  description: description.trim(),
                  icon: "Sparkles",
                  body: pageBody,
                  visibility: pageVis,
                  memberIds: pageMembers,
                },
              }
            : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Store item saved");
      setTitle("");
      setDescription("");
      setRefId("");
      setExternalUrl("");
      setPageName("");
      setPageSlug("");
      setPageBody("");
      setPageMembers([]);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save this item"),
  });

  const toggleActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => activeFn({ data: v }),
    onSuccess: refresh,
  });
  const removeItem = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: refresh,
  });
  const saveRule = useMutation({
    mutationFn: (v: { key: string; exp: number; enabled: boolean }) => ruleFn({ data: v }),
    onSuccess: () => {
      toast.success("Reward updated");
      refresh();
    },
  });
  const adjust = useMutation({
    mutationFn: () => adjustFn({ data: { userId: adjustUser, delta: Number(adjustAmount) || 0 } }),
    onSuccess: () => {
      toast.success("EXP updated");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update EXP"),
  });

  const members = data?.members ?? [];
  const balances = data?.balances ?? [];
  const refOptions =
    type === "note"
      ? (links.data ?? []).filter((l) => l.kind === "note").map((l) => ({ id: l.id, label: l.title }))
      : type === "video"
        ? (links.data ?? []).filter((l) => l.kind === "video").map((l) => ({ id: l.id, label: l.title }))
        : type === "pdf"
          ? (resources.data ?? []).map((r) => ({ id: r.id, label: r.name }))
          : type === "flashcards"
            ? (sets.data ?? []).map((s) => ({ id: s.id, label: s.title }))
            : type === "course"
              ? (courses.data ?? []).map((c) => ({ id: c.id, label: c.name }))
              : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">EXP &amp; Store</h1>
        <p className="text-sm text-muted-foreground">
          Set EXP rewards, add things students can unlock with EXP, and control special pages.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a store item</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Item type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ItemType);
                setRefId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="pdf">PDF / Document</SelectItem>
                <SelectItem value="video">YouTube lecture</SelectItem>
                <SelectItem value="flashcards">Flashcards</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="page">New page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>EXP price</Label>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Store title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chemistry Notes" />
          </div>
          <div className="space-y-1.5">
            <Label>Short description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full chapter notes" />
          </div>

          {type !== "page" && (
            <>
              <div className="space-y-1.5">
                <Label>Existing resource</Label>
                <Select value={refId} onValueChange={setRefId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick one (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {refOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Or a direct link</Label>
                <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
              </div>
            </>
          )}

          {type === "page" && (
            <>
              <div className="space-y-1.5">
                <Label>Page name</Label>
                <Input value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="Advanced Revision Hub" />
              </div>
              <div className="space-y-1.5">
                <Label>Page address</Label>
                <Input
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                  placeholder="advanced-revision-hub"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Page content</Label>
                <Textarea rows={5} value={pageBody} onChange={(e) => setPageBody(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Who can see it</Label>
                <Select value={pageVis} onValueChange={(v) => setPageVis(v as "all" | "selected")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All members</SelectItem>
                    <SelectItem value="selected">Selected members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pageVis === "selected" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Members with access</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => {
                      const on = pageMembers.includes(m.id);
                      return (
                        <Button
                          key={m.id}
                          type="button"
                          size="sm"
                          variant={on ? "default" : "outline"}
                          onClick={() =>
                            setPageMembers((prev) => (on ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                          }
                        >
                          {m.display_name || m.username}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="sm:col-span-2">
            <Button
              disabled={!title.trim() || (type === "page" && (!pageName.trim() || !pageSlug.trim())) || save.isPending}
              onClick={() => save.mutate()}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add to store
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            (data?.items ?? []).map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.item_type} · {i.exp_price} EXP {i.is_active ? "" : "· hidden"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive.mutate({ id: i.id, isActive: !i.is_active })}
                  >
                    <Power className="mr-1.5 h-4 w-4" /> {i.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Delete item" onClick={() => removeItem.mutate(i.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">EXP rewards</CardTitle>
          <p className="text-sm text-muted-foreground">How much EXP students earn for each achievement.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.rules ?? []).map((r) => (
            <RuleRow key={r.key} rule={r} onSave={(exp, enabled) => saveRule.mutate({ key: r.key, exp, enabled })} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member EXP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={adjustUser} onValueChange={setAdjustUser}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name || m.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>EXP change</Label>
              <Input className="w-28" type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
            </div>
            <Button disabled={!adjustUser || adjust.isPending} onClick={() => adjust.mutate()}>
              Apply
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const b = balances.find((x) => x.user_id === m.id);
              return (
                <Badge key={m.id} variant="outline">
                  {m.display_name || m.username}: {b?.balance ?? 0} EXP
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <MemberPagesAdmin />
    </div>
  );
}

function RuleRow({
  rule,
  onSave,
}: {
  rule: { key: string; label: string; exp: number; enabled: boolean };
  onSave: (exp: number, enabled: boolean) => void;
}) {
  const [exp, setExp] = useState(String(rule.exp));
  const [enabled, setEnabled] = useState(rule.enabled);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
      <span className="min-w-0 flex-1 text-sm">{rule.label}</span>
      <Input
        type="number"
        min={0}
        className="w-24"
        value={exp}
        onChange={(e) => setExp(e.target.value)}
        aria-label={`EXP for ${rule.label}`}
      />
      <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={`Enable ${rule.label}`} />
      <Button size="sm" variant="outline" onClick={() => onSave(Number(exp) || 0, enabled)}>
        Save
      </Button>
    </div>
  );
}
