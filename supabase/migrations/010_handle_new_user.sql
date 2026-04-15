-- Automatically create a profile when a new auth user signs up
-- First user becomes admin; subsequent users are integrante + pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  user_role TEXT;
  user_status TEXT;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- First user is admin and auto-active
  IF user_count = 0 THEN
    user_role := 'admin';
    user_status := 'active';
  ELSE
    user_role := 'integrante';
    user_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    user_role,
    user_status
  );

  RETURN NEW;
END;
$$;

-- Trigger fires after every new auth user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
