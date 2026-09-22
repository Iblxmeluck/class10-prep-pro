import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  subjectId: z.string().uuid(),
  chapterId: z.string().uuid(),
  topicId: z.string().uuid().nullable().optional(),
  qtype: z.string().max(40),
  difficulty: z.enum(["Easy", "Medium", "Hard", "Very Hard"]),
  count: z.number().int().min(1).max(20),
  marks: z.number().int().min(1).max(10),
});

export const generateQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;
    if (!isAdmin) throw new Error("Forbidden");

    const { data: chapter } = await supabase
      .from("chapters")
      .select("name, subjects(name)")
      .eq("id", data.chapterId)
      .maybeSingle();
    const { data: topic } = data.topicId
      ? await supabase.from("topics").select("name").eq("id", data.topicId).maybeSingle()
      : { data: null };

    const subjectName = (chapter as { subjects?: { name?: string } } | null)?.subjects?.name ?? "";
    const prompt = `Generate ${data.count} CBSE Class 10 NCERT-based ${data.qtype} questions.
Subject: ${subjectName}
Chapter: ${chapter?.name ?? ""}
${topic?.name ? `Topic: ${topic.name}` : ""}
Difficulty: ${data.difficulty}
Marks per question: ${data.marks}
Every question must have exactly four options, one correct answer (0-based index), a clear explanation, and stay strictly within the NCERT Class 10 syllabus.`;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert CBSE Class 10 examiner. Return only tool-call output." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_questions",
              description: "Return the generated questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correct_option: { type: "number" },
                        explanation: { type: "string" },
                        topic: { type: "string" },
                      },
                      required: ["question_text", "options", "correct_option", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_questions" } },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached, please try again shortly");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up in Settings.");
    if (!res.ok) throw new Error("AI generation failed");

    const payload = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI returned no questions");

    const parsed = z
      .object({
        questions: z.array(
          z.object({
            question_text: z.string().min(3),
            options: z.array(z.string()).min(2).max(6),
            correct_option: z.number().int().min(0).max(5),
            explanation: z.string().default(""),
          }),
        ),
      })
      .parse(JSON.parse(args));

    const rows = parsed.questions.slice(0, data.count).map((q) => ({
      subject_id: data.subjectId,
      chapter_id: data.chapterId,
      topic_id: data.topicId ?? null,
      qtype: data.qtype as never,
      difficulty: data.difficulty as never,
      status: "draft" as const,
      question_text: q.question_text,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      marks: data.marks,
      ai_generated: true,
    }));

    const { error } = await supabase.from("questions").insert(rows);
    if (error) throw new Error(error.message);

    await supabase.from("activity_logs").insert({
      user_id: userId,
      event: "AI questions generated",
      detail: `${rows.length} draft ${data.qtype} questions`,
    });

    return { created: rows.length };
  });
