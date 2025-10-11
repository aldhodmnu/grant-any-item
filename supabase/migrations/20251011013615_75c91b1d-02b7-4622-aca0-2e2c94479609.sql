-- Add full_name and email columns to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create function to sync user info to user_roles
CREATE OR REPLACE FUNCTION public.sync_user_role_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get user info from profiles and auth.users
  SELECT p.full_name, u.email
  INTO NEW.full_name, NEW.email
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE p.id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-populate user info when role is created/updated
DROP TRIGGER IF EXISTS sync_user_role_info_trigger ON public.user_roles;
CREATE TRIGGER sync_user_role_info_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_info();

-- Backfill existing user_roles with name and email
UPDATE public.user_roles ur
SET 
  full_name = p.full_name,
  email = u.email
FROM profiles p
INNER JOIN auth.users u ON u.id = p.id
WHERE ur.user_id = p.id;