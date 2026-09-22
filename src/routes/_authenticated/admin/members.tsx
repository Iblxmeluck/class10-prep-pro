import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createMember,
  deleteMember,
  listMembers,
  resetMemberPassword,
  saveMemberPermissions,
  setMemberActive,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const QTYPES = [
  "MCQ",
  "Assertion & Reason",
  "Case Study",
  "Competency Based",
  "Numerical",
  "Image Based",
  "Diagram Based",
  "Source Based",
  "Map Based",
  "Extract Based",
  "Grammar",
] as const;

export const Route = createFileRoute("/_authenticated/admin/members")({
  head: () => ({
    meta: [
      { title: "Member Accounts — CBSE 10 Prep" },
      { name: "description", content: "Create student accounts and assign subject, chapter and file permissions." },
      { property: "og:title", content: "Member Accounts — CBSE 10 Prep" },
      { property: "og:description", content: "Manage student logins and granular access rights." },
    ],
  }),
  component: MembersAdmin,
});

function MembersAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(listMembers);
  const create = useServerFn(createMember);
  const remove = useServerFn(deleteMember);
  const resetPw = useServerFn(resetMemberPassword);
  const savePerms = useServerFn(saveMemberPermissions);
  const toggleActive = useServerFn(setMemberActive);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const members = useQuery({ queryKey: ["members"], queryFn: () => load({}) });

  const subjects = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const chapters = useQuery({
    queryKey: ["admin-chapters-flat"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("id, name, subject_id").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["members"] });

  const createM = useMutation({
    mutationFn: () => create({ data: { username, password, displayName } }),
    onSuccess: () => {
      toast.success("Member account created");
      setUsername("");
      setPassword("");
      setDisplayName("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" /> New member account
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-user">Username</Label>
            <Input id="m-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="student01" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-name">Full name</Label>
            <Input id="m-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Riya Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-pass">Password</Label>
            <Input id="m-pass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 8 characters" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" disabled={createM.isPending} onClick={() => createM.mutate()}>
              Create account
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {members.isLoading && <p className="text-sm text-muted-foreground">Loading members…</p>}
        {(members.data ?? []).map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            subjects={subjects.data ?? []}
            chapters={chapters.data ?? []}
            open={openId === m.id}
            onToggle={() => setOpenId(openId === m.id ? null : m.id)}
            onChanged={refresh}
            actions={{ remove, resetPw, savePerms, toggleActive }}
          />
        ))}
      </div>
    </div>
  );
}

export type Member = Awaited<ReturnType<typeof listMembers>>[number];

export function MemberRow({
  member,
  subjects,
  chapters,
  open,
  onToggle,
  onChanged,
  actions,
}: {
  member: Member;
  subjects: { id: string; name: string }[];
  chapters: { id: string; name: string; subject_id: string }[];
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  actions: {
    remove: (a: { data: { userId: string } }) => Promise<unknown>;
    resetPw: (a: { data: { userId: string; password: string } }) => Promise<unknown>;
    savePerms: (a: { data: Record<string, unknown> }) => Promise<unknown>;
    toggleActive: (a: { data: { userId: string; isActive: boolean } }) => Promise<unknown>;
  };
}) {
  const [subjectIds, setSubjectIds] = useState<string[]>(member.subjectIds);
  const [chapterIds, setChapterIds] = useState<string[]>(member.chapterIds);
  const [qtypes, setQtypes] = useState<string[]>(member.qtypes);
  const [files, setFiles] = useState({
    canViewPdf: member.canViewPdf,
    canDownloadPdf: member.canDownloadPdf,
    canViewImage: member.canViewImage,
    canDownloadImage: member.canDownloadImage,
  });
  const [newPassword, setNewPassword] = useState("");
  
  const [busy, setBusy] = useState(false);


  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{member.displayName}</CardTitle>
          <p className="text-xs text-muted-foreground">@{member.username}</p>
          {!member.isAdmin && (
            <p className="mt-1 text-xs text-muted-foreground">
              Passwords are never stored in readable form — set a new one below if a student is locked out.
            </p>
          )}
        </div>

        {member.isAdmin && <Badge>Admin</Badge>}
        {!member.isActive && <Badge variant="destructive">Disabled</Badge>}
        <div className="ml-auto flex items-center gap-2">
          {!member.isAdmin && (
            <>
              <Switch
                checked={member.isActive}
                disabled={busy}
                onCheckedChange={(v) =>
                  run(() => actions.toggleActive({ data: { userId: member.id, isActive: v } }), "Account updated")
                }
                aria-label="Account active"
              />
              <Button variant="outline" size="sm" onClick={onToggle}>
                {open ? "Close" : "Permissions"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label="Delete member"
                onClick={() => {
                  if (confirm(`Delete ${member.username}? This cannot be undone.`))
                    void run(() => actions.remove({ data: { userId: member.id } }), "Member deleted");
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Subjects</h3>
            <div className="flex flex-wrap gap-3">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={subjectIds.includes(s.id)}
                    onCheckedChange={() => setSubjectIds((p) => toggle(p, s.id))}
                  />
                  {s.name}
                </label>
              ))}
              {subjects.length === 0 && <p className="text-sm text-muted-foreground">Add subjects first.</p>}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Chapters</h3>
            {subjects
              .filter((s) => subjectIds.includes(s.id))
              .map((s) => (
                <div key={s.id} className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{s.name}</p>
                  <div className="flex flex-wrap gap-3">
                    {chapters
                      .filter((c) => c.subject_id === s.id)
                      .map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={chapterIds.includes(c.id)}
                            onCheckedChange={() => setChapterIds((p) => toggle(p, c.id))}
                          />
                          {c.name}
                        </label>
                      ))}
                  </div>
                </div>
              ))}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Question types</h3>
            <div className="flex flex-wrap gap-3">
              {QTYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={qtypes.includes(t)} onCheckedChange={() => setQtypes((p) => toggle(p, t))} />
                  {t}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Files</h3>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["canViewPdf", "View PDFs"],
                  ["canDownloadPdf", "Download PDFs"],
                  ["canViewImage", "View images"],
                  ["canDownloadImage", "Download images"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={files[key]}
                    onCheckedChange={(v) => setFiles((p) => ({ ...p, [key]: Boolean(v) }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-end gap-3">
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    actions.savePerms({
                      data: { userId: member.id, subjectIds, chapterIds, qtypes, ...files },
                    }),
                  "Permissions saved",
                )
              }
            >
              Save permissions
            </Button>
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor={`pw-${member.id}`}>New password</Label>
                <Input
                  id={`pw-${member.id}`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="min 8 characters"
                />
              </div>
              <Button
                variant="outline"
                disabled={busy || newPassword.length < 8}
                onClick={() =>
                  run(async () => {
                    await actions.resetPw({ data: { userId: member.id, password: newPassword } });
                    setNewPassword("");
                  }, "Password reset")
                }
              >
                <KeyRound className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
