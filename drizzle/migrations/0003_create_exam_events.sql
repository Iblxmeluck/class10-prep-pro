-- Event-based exam preparation system

CREATE TABLE public.exam_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'Custom',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_syllabus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.exam_events(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.exam_events(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  day_date date,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, day_number)
);

CREATE TABLE public.event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES public.event_days(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_task_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.event_tasks(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref_id uuid,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_task_completions (
  task_id uuid NOT NULL REFERENCES public.event_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX idx_event_days_event ON public.event_days(event_id, day_number);
CREATE INDEX idx_event_tasks_day ON public.event_tasks(day_id, sort_order);
CREATE INDEX idx_event_task_resources_task ON public.event_task_resources(task_id);
CREATE INDEX idx_event_task_completions_user ON public.event_task_completions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_syllabus TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_task_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_task_completions TO authenticated;
GRANT ALL ON public.exam_events TO service_role;
GRANT ALL ON public.event_syllabus TO service_role;
GRANT ALL ON public.event_days TO service_role;
GRANT ALL ON public.event_tasks TO service_role;
GRANT ALL ON public.event_task_resources TO service_role;
GRANT ALL ON public.event_task_completions TO service_role;

ALTER TABLE public.exam_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_task_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read events" ON public.exam_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin writes events" ON public.exam_events FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read syllabus" ON public.event_syllabus FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin writes syllabus" ON public.event_syllabus FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read days" ON public.event_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin writes days" ON public.event_days FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read tasks" ON public.event_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin writes tasks" ON public.event_tasks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read task resources" ON public.event_task_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin writes task resources" ON public.event_task_resources FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "read own or admin completions" ON public.event_task_completions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "insert own completions" ON public.event_task_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own completions" ON public.event_task_completions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER exam_events_updated_at BEFORE UPDATE ON public.exam_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER event_tasks_updated_at BEFORE UPDATE ON public.event_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();