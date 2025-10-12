-- Buat sample user dengan role borrower
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-4000-8000-000000000999',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'johndoe@example.com',
  '$2a$10$EgBW5EfcG8K8LJ9iQD3JYe8G9fD4pD7BcxQu4sF1RhH3V2LyN5.Bq',
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL
);

-- Profile untuk user
INSERT INTO public.profiles (id, full_name, unit, phone) VALUES
  ('00000000-0000-4000-8000-000000000999', 'John Doe', 'Guru Matematika', '081234567890');

-- Role untuk user
INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-4000-8000-000000000999', 'borrower');

-- Sample request dengan status approved dan letter number
INSERT INTO public.borrow_requests (
  id,
  borrower_id,
  status,
  purpose,
  start_date,
  end_date,
  location_usage,
  pic_name,
  pic_contact,
  letter_number,
  created_at
) VALUES (
  '00000000-0000-4000-8000-000000009999',
  '00000000-0000-4000-8000-000000000999',
  'active',
  'Kegiatan pembelajaran multimedia untuk kelas X IPA',
  '2025-01-14',
  '2025-01-16',
  'Ruang Kelas X IPA 1',
  'John Doe',
  '081234567890',
  'SPB/001/I/2025',
  NOW()
);

-- Sample request items
INSERT INTO public.request_items (id, request_id, item_id, quantity) VALUES
  ('00000000-0000-4000-8000-000000009001', '00000000-0000-4000-8000-000000009999', '00000000-0000-4000-8000-000000000021', 1),
  ('00000000-0000-4000-8000-000000009002', '00000000-0000-4000-8000-000000009999', '00000000-0000-4000-8000-000000000022', 2);