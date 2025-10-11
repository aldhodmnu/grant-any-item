-- Allow owners to manage categories too
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins and owners can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Useful indexes for faster inventory operations
CREATE INDEX IF NOT EXISTS idx_items_code ON public.items(code);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);

-- Ensure profile + default role created on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure updated_at auto-updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_borrow_requests_updated_at ON public.borrow_requests;
CREATE TRIGGER update_borrow_requests_updated_at
  BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();