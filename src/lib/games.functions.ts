import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Learning Games. Every game reuses the existing question / flashcard content and
 * the existing Subject → Chapter → Topic system. Answers are always graded on the
 * server and each finished round is stored in public.game_attempts for the
 * signed-in member (plus the shared activity log).
 */

export const GAME_KEYS = [
  "battle",
  "memory_match",
  "millionaire",
  "escape",
  "science_lab",
  "time_machine",
  "maths_speed",
  "word_builder",
  "sixty_second",
] as const;

const gameKeySchema = z.enum(GAME_KEYS);
const difficultySchema = z.enum(["Easy", "Medium", "Hard"]);

const GAME_LABEL: Record<(typeof GAME_KEYS)[number], string> = {
  battle: "Study Battle",
  memory_match: "Memory Match",
  millionaire: "Knowledge Millionaire",
  escape: "Escape the Exam",
  science_lab: "Science Lab",
  time_machine: "SST Time Machine",
  maths_speed: "Maths Speed Run",
  word_builder: "Word Builder",
  sixty_second: "60-Second Challenge",
};

function shuffle<T>(rows: T[]): T[] {
  const list = [...rows];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j] as T, list[i] as T];
  }
  return list;
}

/** Calendar date in India, used everywhere in this app for streaks. */
function istDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function dayStreak(dates: string[]): { current: number; best: number } {
  const unique = [...new Set(dates)].sort();
  if (!unique.length) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(`${unique[i - 1]}T00:00:00Z`).getTime();
    const cur = new Date(`${unique[i]}T00:00:00Z`).getTime();
    run = cur - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const today = istDate(new Date());
  const yesterday = istDate(new Date(Date.now() - 86400000));
  const last = unique[unique.length - 1]!;
  const current = last === today || last === yesterday ? run : 0;
  return { current, best };
}

/** Enabled games + this member's real game statistics and achievements. */
export const getGamesOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: settings }, { data: attempts }, { data: roles }] = await Promise.all([
      supabase.from("game_settings").select("game_key, enabled"),
      supabase
        .from("game_attempts")
        .select("game_key, score, total, correct, wrong, seconds, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const rows = attempts ?? [];
    const enabled: Record<string, boolean> = {};
    for (const key of GAME_KEYS) enabled[key] = true;
    for (const s of settings ?? []) enabled[s.game_key] = s.enabled;

    const bestByGame: Record<string, number> = {};
    const playsByGame: Record<string, number> = {};
    let correctTotal = 0;
    let secondsTotal = 0;
    let perfect = 0;
    for (const r of rows) {
      bestByGame[r.game_key] = Math.max(bestByGame[r.game_key] ?? 0, r.score);
      playsByGame[r.game_key] = (playsByGame[r.game_key] ?? 0) + 1;
      correctTotal += r.correct;
      secondsTotal += r.seconds;
      if (r.total > 0 && r.correct === r.total) perfect += 1;
    }
    const streak = dayStreak(rows.map((r) => istDate(r.created_at)));
    const best = Object.values(bestByGame).reduce((m, v) => Math.max(m, v), 0);
    const mastered = Object.entries(bestByGame).some(([key, score]) => (playsByGame[key] ?? 0) >= 3 && score >= 10);

    const achievements = [
      { key: "first", label: "First Game", emoji: "🎮", unlocked: rows.length >= 1 },
      { key: "ten", label: "10 Games Played", emoji: "🎯", unlocked: rows.length >= 10 },
      { key: "perfect5", label: "5 Perfect Games", emoji: "💯", unlocked: perfect >= 5 },
      { key: "streak3", label: "3-Day Game Streak", emoji: "🔥", unlocked: streak.best >= 3 },
      { key: "streak7", label: "7-Day Game Streak", emoji: "⚡", unlocked: streak.best >= 7 },
      { key: "correct100", label: "100 Correct Answers", emoji: "✅", unlocked: correctTotal >= 100 },
      { key: "hour", label: "1 Hour Gaming", emoji: "⏱️", unlocked: secondsTotal >= 3600 },
      { key: "mastered", label: "Mastered a Game", emoji: "🏅", unlocked: mastered },
    ];

    return {
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      enabled,
      bestByGame,
      playsByGame,
      stats: {
        played: rows.length,
        best,
        streak: streak.current,
        bestStreak: streak.best,
        secondsTotal,
        correctTotal,
        perfect,
      },
      achievements,
      recent: rows.slice(0, 5),
    };
  });

const scopeSchema = {
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
};

/** Questions for a game round — never includes the answer key. */
export const getGameQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ...scopeSchema,
        subjectName: z.string().max(80).optional(),
        difficulty: difficultySchema.optional(),
        count: z.number().int().min(1).max(30).default(10),
        progressive: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let subjectId = data.subjectId;
    if (!subjectId && data.subjectName) {
      const { data: subject } = await supabase.from("subjects").select("id").ilike("name", `%${data.subjectName}%`).limit(1);
      subjectId = subject?.[0]?.id;
      if (!subjectId) return { questions: [], relaxedDifficulty: false };
    }

    async function load(useDifficulty: boolean) {
      let query = supabase
        .from("questions")
        .select("id, question_text, options, difficulty, marks, subject_id, chapter_id, topic_id")
        .eq("status", "published")
        .limit(300);
      if (subjectId) query = query.eq("subject_id", subjectId);
      if (data.chapterId) query = query.eq("chapter_id", data.chapterId);
      if (data.topicId) query = query.eq("topic_id", data.topicId);
      if (useDifficulty && data.difficulty) {
        query = data.difficulty === "Hard" ? query.in("difficulty", ["Hard", "Very Hard"]) : query.eq("difficulty", data.difficulty);
      }
      const { data: rows, error } = await query;
      if (error) throw new Error("Could not load questions");
      return (rows ?? [])
        .map((r) => ({ ...r, options: Array.isArray(r.options) ? (r.options as string[]) : [] }))
        .filter((q) => q.options.length >= 2);
    }

    let pool = await load(true);
    let relaxedDifficulty = false;
    if (pool.length < Math.min(4, data.count) && data.difficulty) {
      const wider = await load(false);
      if (wider.length > pool.length) {
        pool = wider;
        relaxedDifficulty = true;
      }
    }

    const order = { Easy: 0, Medium: 1, Hard: 2, "Very Hard": 3 } as Record<string, number>;
    let picked = shuffle(pool).slice(0, data.count);
    if (data.progressive) picked = picked.sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1));

    return { questions: picked, relaxedDifficulty };
  });

/** Flashcard pairs for Memory Match and Word Builder — existing content only. */
export const getGamePairs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ...scopeSchema,
        subjectName: z.string().max(80).optional(),
        count: z.number().int().min(2).max(20).default(6),
        maxFrontLength: z.number().int().min(4).max(200).default(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let subjectId = data.subjectId;
    if (!subjectId && data.subjectName) {
      const { data: subject } = await supabase.from("subjects").select("id").ilike("name", `%${data.subjectName}%`).limit(1);
      subjectId = subject?.[0]?.id;
      if (!subjectId) return { pairs: [] };
    }

    let query = supabase.from("flashcards").select("id, front, back, subject_id, chapter_id, topic_id").limit(300);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (data.chapterId) query = query.eq("chapter_id", data.chapterId);
    if (data.topicId) query = query.eq("topic_id", data.topicId);

    const { data: rows } = await query;
    const usable = (rows ?? []).filter(
      (r) => r.front?.trim() && r.back?.trim() && r.front.trim().length <= data.maxFrontLength && r.back.trim().length <= 160,
    );
    return { pairs: shuffle(usable).slice(0, data.count).map((r) => ({ id: r.id, front: r.front.trim(), back: r.back.trim() })) };
  });

/**
 * Finish a round. Question games send `answers` and are graded server-side;
 * flashcard-based games (Memory Match, Word Builder) send their own correct/total.
 */
export const submitGameRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        gameKey: gameKeySchema,
        ...scopeSchema,
        seconds: z.number().int().min(0).max(60 * 60),
        points: z.number().int().min(0).max(1_000_000).optional(),
        answers: z
          .array(
            z.object({
              questionId: z.string().uuid(),
              selectedOption: z.number().int().min(0).max(9).nullable(),
            }),
          )
          .max(30)
          .optional(),
        correct: z.number().int().min(0).max(200).optional(),
        total: z.number().int().min(0).max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let correct = 0;
    let total = 0;
    let results: {
      questionId: string;
      isCorrect: boolean;
      isSkipped: boolean;
      correctOption: number | null;
      explanation: string;
    }[] = [];

    if (data.answers?.length) {
      const ids = data.answers.map((a) => a.questionId);
      // RLS decides which questions this member may be graded on at all.
      const { data: visible } = await supabase.from("questions").select("id").in("id", ids);
      const allowed = new Set((visible ?? []).map((q) => q.id));

      const { data: keys } = await supabaseAdmin.from("questions").select("id, correct_option, explanation, marks").in("id", ids);
      const keyById = new Map((keys ?? []).map((k) => [k.id, k]));

      const attemptRows: {
        user_id: string;
        question_id: string;
        selected_option: number | null;
        is_correct: boolean;
        is_skipped: boolean;
        marks_awarded: number;
        time_spent_seconds: number;
      }[] = [];

      results = data.answers
        .filter((a) => allowed.has(a.questionId))
        .map((a) => {
          const key = keyById.get(a.questionId);
          const isSkipped = a.selectedOption === null;
          const isCorrect = !isSkipped && a.selectedOption === key?.correct_option;
          if (isCorrect) correct += 1;
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
      total = results.length;
      if (attemptRows.length) await supabaseAdmin.from("question_attempts").insert(attemptRows);
    } else {
      correct = data.correct ?? 0;
      total = data.total ?? 0;
    }

    const score = data.points ?? correct;

    const { data: prev } = await supabaseAdmin
      .from("game_attempts")
      .select("score")
      .eq("user_id", userId)
      .eq("game_key", data.gameKey)
      .order("score", { ascending: false })
      .limit(1);
    const previousBest = prev?.[0]?.score ?? 0;

    await supabaseAdmin.from("game_attempts").insert({
      user_id: userId,
      game_key: data.gameKey,
      subject_id: data.subjectId ?? null,
      chapter_id: data.chapterId ?? null,
      topic_id: data.topicId ?? null,
      score,
      total,
      correct,
      wrong: Math.max(0, total - correct),
      seconds: data.seconds,
    });

    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      event: `${GAME_LABEL[data.gameKey]} played`,
      detail: `${correct}/${total} correct · score ${score}`,
    });

    return {
      score,
      correct,
      total,
      wrong: Math.max(0, total - correct),
      seconds: data.seconds,
      previousBest,
      beatenBest: score > previousBest,
      results,
    };
  });

/** Teachers/admins turn individual games on or off for everyone. */
export const setGameEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ gameKey: gameKeySchema, enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Only teachers can change game settings");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("game_settings")
      .upsert({ game_key: data.gameKey, enabled: data.enabled, updated_at: new Date().toISOString() }, { onConflict: "game_key" });
    return { ok: true };
  });

/** Instant per-answer feedback (Science Lab, Escape the Exam). */
export const checkGameAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ questionId: z.string().uuid(), selectedOption: z.number().int().min(0).max(9).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: visible } = await context.supabase.from("questions").select("id").eq("id", data.questionId).maybeSingle();
    if (!visible) throw new Error("Question not available");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: key } = await supabaseAdmin
      .from("questions")
      .select("correct_option, explanation")
      .eq("id", data.questionId)
      .maybeSingle();

    return {
      isCorrect: data.selectedOption !== null && data.selectedOption === key?.correct_option,
      correctOption: key?.correct_option ?? null,
      explanation: key?.explanation ?? "",
    };
  });

/** Knowledge Millionaire lifelines. */
export const useGameLifeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ questionId: z.string().uuid(), kind: z.enum(["fifty", "remove", "hint"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: visible } = await context.supabase
      .from("questions")
      .select("id, options")
      .eq("id", data.questionId)
      .maybeSingle();
    if (!visible) throw new Error("Question not available");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: key } = await supabaseAdmin
      .from("questions")
      .select("correct_option, explanation")
      .eq("id", data.questionId)
      .maybeSingle();

    const options = Array.isArray(visible.options) ? (visible.options as string[]) : [];
    const correct = key?.correct_option ?? 0;
    const wrong = shuffle(options.map((_, i) => i).filter((i) => i !== correct));

    if (data.kind === "hint") {
      const text = (key?.explanation ?? "").trim();
      return { kind: "hint" as const, hint: text ? text.split(/(?<=\.)\s/)[0]!.slice(0, 180) : "No hint saved for this question.", removed: [] as number[] };
    }
    const removed = data.kind === "fifty" ? wrong.slice(0, Math.max(0, options.length - 2)) : wrong.slice(0, 1);
    return { kind: data.kind, hint: "", removed };
  });
