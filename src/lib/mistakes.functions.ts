import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The signed-in student's saved mistakes, with question text (answers stay on the server). */
export const getMistakes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ includeFixed: z.boolean().default(false) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("mistake_notebook")
      .select("question_id, source, wrong_count, last_wrong_at, resolved_at")
      .eq("user_id", userId)
      .order("last_wrong_at", { ascending: false })
      .limit(300);
    if (!data.includeFixed) q = q.is("resolved_at", null);
    const { data: rows } = await q;
    const ids = (rows ?? []).map((r) => r.question_id);
    if (!ids.length) return [];
    const { data: qs } = await supabase
      .from("questions")
      .select("id, question_text, options, difficulty, qtype, subject_id, chapter_id, subjects(name), chapters(name)")
      .in("id", ids);
    const byId = new Map((qs ?? []).map((x) => [x.id, x]));
    return (rows ?? [])
      .filter((r) => byId.has(r.question_id))
      .map((r) => {
        const x = byId.get(r.question_id)!;
        return {
          ...r,
          question_text: x.question_text,
          options: Array.isArray(x.options) ? (x.options as string[]) : [],
          difficulty: x.difficulty,
          subjectId: x.subject_id,
          subject: (x.subjects as { name: string } | null)?.name ?? "",
          chapter: (x.chapters as { name: string } | null)?.name ?? "",
        };
      });
  });

export const removeMistake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ questionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("mistake_notebook").delete().eq("user_id", context.userId).eq("question_id", data.questionId);
    return { ok: true };
  });

export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ metric: z.enum(["exp", "correct", "attempted", "accuracy", "study", "quizzes"]).default("exp") })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rpc = data.metric === "exp"
      ? supabase.rpc("weekly_leaderboard" as never)
      : supabase.rpc("weekly_leaderboard_metric" as never, { _metric: data.metric } as never);
    const [{ data: rows }, { data: prefs }] = await Promise.all([
      rpc,
      supabase.from("leaderboard_prefs").select("opt_out, nickname").eq("user_id", userId).maybeSingle(),
    ]);
    const list = ((rows ?? []) as unknown as { rank: number; name: string; exp?: number; value?: number; is_me: boolean }[])
      .map((r) => ({ rank: r.rank, name: r.name, is_me: r.is_me, value: Number(r.value ?? r.exp ?? 0) }));
    return {
      rows: list,
      prefs: { optOut: prefs?.opt_out ?? false, nickname: prefs?.nickname ?? "" },
    };
  });

export const saveLeaderboardPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ nickname: z.string().trim().max(24) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("leaderboard_prefs").upsert(
      { user_id: context.userId, nickname: data.nickname, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Could not save");
    return { ok: true };
  });
