-- Fix departments table: make code nullable or remove unique constraint
-- Since code is optional and not filled by admin panel, we'll make the unique constraint conditional
DROP INDEX IF EXISTS idx_departments_code_unique;
CREATE UNIQUE INDEX idx_departments_code_unique ON public.departments(code) WHERE code IS NOT NULL;

-- Add missing letter_viewed_at column to borrow_requests
ALTER TABLE public.borrow_requests 
ADD COLUMN IF NOT EXISTS letter_viewed_at TIMESTAMP WITH TIME ZONE;