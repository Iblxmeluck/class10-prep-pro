CREATE TABLE public.exp_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  thumbnail_url text,
  course_url text,
  body text NOT NULL DEFAULT '',
  exp_price integer NOT NULL DEFAULT 0 CHECK (exp_price >= 0),
  duration_value integer NOT NULL DEFAULT 30 CHECK (duration_value > 0),
  duration_unit text NOT NULL DEFAULT 'day' CHECK (duration_unit IN ('minute','hour','day','week','month')),
  is_active boolean NOT NULL DEFAULT true,
  store_visible boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exp_courses TO authenticated;
GRANT ALL ON public.exp_courses TO service_role;
ALTER TABLE public.exp_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read courses" ON public.exp_courses FOR SELECT TO authenticated USING (is_active OR public.is_admin());
CREATE POLICY "Admins manage courses" ON public.exp_courses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER exp_courses_touch BEFORE UPDATE ON public.exp_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.exp_course_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.exp_courses(id) ON DELETE CASCADE,
  exp_spent integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'purchase' CHECK (source IN ('purchase','admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exp_course_access TO authenticated;
GRANT ALL ON public.exp_course_access TO service_role;
ALTER TABLE public.exp_course_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own access rows" ON public.exp_course_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE INDEX exp_course_access_user_idx ON public.exp_course_access (user_id, course_id, expires_at);

CREATE OR REPLACE FUNCTION public.purchase_exp_course(_course uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE u uuid := auth.uid(); c record; bal integer; life integer; t timestamptz := now(); exp_at timestamptz; acc uuid;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO c FROM public.exp_courses WHERE id = _course FOR SHARE;
  IF c IS NULL OR NOT c.is_active THEN RAISE EXCEPTION 'This course is not available'; END IF;

  IF EXISTS (SELECT 1 FROM public.exp_course_access a
             WHERE a.user_id = u AND a.course_id = _course AND a.status = 'active'
               AND (a.expires_at IS NULL OR a.expires_at > t)) THEN
    RETURN jsonb_build_object('ok', true, 'alreadyOwned', true);
  END IF;

  INSERT INTO public.member_exp(user_id, balance, lifetime) VALUES (u, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance, lifetime INTO bal, life FROM public.member_exp WHERE user_id = u FOR UPDATE;
  IF bal < c.exp_price THEN RAISE EXCEPTION 'Not enough EXP'; END IF;

  exp_at := t + (c.duration_value || ' ' || c.duration_unit)::interval;

  UPDATE public.member_exp SET balance = bal - c.exp_price, updated_at = t WHERE user_id = u;
  INSERT INTO public.exp_course_access(user_id, course_id, exp_spent, source, status, purchased_at, expires_at)
  VALUES (u, _course, c.exp_price, 'purchase', 'active', t, exp_at) RETURNING id INTO acc;
  INSERT INTO public.exp_ledger(user_id, delta, reason, ref)
  VALUES (u, -c.exp_price, 'course_purchase: ' || c.name, acc::text);
  INSERT INTO public.activity_logs(user_id, event, detail) VALUES (u, 'course_purchase', c.name);

  RETURN jsonb_build_object('ok', true, 'alreadyOwned', false, 'balance', bal - c.exp_price,
                            'expiresAt', exp_at, 'accessId', acc);
END; $$;

REVOKE ALL ON FUNCTION public.purchase_exp_course(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.purchase_exp_course(uuid) TO authenticated;