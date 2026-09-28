GRANT SELECT ON public.answer_stats TO authenticated;
CREATE POLICY "Members read own answer stats" ON public.answer_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);