DROP POLICY IF EXISTS "read days" ON public.event_days;
CREATE POLICY "read days" ON public.event_days FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "read syllabus" ON public.event_syllabus;
CREATE POLICY "read syllabus" ON public.event_syllabus FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "read task resources" ON public.event_task_resources;
CREATE POLICY "read task resources" ON public.event_task_resources FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "read tasks" ON public.event_tasks;
CREATE POLICY "read tasks" ON public.event_tasks FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "read events" ON public.exam_events;
CREATE POLICY "read events" ON public.exam_events FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "rules readable" ON public.exp_rules;
CREATE POLICY "rules readable" ON public.exp_rules FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "game settings readable" ON public.game_settings;
CREATE POLICY "game settings readable" ON public.game_settings FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "course_thumbs_read" ON storage.objects;
CREATE POLICY "course_thumbs_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'course-thumbnails' AND (public.is_active_member(auth.uid()) OR public.is_admin()));