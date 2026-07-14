CREATE OR REPLACE FUNCTION public.first_run_needed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.first_run_needed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.first_run_needed() TO anon, authenticated;