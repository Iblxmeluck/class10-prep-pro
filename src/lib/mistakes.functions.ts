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
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: rows }, { data: prefs }] = await Promise.all([
      supabase.rpc("weekly_leaderboard" as never),
      supabase.from("leaderboard_prefs").select("opt_out, nickname").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      rows: (rows ?? []) as unknown as { rank: number; name: string; exp: number; is_me: boolean }[],
      prefs: { optOut: prefs?.opt_out ?? false, nickname: prefs?.nickname ?? "" },
    };
  });

export const saveLeaderboardPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ optOut: z.boolean(), nickname: z.string().trim().max(24) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("leaderboard_prefs").upsert(
      { user_id: context.userId, opt_out: data.optOut, nickname: data.nickname, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Could not save");
    return { ok: true };
  });
