CREATE OR REPLACE FUNCTION public.dashboard_counts()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH me AS (SELECT auth.uid() AS uid, public.has_role(auth.uid(),'admin') AS adm)
SELECT json_build_object(
  'questions', (SELECT count(*) FROM questions q, me WHERE me.adm OR (
      q.status = 'published'
      AND EXISTS (SELECT 1 FROM member_chapter_access a WHERE a.user_id = me.uid AND a.chapter_id = q.chapter_id)
      AND EXISTS (SELECT 1 FROM member_qtype_access t WHERE t.user_id = me.uid AND t.qtype = q.qtype)
      AND EXISTS (SELECT 1 FROM chapters c JOIN member_subject_access s ON s.subject_id = c.subject_id AND s.user_id = me.uid WHERE c.id = q.chapter_id)
    )),
  'quizzes', (SELECT count(*) FROM quizzes z, me WHERE me.adm OR (z.is_published
      AND EXISTS (SELECT 1 FROM member_chapter_access a WHERE a.user_id = me.uid AND a.chapter_id = z.chapter_id))),
  'tests', (SELECT count(*) FROM tests t, me WHERE me.adm OR (t.is_published
      AND (t.subject_id IS NULL OR EXISTS (SELECT 1 FROM member_subject_access s WHERE s.user_id = me.uid AND s.subject_id = t.subject_id)))),
  'flashcards', (SELECT count(*) FROM flashcards f, me WHERE me.adm OR (
      f.subject_id IS NULL OR EXISTS (SELECT 1 FROM member_subject_access s WHERE s.user_id = me.uid AND s.subject_id = f.subject_id))),
  'resources', (SELECT count(*) FROM resources r, me WHERE me.adm OR (
      (r.subject_id IS NULL OR EXISTS (SELECT 1 FROM member_subject_access s WHERE s.user_id = me.uid AND s.subject_id = r.subject_id))
      AND EXISTS (SELECT 1 FROM member_settings ms WHERE ms.user_id = me.uid
        AND ((r.kind = 'pdf'::resource_kind AND ms.can_view_pdf) OR (r.kind = 'image'::resource_kind AND ms.can_view_image))))),
  'links', (SELECT count(*) FROM links l, me WHERE me.adm OR (
      (l.chapter_id IS NULL AND (l.subject_id IS NULL OR EXISTS (SELECT 1 FROM member_subject_access s WHERE s.user_id = me.uid AND s.subject_id = l.subject_id)))
      OR EXISTS (SELECT 1 FROM member_chapter_access a WHERE a.user_id = me.uid AND a.chapter_id = l.chapter_id)))
);
$function$;

REVOKE ALL ON FUNCTION public.dashboard_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.dashboard_counts() TO authenticated;

CREATE INDEX IF NOT EXISTS idx_qa_user_created ON public.question_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_chapter_status ON public.questions (chapter_id, status);