CREATE TABLE public.mistake_notebook (
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'practice',
  wrong_count integer NOT NULL DEFAULT 1,
  last_wrong_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
GRANT SELECT, DELETE ON public.mistake_notebook TO authenticated;
GRANT ALL ON public.mistake_notebook TO service_role;
ALTER TABLE public.mistake_notebook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own mistakes read" ON public.mistake_notebook FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own mistakes delete" ON public.mistake_notebook FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.track_mistake() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_correct = false AND NEW.is_skipped = false THEN
    INSERT INTO public.mistake_notebook(user_id, question_id, source)
    VALUES (NEW.user_id, NEW.question_id,
      CASE WHEN NEW.quiz_attempt_id IS NOT NULL THEN 'quiz' WHEN NEW.test_attempt_id IS NOT NULL THEN 'test' ELSE 'practice' END)
    ON CONFLICT (user_id, question_id) DO UPDATE
      SET wrong_count = mistake_notebook.wrong_count + 1, last_wrong_at = now(), resolved_at = NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_track_mistake AFTER INSERT ON public.question_attempts FOR EACH ROW EXECUTE FUNCTION public.track_mistake();

INSERT INTO public.mistake_notebook(user_id, question_id, wrong_count, last_wrong_at)
SELECT user_id, question_id, count(*), max(created_at) FROM public.question_attempts
WHERE is_correct = false AND is_skipped = false GROUP BY user_id, question_id
ON CONFLICT DO NOTHING;

CREATE TABLE public.leaderboard_prefs (
  user_id uuid PRIMARY KEY,
  opt_out boolean NOT NULL DEFAULT false,
  nickname text NOT NULL DEFAULT '' CHECK (char_length(nickname) <= 24),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.leaderboard_prefs TO authenticated;
GRANT ALL ON public.leaderboard_prefs TO service_role;
ALTER TABLE public.leaderboard_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own prefs" ON public.leaderboard_prefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.weekly_leaderboard() RETURNS TABLE(rank bigint, name text, exp bigint, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH wk AS (SELECT (date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS s),
  t AS (
    SELECT l.user_id, sum(l.delta)::bigint AS exp FROM exp_ledger l, wk
    WHERE l.delta > 0 AND l.created_at >= wk.s GROUP BY l.user_id
  )
  SELECT rank() OVER (ORDER BY t.exp DESC),
    COALESCE(NULLIF(lp.nickname,''), split_part(NULLIF(p.display_name,''),' ',1), 'Student'),
    t.exp, t.user_id = auth.uid()
  FROM t JOIN profiles p ON p.id = t.user_id
  LEFT JOIN leaderboard_prefs lp ON lp.user_id = t.user_id
  WHERE auth.uid() IS NOT NULL AND public.is_active_member(auth.uid())
    AND NOT COALESCE(lp.opt_out, false)
    AND NOT public.has_role(t.user_id, 'admin')
  ORDER BY t.exp DESC LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.weekly_leaderboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO authenticated;