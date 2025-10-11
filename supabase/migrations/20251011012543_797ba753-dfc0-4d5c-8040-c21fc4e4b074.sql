-- Align schema in new Supabase project with current app expectations
-- 1) Ensure helper enum for approval path exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_path') THEN
    CREATE TYPE public.approval_path AS ENUM ('direct', 'via_headmaster');
  END IF;
END$$;

-- 2) Departments: add code for letter numbering
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS code text;

-- Make code unique if present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_departments_code_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_departments_code_unique ON public.departments ((lower(coalesce(code,''))));
  END IF;
END$$;

-- 3) User roles: add department_id FK for owner scoping
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

-- 4) Profiles: add unit_kerja for app compatibility
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unit_kerja text;

-- 5) Borrow requests: add columns used by app
ALTER TABLE public.borrow_requests
  ADD COLUMN IF NOT EXISTS requested_date text,
  ADD COLUMN IF NOT EXISTS expected_return_date text,
  ADD COLUMN IF NOT EXISTS actual_return_date text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS approval_path public.approval_path;

-- 6) Ensure updated_at triggers exist
-- Create trigger only if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_items_updated_at'
  ) THEN
    CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_borrow_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_borrow_requests_updated_at
    BEFORE UPDATE ON public.borrow_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 7) Auth signup trigger to auto-create profile and default role (borrower)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END$$;

-- 8) Helpful indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_items_department_id'
  ) THEN
    CREATE INDEX idx_items_department_id ON public.items(department_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_request_items_request_id'
  ) THEN
    CREATE INDEX idx_request_items_request_id ON public.request_items(request_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_request_items_item_id'
  ) THEN
    CREATE INDEX idx_request_items_item_id ON public.request_items(item_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_borrow_requests_borrower_id'
  ) THEN
    CREATE INDEX idx_borrow_requests_borrower_id ON public.borrow_requests(borrower_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_roles_user_id'
  ) THEN
    CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_roles_department_id'
  ) THEN
    CREATE INDEX idx_user_roles_department_id ON public.user_roles(department_id);
  END IF;
END$$;