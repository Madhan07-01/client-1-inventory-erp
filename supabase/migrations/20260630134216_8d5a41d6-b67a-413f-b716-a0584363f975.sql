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

  username_base := left(username_base, 40);
  username_candidate := username_base;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = username_candidate
  ) LOOP
    suffix := suffix + 1;
    username_candidate := left(username_base, greatest(1, 40 - length(('_' || suffix)::text))) || '_' || suffix;
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