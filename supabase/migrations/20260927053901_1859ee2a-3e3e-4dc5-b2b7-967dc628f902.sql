CREATE OR REPLACE FUNCTION public.track_mistake() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_correct = false AND NEW.is_skipped = false THEN
    INSERT INTO public.mistake_notebook(user_id, question_id, source)
    VALUES (NEW.user_id, NEW.question_id,
      CASE WHEN NEW.quiz_attempt_id IS NOT NULL THEN 'quiz' WHEN NEW.test_attempt_id IS NOT NULL THEN 'test' ELSE 'practice' END)
    ON CONFLICT (user_id, question_id) DO UPDATE
      SET wrong_count = mistake_notebook.wrong_count + 1, last_wrong_at = now(), resolved_at = NULL;
  ELSIF NEW.is_correct THEN
    UPDATE public.mistake_notebook SET resolved_at = now()
    WHERE user_id = NEW.user_id AND question_id = NEW.question_id AND resolved_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_mistake() FROM public, anon, authenticated;