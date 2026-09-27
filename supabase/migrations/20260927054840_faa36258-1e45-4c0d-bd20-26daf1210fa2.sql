CREATE OR REPLACE FUNCTION public.weekly_leaderboard_metric(_metric text)
RETURNS TABLE(rank bigint, name text, value numeric, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH wk AS (SELECT (date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS s,
                     date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata')::date AS d),
  qa AS (
    SELECT a.user_id, count(*) FILTER (WHERE NOT a.is_skipped) AS att, count(*) FILTER (WHERE a.is_correct) AS cor
    FROM question_attempts a, wk WHERE a.created_at >= wk.s GROUP BY a.user_id
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
REVOKE ALL ON FUNCTION public.weekly_leaderboard_metric(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.weekly_leaderboard_metric(text) TO authenticated;