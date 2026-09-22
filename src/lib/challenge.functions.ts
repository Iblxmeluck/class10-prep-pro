import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Fast game-style study modes (60-Second Challenge, Study Battle, Memory Mode,
 * Exam Emergency). Questions are always served without the answer key and every
 * answer is graded on the server, exactly like practice and quizzes.
 */

const modeSchema = z.enum(["challenge", "battle", "memory", "emergency"]);

function shuffle<T>(rows: T[]): T[] {
  const list = [...rows];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j] as T, list[i] as T];
  }
  return list;
}

export const getChallengeSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        subjectId: z.string().uuid().optional(),
        chapterId: z.string().uuid().optional(),
        count: z.number().int().min(1).max(30).default(12),
        weakFirst: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let query = supabase
      .from("questions")
      .select("id, question_text, options, difficulty, marks, subject_id, chapter_id")
      .eq("status", "published")
      .limit(200);
    if (data.subjectId) query = query.eq("subject_id", data.subjectId);
    if (data.chapterId) query = query.eq("chapter_id", data.chapterId);

    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load questions");

    let pool = (rows ?? []).map((r) => ({
      ...r,
      options: Array.isArray(r.options) ? (r.options as string[]) : [],
    }));
    pool = pool.filter((q) => q.options.length >= 2);

    if (data.weakFirst && pool.length) {
      // Prefer chapters the member has actually got wrong before.
      const { data: attempts } = await supabase
        .from("question_attempts")
        .select("is_correct, is_skipped, questions(chapter_id)")
        .eq("user_id", userId)
        .limit(1000);
      const wrong = new Map<string, number>();
      for (const a of attempts ?? []) {
        const chapterId = (a.questions as unknown as { chapter_id?: string } | null)?.chapter_id;
        if (!chapterId || a.is_skipped || a.is_correct) continue;
        wrong.set(chapterId, (wrong.get(chapterId) ?? 0) + 1);
      }
      pool = shuffle(pool).sort((a, b) => (wrong.get(b.chapter_id) ?? 0) - (wrong.get(a.chapter_id) ?? 0));
    } else {
      pool = shuffle(pool);
    }

    return pool.slice(0, data.count);
  });

export const submitChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mode: modeSchema,
        seconds: z.number().int().min(0).max(60 * 60),
        answers: z
          .array(
            z.object({
              questionId: z.string().uuid(),
              selectedOption: z.number().int().min(0).max(9).nullable(),
            }),
          )
          .max(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ids = data.answers.map((a) => a.questionId);

    // RLS decides which questions this member may be graded on at all.
    const { data: visible } = await supabase.from("questions").select("id").in("id", ids.length ? ids : [crypto.randomUUID()]);
    const allowed = new Set((visible ?? []).map((q) => q.id));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: keys } = await supabaseAdmin
      .from("questions")
      .select("id, correct_option, explanation, marks")
      .in("id", ids.length ? ids : [crypto.randomUUID()]);
    const keyById = new Map((keys ?? []).map((k) => [k.id, k]));

    let score = 0;
    const attemptRows: {
      user_id: string;
      question_id: string;
      selected_option: number | null;
      is_correct: boolean;
      is_skipped: boolean;
      marks_awarded: number;
      time_spent_seconds: number;
    }[] = [];
    const results = data.answers
      .filter((a) => allowed.has(a.questionId))
      .map((a) => {
        const key = keyById.get(a.questionId);
        const isSkipped = a.selectedOption === null;
        const isCorrect = !isSkipped && a.selectedOption === key?.correct_option;
        if (isCorrect) score += 1;
        attemptRows.push({
          user_id: userId,
          question_id: a.questionId,
          selected_option: a.selectedOption,
          is_correct: isCorrect,
          is_skipped: isSkipped,
          marks_awarded: isCorrect ? (key?.marks ?? 0) : 0,
          time_spent_seconds: 0,
        });
        return {
          questionId: a.questionId,
          isCorrect,
          isSkipped,
          correctOption: key?.correct_option ?? null,
          explanation: key?.explanation ?? "",
        };
      });

    if (attemptRows.length) await supabaseAdmin.from("question_attempts").insert(attemptRows);

    const { data: prev } = await supabaseAdmin
      .from("challenge_sessions")
      .select("score")
      .eq("user_id", userId)
      .eq("mode", data.mode)
      .order("score", { ascending: false })
      .limit(1);
    const previousBest = prev?.[0]?.score ?? 0;

    await supabaseAdmin.from("challenge_sessions").insert({
      user_id: userId,
      mode: data.mode,
      score,
      total: results.length,
      seconds: data.seconds,
    });

    const label =
      data.mode === "challenge"
        ? "60-Second Challenge"
        : data.mode === "battle"
          ? "Study Battle"
          : data.mode === "memory"
            ? "Memory Mode"
            : "Exam Emergency";
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      event: `${label} completed`,
      detail: `${score}/${results.length} correct`,
    });

    return { score, total: results.length, previousBest, beatenBest: score > previousBest, results };
  });

export const getChallengeStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: modeSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("challenge_sessions")
      .select("score, total, seconds, created_at")
      .eq("user_id", context.userId)
      .eq("mode", data.mode)
      .order("created_at", { ascending: false })
      .limit(25);
    const list = rows ?? [];
    return {
      plays: list.length,
      best: list.reduce((m, r) => Math.max(m, r.score), 0),
      last: list[0] ?? null,
      recent: list.slice(0, 5),
    };
  });

/** Weakest chapters for the signed-in member, used by Exam Emergency. */
export const getEmergencyFocus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: attempts } = await supabase
      .from("question_attempts")
      .select("is_correct, is_skipped, questions(chapter_id, subject_id)")
      .eq("user_id", userId)
      .limit(2000);

    const stats = new Map<string, { total: number; wrong: number; subjectId: string }>();
    for (const a of attempts ?? []) {
      const q = a.questions as unknown as { chapter_id?: string; subject_id?: string } | null;
      if (!q?.chapter_id || a.is_skipped) continue;
      const row = stats.get(q.chapter_id) ?? { total: 0, wrong: 0, subjectId: q.subject_id ?? "" };
      row.total += 1;
      if (!a.is_correct) row.wrong += 1;
      stats.set(q.chapter_id, row);
    }

    const ids = [...stats.keys()];
    const [{ data: chapters }, { data: subjects }] = await Promise.all([
      ids.length
        ? supabase.from("chapters").select("id, name, subject_id").in("id", ids)
        : Promise.resolve({ data: [] as { id: string; name: string; subject_id: string }[] }),
      supabase.from("subjects").select("id, name").order("sort_order"),
    ]);

    const focus = (chapters ?? [])
      .map((c) => {
        const row = stats.get(c.id)!;
        return {
          chapterId: c.id,
          subjectId: c.subject_id,
          chapter: c.name,
          subject: (subjects ?? []).find((s) => s.id === c.subject_id)?.name ?? "",
          accuracy: Math.round(((row.total - row.wrong) / row.total) * 100),
          wrong: row.wrong,
          total: row.total,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    return { focus, subjects: subjects ?? [] };
  });
