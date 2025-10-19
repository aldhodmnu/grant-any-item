-- Phase 1: Create Storage Bucket for PDF Letters
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'borrow-letters',
  'borrow-letters',
  false,
  5242880, -- 5MB limit
  ARRAY['application/pdf']
);

-- Phase 1: Add columns to borrow_requests table
ALTER TABLE public.borrow_requests
ADD COLUMN IF NOT EXISTS letter_pdf_url text,
ADD COLUMN IF NOT EXISTS letter_generated_pdf_at timestamp with time zone;

-- Phase 1: RLS Policies for Storage Bucket
CREATE POLICY "Authenticated users can view their own letters"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'borrow-letters' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR
   EXISTS (
     SELECT 1 FROM public.borrow_requests br
     WHERE br.id::text = (storage.foldername(name))[2]
     AND (
       br.borrower_id = auth.uid() OR
       public.has_role(auth.uid(), 'owner'::app_role) OR
       public.has_role(auth.uid(), 'headmaster'::app_role) OR
       public.has_role(auth.uid(), 'admin'::app_role)
     )
   ))
);

CREATE POLICY "System can upload letters"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'borrow-letters' AND
  (public.has_role(auth.uid(), 'owner'::app_role) OR
   public.has_role(auth.uid(), 'headmaster'::app_role) OR
   public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "System can update letters"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'borrow-letters' AND
  (public.has_role(auth.uid(), 'owner'::app_role) OR
   public.has_role(auth.uid(), 'headmaster'::app_role) OR
   public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "System can delete letters"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'borrow-letters' AND
  (public.has_role(auth.uid(), 'owner'::app_role) OR
   public.has_role(auth.uid(), 'headmaster'::app_role) OR
   public.has_role(auth.uid(), 'admin'::app_role))
);