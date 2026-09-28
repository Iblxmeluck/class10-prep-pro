import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, numbers, dot, dash and underscore");
const passwordSchema = z.string().min(8).max(72);

export const emailFor = (username: string) => `${username.toLowerCase()}@members.cbse10.local`;

export const ALL_QTYPES = [
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

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

/** Open first-admin setup is disabled: administrators are created by existing admins only. */
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: boolean }> => {
  throw new Error("Setup is disabled");
});

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        username: usernameSchema,
        password: passwordSchema,
        displayName: z.string().trim().max(80).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailFor(data.username),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create member");
    const uid = created.user.id;
    await supabaseAdmin.from("profiles").insert({
      id: uid,
      username: data.username.toLowerCase(),
      display_name: data.displayName || data.username,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "member" });
    await supabaseAdmin.from("member_settings").insert({
      user_id: uid,
      can_view_pdf: true,
      can_download_pdf: true,
      can_view_image: true,
      can_download_image: true,
    });
    

    // Grant full access by default: every subject, every chapter, every question type.
    const [{ data: allSubjects }, { data: allChapters }] = await Promise.all([
      supabaseAdmin.from("subjects").select("id"),
      supabaseAdmin.from("chapters").select("id"),
    ]);
    if (allSubjects?.length)
      await supabaseAdmin
        .from("member_subject_access")
        .insert(allSubjects.map((s) => ({ user_id: uid, subject_id: s.id })));
    if (allChapters?.length)
      await supabaseAdmin
        .from("member_chapter_access")
        .insert(allChapters.map((c) => ({ user_id: uid, chapter_id: c.id })));
    await supabaseAdmin
      .from("member_qtype_access")
      .insert(ALL_QTYPES.map((qtype) => ({ user_id: uid, qtype: qtype as never })));

    return { id: uid };
  });


export const resetMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), password: passwordSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const changeMemberUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), username: usernameSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const username = data.username.toLowerCase();
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: emailFor(username),
    });
    if (authErr) throw new Error(authErr.message);
    const { error } = await supabaseAdmin.from("profiles").update({ username }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const permissionsSchema = z.object({
  userId: z.string().uuid(),
  subjectIds: z.array(z.string().uuid()).max(50),
  chapterIds: z.array(z.string().uuid()).max(500),
  qtypes: z.array(z.string().max(40)).max(30),
  canViewPdf: z.boolean(),
  canDownloadPdf: z.boolean(),
  canViewImage: z.boolean(),
  canDownloadImage: z.boolean(),
});

export const saveMemberPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => permissionsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("member_subject_access").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("member_chapter_access").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("member_qtype_access").delete().eq("user_id", data.userId);

    if (data.subjectIds.length)
      await supabaseAdmin
        .from("member_subject_access")
        .insert(data.subjectIds.map((subject_id) => ({ user_id: data.userId, subject_id })));
    if (data.chapterIds.length)
      await supabaseAdmin
        .from("member_chapter_access")
        .insert(data.chapterIds.map((chapter_id) => ({ user_id: data.userId, chapter_id })));
    if (data.qtypes.length)
      await supabaseAdmin
        .from("member_qtype_access")
        .insert(data.qtypes.map((qtype) => ({ user_id: data.userId, qtype: qtype as never })));

    await supabaseAdmin.from("member_settings").upsert({
      user_id: data.userId,
      can_view_pdf: data.canViewPdf,
      can_download_pdf: data.canDownloadPdf,
      can_view_image: data.canViewImage,
      can_download_image: data.canDownloadImage,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });

export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.isActive, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Full member directory with their current permissions (admins only). */
export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: profiles },
      { data: roles },
      { data: settings },
      { data: subj },
      { data: chap },
      { data: qt },
      { data: exps },
      { data: lbp },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, username, display_name, is_active, created_at").order("created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("member_settings").select("*"),
      supabaseAdmin.from("member_subject_access").select("user_id, subject_id"),
      supabaseAdmin.from("member_chapter_access").select("user_id, chapter_id"),
      supabaseAdmin.from("member_qtype_access").select("user_id, qtype"),
      supabaseAdmin.from("member_exp").select("user_id, balance"),
      supabaseAdmin.from("leaderboard_prefs").select("user_id, opt_out"),
    ]);

    return (profiles ?? []).map((p) => {
      const s = (settings ?? []).find((x) => x.user_id === p.id);
      return {
        id: p.id,
        username: p.username,
        displayName: p.display_name,
        isActive: p.is_active,
        createdAt: p.created_at,
        isAdmin: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
        subjectIds: (subj ?? []).filter((x) => x.user_id === p.id).map((x) => x.subject_id),
        chapterIds: (chap ?? []).filter((x) => x.user_id === p.id).map((x) => x.chapter_id),
        qtypes: (qt ?? []).filter((x) => x.user_id === p.id).map((x) => x.qtype as string),
        canViewPdf: s?.can_view_pdf ?? true,
        canDownloadPdf: s?.can_download_pdf ?? false,
        canViewImage: s?.can_view_image ?? true,
        canDownloadImage: s?.can_download_image ?? false,
        expBalance: (exps ?? []).find((x) => x.user_id === p.id)?.balance ?? 0,
        leaderboardHidden: (lbp ?? []).find((x) => x.user_id === p.id)?.opt_out ?? false,
      };
    });

  });

/** Full question rows (including the answer key) for the admin question bank. */
export const listAdminQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.string().max(20).optional(),
        subjectId: z.string().uuid().optional(),
        chapterId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("questions")
      .select(
        "id, question_text, qtype, difficulty, status, marks, ai_generated, options, correct_option, explanation, chapters(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status && data.status !== "all") q = q.eq("status", data.status as "draft");
    if (data.subjectId) q = q.eq("subject_id", data.subjectId);
    if (data.chapterId) q = q.eq("chapter_id", data.chapterId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Admin removes EXP from a member's balance (never below zero). */
export const reduceMemberExp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), amount: z.number().int().min(1).max(1_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("member_exp")
      .select("balance, lifetime")
      .eq("user_id", data.userId)
      .maybeSingle();
    const current = row?.balance ?? 0;
    const cut = Math.min(current, data.amount);
    if (!cut) return { balance: current, removed: 0 };
    const { error } = await supabaseAdmin
      .from("member_exp")
      .update({ balance: current - cut, updated_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("exp_ledger").insert({ user_id: data.userId, delta: -cut, reason: "admin_adjust", ref: context.userId });
    return { balance: current - cut, removed: cut };
  });

/** Admin hides or shows a member on the leaderboard. */
export const setLeaderboardHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), hidden: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("leaderboard_prefs")
      .upsert({ user_id: data.userId, opt_out: data.hidden, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
