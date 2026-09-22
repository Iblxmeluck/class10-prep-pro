import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Quiz and practice questions are always served WITHOUT the answer key, and every
 * attempt is graded on the server, so a browser can neither read the answers early
 * nor submit a score of its own choosing.
 */

type QuestionForAttempt = {
  id: string;
  question_text: string;
  options: string[];
  marks: number;
  qtype: string;
  difficulty: string;
  chapter_id: string;
};

export const getQuizForAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS decides whether this member may open the quiz at all.
    const { data: quiz, error } = await context.supabase
      .from("quizzes")
      .select("id, title, quiz_number, duration_minutes")
      .eq("id", data.quizId)
      .maybeSingle();
    if (error || !quiz) throw new Error("This quiz is not available for your account");

    const { data: rows, error: qErr } = await context.supabase
      .from("quiz_questions")
      .select("position, questions(id, question_text, options, marks, qtype, difficulty, chapter_id)")
      .eq("quiz_id", data.quizId)
      .order("position");
    if (qErr) throw new Error("Could not load this quiz");

    const questions: QuestionForAttempt[] = (rows ?? [])
      .map((r) => r.questions)
      .filter(Boolean)
      .map((q) => {
        const row = q as unknown as QuestionForAttempt & { options: unknown };
        return { ...row, options: Array.isArray(row.options) ? (row.options as string[]) : [] };
      });

    return { quiz, questions };
  });

export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        quizId: z.string().uuid(),
        answers: z.record(z.string().uuid(), z.number().int().min(0).max(9)),
        timeTakenSeconds: z.number().int().min(0).max(60 * 60 * 12),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: quiz, error } = await supabase
      .from("quizzes")
      .select("id, duration_minutes")
      .eq("id", data.quizId)
      .maybeSingle();
    if (error || !quiz) throw new Error("This quiz is not available for your account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("quiz_questions")
      .select("position, questions(id, correct_option, marks)")
      .eq("quiz_id", data.quizId)
      .order("position");

    const list = ((rows ?? []).map((r) => r.questions).filter(Boolean) ?? []) as unknown as {
      id: string;
      correct_option: number | null;
      marks: number;
    }[];

    let score = 0;
    let total = 0;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    const perQuestion = list.map((q) => {
      total += q.marks;
      const picked = data.answers[q.id];
      const isSkipped = picked === undefined;
      const isCorrect = !isSkipped && picked === q.correct_option;
      if (isSkipped) skipped++;
      else if (isCorrect) {
        correct++;
        score += q.marks;
      } else incorrect++;
      return {
        user_id: userId,
        question_id: q.id,
        selected_option: picked ?? null,
        is_correct: isCorrect,
        is_skipped: isSkipped,
        marks_awarded: isCorrect ? q.marks : 0,
        time_spent_seconds: 0,
      };
    });

    const { data: prev } = await supabaseAdmin
      .from("quiz_attempts")
      .select("attempt_number")
      .eq("quiz_id", data.quizId)
      .eq("user_id", userId)
      .order("attempt_number", { ascending: false })
      .limit(1);
    const attemptNumber = (prev?.[0]?.attempt_number ?? 0) + 1;

    const { data: attempt, error: insErr } = await supabaseAdmin
      .from("quiz_attempts")
      .insert({
        quiz_id: data.quizId,
        user_id: userId,
        attempt_number: attemptNumber,
        score,
        total_marks: total,
        correct_count: correct,
        incorrect_count: incorrect,
        skipped_count: skipped,
        time_taken_seconds: Math.min(data.timeTakenSeconds, quiz.duration_minutes * 60),
      })
      .select("id")
      .single();
    if (insErr || !attempt) throw new Error("Could not save your attempt");

    if (perQuestion.length)
      await supabaseAdmin
        .from("question_attempts")
        .insert(perQuestion.map((p) => ({ ...p, quiz_attempt_id: attempt.id })));

    try {
      const { awardRuleExp } = await import("@/lib/exp.functions");
      await awardRuleExp(userId, "quiz_complete", attempt.id);
      if (incorrect === 0 && skipped === 0 && correct > 0) await awardRuleExp(userId, "quiz_perfect", attempt.id);
    } catch {
      /* EXP is a bonus; never fail the attempt */
    }

    return { attemptId: attempt.id, score, total, correct, incorrect, skipped };
  });

export const getPracticeQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        subjectId: z.string().uuid(),
        chapterId: z.string().uuid().optional(),
        topicId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("questions")
      .select("id, question_text, options, difficulty, qtype, marks, chapter_id")
      .eq("subject_id", data.subjectId)
      .eq("status", "published")
      .limit(50);
    if (data.chapterId) q = q.eq("chapter_id", data.chapterId);
    if (data.topicId) q = q.eq("topic_id", data.topicId);
    const { data: rows, error } = await q;
    if (error) throw new Error("Could not load questions");
    return (rows ?? []).map((r) => ({
      ...r,
      options: Array.isArray(r.options) ? (r.options as string[]) : [],
    }));
  });

export const answerPracticeQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        questionId: z.string().uuid(),
        selectedOption: z.number().int().min(0).max(9),
        timeSpentSeconds: z.number().int().min(0).max(60 * 60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // RLS: the member may only see questions they are entitled to.
    const { data: visible, error } = await supabase
      .from("questions")
      .select("id, marks")
      .eq("id", data.questionId)
      .maybeSingle();
    if (error || !visible) throw new Error("This question is not available for your account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: full } = await supabaseAdmin
      .from("questions")
      .select("correct_option, explanation, marks")
      .eq("id", data.questionId)
      .single();

    const isCorrect = !!full && data.selectedOption === full.correct_option;
    await supabaseAdmin.from("question_attempts").insert({
      user_id: userId,
      question_id: data.questionId,
      selected_option: data.selectedOption,
      is_correct: isCorrect,
      is_skipped: false,
      marks_awarded: isCorrect ? (full?.marks ?? 0) : 0,
      time_spent_seconds: data.timeSpentSeconds,
    });

    return {
      isCorrect,
      correctOption: full?.correct_option ?? null,
      explanation: full?.explanation ?? "",
    };
  });


/** Full answer review for one of the signed-in member's own quiz attempts. */
export const getAttemptReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, attempt_number, score, total_marks, submitted_at, user_id")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (error || !attempt || attempt.user_id !== userId) throw new Error("Attempt not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("question_attempts")
      .select(
        "id, selected_option, is_correct, is_skipped, marks_awarded, questions(id, question_text, options, correct_option, explanation)",
      )
      .eq("quiz_attempt_id", data.attemptId)
      .order("created_at");

    const items = (rows ?? []).map((r) => {
      const q = (r as unknown as {
        questions: {
          id: string;
          question_text: string;
          options: unknown;
          correct_option: number | null;
          explanation: string;
        } | null;
      }).questions;
      return {
        id: r.id,
        questionText: q?.question_text ?? "",
        options: Array.isArray(q?.options) ? (q?.options as string[]) : [],
        selectedOption: r.selected_option,
        correctOption: q?.correct_option ?? null,
        explanation: q?.explanation ?? "",
        isCorrect: r.is_correct,
        isSkipped: r.is_skipped,
        marksAwarded: r.marks_awarded,
      };
    });

    return { attempt: { ...attempt, user_id: undefined }, items };
  });
