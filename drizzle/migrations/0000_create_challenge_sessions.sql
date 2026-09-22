CREATE TABLE IF NOT EXISTS public.challenge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('challenge','battle','memory','emergency')),
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS challenge_sessions_user_mode_idx
  ON public.challenge_sessions (user_id, mode, created_at DESC);

GRANT SELECT, INSERT ON public.challenge_sessions TO authenticated;
GRANT ALL ON public.challenge_sessions TO service_role;

ALTER TABLE public.challenge_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own sessions readable" ON public.challenge_sessions;
CREATE POLICY "own sessions readable" ON public.challenge_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own sessions insertable" ON public.challenge_sessions;
CREATE POLICY "own sessions insertable" ON public.challenge_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());