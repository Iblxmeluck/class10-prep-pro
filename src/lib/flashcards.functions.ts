import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  subjectId: z.string().uuid(),
  chapterId: z.string().uuid(),
  topicId: z.string().uuid().nullable().optional(),
  count: z.number().int().min(1).max(30),
  title: z.string().max(120).optional(),
});

export const generateFlashcardSet = createServerFn({ method: "POST" })
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
    if (!adminRow) throw new Error("Forbidden");

    const { data: chapter } = await supabase
      .from("chapters")
      .select("name, subjects(name)")
      .eq("id", data.chapterId)
      .maybeSingle();
    const { data: topic } = data.topicId
      ? await supabase.from("topics").select("name").eq("id", data.topicId).maybeSingle()
      : { data: null };

    const subjectName = (chapter as { subjects?: { name?: string } } | null)?.subjects?.name ?? "";
    const prompt = `Generate exactly ${data.count} CBSE Class 10 NCERT-based flashcards.
Subject: ${subjectName}
Chapter: ${chapter?.name ?? ""}
${topic?.name ? `Topic: ${topic.name}` : ""}
Each flashcard must be a single short question and its short, factual answer, strictly within the NCERT Class 10 syllabus. No numbering inside the text.`;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert CBSE Class 10 teacher. Return only tool-call output." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_flashcards",
              description: "Return the generated flashcards",
              parameters: {
                type: "object",
                properties: {
                  cards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["cards"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_flashcards" } },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached, please try again shortly");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up to continue.");
    if (!res.ok) throw new Error("AI generation failed");

    const payload = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI returned no flashcards");

    const parsed = z
      .object({
        cards: z.array(z.object({ question: z.string().min(2), answer: z.string().min(1) })).min(1),
      })
      .parse(JSON.parse(args));

    const cards = parsed.cards.slice(0, data.count);

    const { data: set, error: setError } = await supabase
      .from("flashcard_sets")
      .insert({
        title:
          data.title?.trim() ||
          `${topic?.name ?? chapter?.name ?? subjectName} — ${cards.length} flashcards`,
        subject_id: data.subjectId,
        chapter_id: data.chapterId,
        topic_id: data.topicId ?? null,
        ai_generated: true,
        created_by: userId,
      })
      .select("id")
      .single();
    if (setError || !set) throw new Error(setError?.message ?? "Could not create the flashcard set");

    const { error } = await supabase.from("flashcards").insert(
      cards.map((c, i) => ({
        set_id: set.id,
        subject_id: data.subjectId,
        chapter_id: data.chapterId,
        topic_id: data.topicId ?? null,
        front: c.question.trim(),
        back: c.answer.trim(),
        position: i,
      })),
    );
    if (error) throw new Error(error.message);

    await supabase.from("activity_logs").insert({
      user_id: userId,
      event: "AI flashcards generated",
      detail: `${cards.length} cards in one set`,
    });

    return { setId: set.id, created: cards.length };
  });
