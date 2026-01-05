-- ============================================
-- Migration: Auto-create user_profiles on signup
-- Purpose: When a user signs up via Supabase Auth, automatically create their profile
-- Date: 2026-01-05
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value TEXT;
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'ldallison111@gmail.com' THEN
    user_role_value := 'admin';
  ELSE
    user_role_value := 'field';
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role, user_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role_value,
    user_role_value
  );
  RETURN NEW;
END;
$$;

-- Trigger to call the function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow the trigger function to insert into user_profiles
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.user_profiles TO supabase_auth_admin;
