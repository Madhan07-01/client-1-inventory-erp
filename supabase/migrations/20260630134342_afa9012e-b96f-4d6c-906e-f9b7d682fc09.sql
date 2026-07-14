REVOKE EXECUTE ON FUNCTION public.first_run_needed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.first_run_needed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.first_run_needed() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.first_run_needed() TO service_role;