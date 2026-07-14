CREATE OR REPLACE FUNCTION public.block_signup_after_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('madeena_first_admin_signup'));

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Registration is disabled. Contact the administrator.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_admin_count int;
  username_base text;
  username_candidate text;
  suffix int := 0;
  id_suffix text;
BEGIN
  username_base := lower(
    regexp_replace(
      coalesce(nullif(split_part(NEW.email, '@', 1), ''), 'user'),
      '[^a-z0-9_]+',
      '_',
      'g'
    )
  );
  username_base := trim(both '_' from username_base);

  IF username_base = '' THEN
    username_base := 'user';
  END IF;

  id_suffix := replace(left(NEW.id::text, 8), '-', '');
  username_base := left(username_base, greatest(1, 39 - length(id_suffix)));
  username_candidate := username_base || '_' || id_suffix;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = username_candidate
  ) LOOP
    suffix := suffix + 1;
    username_candidate := left(username_base, greatest(1, 39 - length(id_suffix) - length(('_' || suffix)::text))) || '_' || id_suffix || '_' || suffix;
  END LOOP;

  INSERT INTO public.profiles (id, username, email, full_name)
  VALUES (
    NEW.id,
    username_candidate,
    coalesce(NEW.email, ''),
    coalesce(nullif(NEW.raw_user_meta_data->>'full_name', ''), split_part(coalesce(NEW.email, ''), '@', 1), 'Administrator')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    updated_at = now();

  PERFORM pg_advisory_xact_lock(hashtext('madeena_first_admin_signup'));

  SELECT count(*) INTO existing_admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  IF existing_admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END
$function$;