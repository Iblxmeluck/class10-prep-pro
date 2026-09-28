-- 1. Permanent answer tally (not affected by students clearing their history)
CREATE TABLE public.answer_stats (
  user_id uuid NOT NULL,
  day date NOT NULL,
  attempted integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
GRANT ALL ON public.answer_stats TO service_role;
ALTER TABLE public.answer_stats ENABLE ROW LEVEL SECURITY;

INSERT INTO public.answer_stats (user_id, day, attempted, correct)
SELECT user_id, (created_at AT TIME ZONE 'Asia/Kolkata')::date,
  count(*) FILTER (WHERE NOT is_skipped), count(*) FILTER (WHERE is_correct)
FROM public.question_attempts GROUP BY 1, 2;

CREATE OR REPLACE FUNCTION public.tally_answer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO answer_stats (user_id, day, attempted, correct)
  VALUES (NEW.user_id, (NEW.created_at AT TIME ZONE 'Asia/Kolkata')::date,
          CASE WHEN NEW.is_skipped THEN 0 ELSE 1 END, CASE WHEN NEW.is_correct THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, day) DO UPDATE
    SET attempted = answer_stats.attempted + EXCLUDED.attempted,
        correct = answer_stats.correct + EXCLUDED.correct;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tally_answer() FROM public, anon, authenticated;
CREATE TRIGGER trg_tally_answer AFTER INSERT ON public.question_attempts
FOR EACH ROW EXECUTE FUNCTION public.tally_answer();

CREATE OR REPLACE FUNCTION public.weekly_leaderboard_metric(_metric text)
RETURNS TABLE(rank bigint, name text, value numeric, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH wk AS (SELECT (date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS s,
                     date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata')::date AS d),
  qa AS (
    SELECT a.user_id, sum(a.attempted) AS att, sum(a.correct) AS cor
    FROM answer_stats a, wk WHERE a.day >= wk.d GROUP BY a.user_id
  ),
  t AS (
    SELECT user_id, cor::numeric AS v FROM qa WHERE _metric = 'correct' AND cor > 0
    UNION ALL SELECT user_id, att::numeric FROM qa WHERE _metric = 'attempted' AND att > 0
    UNION ALL SELECT user_id, round(cor::numeric * 100 / att, 1) FROM qa WHERE _metric = 'accuracy' AND att >= 20
    UNION ALL SELECT sd.user_id, sum(sd.seconds)::numeric FROM study_days sd, wk
      WHERE _metric = 'study' AND sd.study_date >= wk.d GROUP BY sd.user_id HAVING sum(sd.seconds) > 0
    UNION ALL SELECT x.user_id, count(*)::numeric FROM (
      SELECT user_id, submitted_at FROM quiz_attempts UNION ALL SELECT user_id, submitted_at FROM test_attempts
    ) x, wk WHERE _metric = 'quizzes' AND x.submitted_at >= wk.s GROUP BY x.user_id
  )
  SELECT rank() OVER (ORDER BY t.v DESC),
    COALESCE(NULLIF(lp.nickname,''), split_part(NULLIF(p.display_name,''),' ',1), 'Student'),
    t.v, t.user_id = auth.uid()
  FROM t JOIN profiles p ON p.id = t.user_id
  LEFT JOIN leaderboard_prefs lp ON lp.user_id = t.user_id
  WHERE auth.uid() IS NOT NULL AND public.is_active_member(auth.uid())
    AND NOT COALESCE(lp.opt_out, false)
    AND NOT public.has_role(t.user_id, 'admin')
  ORDER BY t.v DESC LIMIT 50
$$;

-- 2. EXP board shows current balance
DROP FUNCTION IF EXISTS public.weekly_leaderboard();
CREATE FUNCTION public.weekly_leaderboard()
RETURNS TABLE(rank bigint, name text, exp bigint, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rank() OVER (ORDER BY m.balance DESC),
    COALESCE(NULLIF(lp.nickname,''), split_part(NULLIF(p.display_name,''),' ',1), 'Student'),
    m.balance::bigint, m.user_id = auth.uid()
  FROM member_exp m JOIN profiles p ON p.id = m.user_id
  LEFT JOIN leaderboard_prefs lp ON lp.user_id = m.user_id
  WHERE auth.uid() IS NOT NULL AND public.is_active_member(auth.uid())
    AND m.balance > 0
    AND NOT COALESCE(lp.opt_out, false)
    AND NOT public.has_role(m.user_id, 'admin')
  ORDER BY m.balance DESC LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.weekly_leaderboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO authenticated;

-- 3. Only admins decide who is hidden
UPDATE public.leaderboard_prefs SET opt_out = false WHERE opt_out;
CREATE OR REPLACE FUNCTION public.guard_leaderboard_hide() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.opt_out := CASE WHEN TG_OP = 'UPDATE' THEN OLD.opt_out ELSE false END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_leaderboard_hide() FROM public, anon, authenticated;
CREATE TRIGGER trg_guard_leaderboard_hide BEFORE INSERT OR UPDATE ON public.leaderboard_prefs
FOR EACH ROW EXECUTE FUNCTION public.guard_leaderboard_hide();

-- 4. Nightly automatic game-point conversion (midnight India time)
CREATE OR REPLACE FUNCTION public.convert_all_game_points() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _rate int; _n int := 0;
BEGIN
  SELECT exp INTO _rate FROM exp_rules WHERE key = 'game_point' AND enabled;
  IF COALESCE(_rate, 0) <= 0 THEN RETURN 0; END IF;
  FOR r IN
    SELECT g.user_id, g.id, g.correct FROM game_attempts g
    WHERE g.correct > 0 AND g.game_key NOT IN ('memory_match','word_builder')
      AND NOT EXISTS (SELECT 1 FROM exp_ledger l WHERE l.user_id = g.user_id AND l.reason = 'game_point' AND l.ref = g.id::text)
  LOOP
    INSERT INTO member_exp (user_id, balance, lifetime, updated_at)
    VALUES (r.user_id, r.correct * _rate, r.correct * _rate, now())
    ON CONFLICT (user_id) DO UPDATE SET balance = member_exp.balance + EXCLUDED.balance,
      lifetime = member_exp.lifetime + EXCLUDED.lifetime, updated_at = now();
    INSERT INTO exp_ledger (user_id, delta, reason, ref) VALUES (r.user_id, r.correct * _rate, 'game_point', r.id::text);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.convert_all_game_points() FROM public, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('convert-game-points-nightly', '30 18 * * *', $c$SELECT public.convert_all_game_points()$c$);