GRANT SELECT, INSERT, DELETE ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.question_attempts TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
GRANT ALL ON public.question_attempts TO service_role;