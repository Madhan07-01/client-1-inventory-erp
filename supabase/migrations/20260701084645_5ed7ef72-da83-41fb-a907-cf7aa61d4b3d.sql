-- Drop duplicate signup-blocking triggers so additional accounts can be created.
-- The `handle_new_user` trigger still ensures only the very first user gets the admin role.
DROP TRIGGER IF EXISTS block_extra_signups ON auth.users;
DROP TRIGGER IF EXISTS block_signup_after_first_admin_trigger ON auth.users;

-- Keep the function around in case admin wants to re-enable via a config flag later,
-- but it's no longer wired to any trigger.
