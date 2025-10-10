-- Create enum types
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'headmaster', 'borrower');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.item_status AS ENUM ('available', 'reserved', 'borrowed', 'maintenance', 'damaged', 'lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('draft', 'pending_owner', 'pending_headmaster', 'approved', 'active', 'completed', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  unit text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  department text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contact_person text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  description text,
  category_id uuid REFERENCES public.categories(id),
  department_id uuid REFERENCES public.departments(id) NOT NULL,
  quantity integer DEFAULT 0 NOT NULL,
  available_quantity integer DEFAULT 0 NOT NULL,
  status item_status DEFAULT 'available' NOT NULL,
  location text,
  image_url text,
  accessories jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create borrow_requests table
CREATE TABLE IF NOT EXISTS public.borrow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id uuid REFERENCES public.profiles(id) NOT NULL,
  purpose text NOT NULL,
  pic_name text NOT NULL,
  pic_contact text NOT NULL,
  location_usage text,
  start_date text NOT NULL,
  end_date text NOT NULL,
  status request_status DEFAULT 'draft' NOT NULL,
  owner_reviewed_by uuid REFERENCES public.profiles(id),
  owner_reviewed_at timestamp with time zone,
  owner_notes text,
  headmaster_approved_by uuid REFERENCES public.profiles(id),
  headmaster_approved_at timestamp with time zone,
  headmaster_notes text,
  rejection_reason text,
  letter_number text,
  letter_generated_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create request_items table
CREATE TABLE IF NOT EXISTS public.request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.borrow_requests(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.items(id) NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  notes text,
  condition_on_borrow text,
  condition_on_return text,
  accessories_checklist jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
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

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));
  
  -- Assign default borrower role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'borrower');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for departments
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments"
  ON public.departments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for items
DROP POLICY IF EXISTS "Anyone can view items" ON public.items;
CREATE POLICY "Anyone can view items"
  ON public.items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners can manage their department items" ON public.items;
CREATE POLICY "Owners can manage their department items"
  ON public.items FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner')
  );

-- RLS Policies for borrow_requests
DROP POLICY IF EXISTS "Users can view own requests" ON public.borrow_requests;
CREATE POLICY "Users can view own requests"
  ON public.borrow_requests FOR SELECT
  USING (
    borrower_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'headmaster')
  );

DROP POLICY IF EXISTS "Borrowers can create requests" ON public.borrow_requests;
CREATE POLICY "Borrowers can create requests"
  ON public.borrow_requests FOR INSERT
  WITH CHECK (borrower_id = auth.uid());

DROP POLICY IF EXISTS "Borrowers can update own draft requests" ON public.borrow_requests;
CREATE POLICY "Borrowers can update own draft requests"
  ON public.borrow_requests FOR UPDATE
  USING (borrower_id = auth.uid() AND status = 'draft');

DROP POLICY IF EXISTS "Owners and headmasters can update requests" ON public.borrow_requests;
CREATE POLICY "Owners and headmasters can update requests"
  ON public.borrow_requests FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'headmaster')
  );

-- RLS Policies for request_items
DROP POLICY IF EXISTS "Users can view request items for accessible requests" ON public.request_items;
CREATE POLICY "Users can view request items for accessible requests"
  ON public.request_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests
      WHERE id = request_items.request_id
      AND (
        borrower_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'owner') OR
        public.has_role(auth.uid(), 'headmaster')
      )
    )
  );

DROP POLICY IF EXISTS "Borrowers can manage items in own requests" ON public.request_items;
CREATE POLICY "Borrowers can manage items in own requests"
  ON public.request_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests
      WHERE id = request_items.request_id
      AND borrower_id = auth.uid()
      AND status = 'draft'
    )
  );

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_items_department_id ON public.items(department_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_borrower_id ON public.borrow_requests(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON public.borrow_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON public.request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_item_id ON public.request_items(item_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);