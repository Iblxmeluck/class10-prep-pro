import { createServerFn } from "@tanstack/react-start";

/**
 * Public counts for the landing page "at a glance" section.
 * Read-only aggregate counts, no user data is exposed.
 */
export const getLandingStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const count = async (table: "questions" | "tests" | "quizzes" | "flashcards" | "resources" | "links") => {
    const { count: c } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true });
    return c ?? 0;
  };

  const [questions, tests, quizzes, flashcards, resources, links] = await Promise.all([
    count("questions"),
    count("tests"),
    count("quizzes"),
    count("flashcards"),
    count("resources"),
    count("links"),
  ]);

  return {
    questions,
    testsAndQuizzes: tests + quizzes,
    flashcards,
    resources: resources + links,
  };
});
